// src/pages/TenantPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "../components/AuthProvider";
import { supabase } from "../supabaseClient";

import Spinner from "../components/Spinner";
import Profile from "../components/Profile";
import DisplayBox from "../components/DisplayBox";
import LoadPreviousMessages from "../components/PreviousMessages";
import { getTenantLeaseInfo, getSignedUrl, parseUSDate, FIELD_KEYS, saveOverride } from "../utilities/GetMessages";
import { getTableIdList, fileExistsInStorage } from "../utilities/supabaseCalls";
import { getTenantTermOverrides } from "../utilities/supabaseCalls.jsx";
import { ExtractionModal } from "../components/Modal.jsx";

/** ---------- Field mapping (Display Label → canonical key used for overrides) ---------- */


/** Limit the date-based rule to these keys (recommended) */
const DATE_KEYS = new Set([
  "lease_execution_date",
  "lease_commencement_date",
  "delivery_possession_date",
  "lease_expiration_date",
  "rent_commencement_date",
  "cam_start_date",
]);

/** Loose date parser to handle common formats like 1/2/2026, 01-02-2026, ISO, etc. */
function parseDateLoose(input) {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input) ? null : input;

  const s = String(input).trim();
  if (!s) return null;

  const mdy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (mdy) {
    let [, m, d, y] = mdy;
    if (y.length === 2) y = Number(y) + (Number(y) >= 70 ? 1900 : 2000);
    const dObj = new Date(`${y}-${m}-${d}`);
    return isNaN(dObj) ? null : dObj;
  }
  const dObj = new Date(s);
  return isNaN(dObj) ? null : dObj;
}

/** ---------- Shared UI bits (match TenantTerms style) ---------- */
function EntryRow({ item, onValueClick }) {
  if (!item || typeof item !== "object") return null;

  const [[label, data]] = Object.entries(item);
  let rawValue = data?.value ?? "";
  const DATE_LABELS = new Set([
    "Lease Commencement Date",
    "Lease Expiration Date",
    "Rent Commencement Date",
    "Rent Abatement End",
  ]);

  let extraClass = ""
  if (data && data.manual_review && !data.is_manual_change) {
    extraClass = 'bg bg-red-500'
  }
  if (DATE_LABELS.has(label) && rawValue) {
    rawValue = parseUSDate(rawValue);
  }
  const lines = typeof rawValue === "string"
    ? rawValue.split(/\s*;\s*/).filter(Boolean)
    : [];

  return (
    <button
      type="button"
      onClick={() => onValueClick()}
      className={`
        w-full text-left rounded-md py-2
        transition-colors
        hover:bg-muted/50
        focus:outline-none focus:ring-2 focus:ring-ring
        disabled:opacity-50 disabled:cursor-not-allowed
        ${extraClass}
    `}>
      <div className="text-sm font-medium underline underline-offset-4">
        {label}
      </div>

      <div className="mt-1 text-sm text-muted-foreground space-y-1">
        {lines.length
          ? lines.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))
          : "—"}
      </div>
    </button>
  );
}




const SectionCard = ({ title, children }) => (
  <DisplayBox className="h-full overflow-hidden">
    <section aria-labelledby={title} className="flex h-full flex-col">
      <header className="mb-3 border-b border-muted/30 pb-2">
        <h2 id={title} className="text-xl font-semibold tracking-tight">{title}</h2>
      </header>
      <div className="min-h-[2rem] flex-1 overflow-hidden">
        <dl className="divide-y divide-muted/20 text-md">{children}</dl>
      </div>
    </section>
  </DisplayBox>
);

const EmptyState = ({ title, hint }) => (
  <div className="text-sm text-gray-300">
    <p className="font-medium">{title}</p>
    {hint && <p className="opacity-80">{hint}</p>}
  </div>
);

/** ---------- Page (view-only) ---------- */
const TenantPage = () => {
  const { session, roleData, extraction } = useAuth();
  const access_token = session?.access_token
  const company_id = localStorage.getItem("activeCompanyId");

  const { tenant_id } = useParams();
  const [searchParams] = useSearchParams();
  const [unit_id, setUnitId] = useState(searchParams.get("unit_id") ?? "");
  const navigate = useNavigate();

  const [tenant, setTenant] = useState(null);
  const [unitsIds, setUnitsIds] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState({});
  const [contacts, setContacts] = useState([]);

  const [leaseSummary, setLeaseSummary] = useState([]);
  const [financial, setFinancial] = useState([]);
  const [responsibility, setResponsibility] = useState([]);
  const [keyDates, setKeyDates] = useState([]);
  const [rights, setRights] = useState([]);
  const [leaseDocs, setLeaseDocs] = useState([]);
  const [leaseStatus, setLeaseStatus] = useState({});


  // Overrides come in as { key: { value, modified_at } }
  const [overrides, setOverrides] = useState({});

  const [isLoading, setIsLoading] = useState(true);

  const [activeExtraction, setActiveExtraction] = useState(null);
  const [activeLabel, setActiveLabel] = useState(null)
  const [signedUrl, setSignedUrl] = useState(null)
  const safeExtraction = activeExtraction ?? {
    label: activeLabel ?? "Manual Entry",
    value: null,
    future_value: null,
    confidence_score: null,
    reason: null,
    manual_review: false,
  };
  /** ---------- Load core tenant + related ---------- */
  useEffect(() => {
    if (!session || !tenant_id) return;

    let isCancelled = false;

    const loadCore = async () => {
      setIsLoading(true);
      try {
        const tenantPromise = supabase
          .from("tenant")
          .select("*")
          .eq("tenant_id", tenant_id)
          .single();

        const unitsPromise = supabase
          .from("Tenant_Unit")
          .select("*")
          .eq("tenant_id", tenant_id);

        const contactLinkPromise = supabase
          .from("Tenant_Contact")
          .select("*")
          .eq("tenant_id", tenant_id);

        const [
          { data: tenantData, error: tenantErr },
          { data: unitLinks, error: unitErr },
          { data: contactLinks, error: linkErr },
        ] = await Promise.all([tenantPromise, unitsPromise, contactLinkPromise]);

        if (tenantErr) throw tenantErr;
        if (unitErr) throw unitErr;
        if (linkErr) throw linkErr;

        if (!isCancelled) {
          setTenant(tenantData || null);
          if (!unit_id) {
            setUnitsIds(Array.isArray(unitLinks) ? unitLinks.map((row) => row.unit_id) : []);
          } else {
            setUnitsIds([unit_id]); // force into array
          }
        }

        // Contacts
        const contactIds = Array.isArray(contactLinks) ? contactLinks.map((c) => c.contact_id) : [];
        if (contactIds.length > 0) {
          const { data: contactData, error: contactError } = await supabase
            .from("Contact")
            .select("*")
            .in("contact_id", contactIds);
          if (contactError) throw contactError;
          if (!isCancelled) setContacts(contactData || []);
        } else if (!isCancelled) {
          setContacts([]);
        }
      } catch (err) {
        console.error("Error loading core tenant data", err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    loadCore();
    return () => {
      isCancelled = true;
    };
  }, [session, tenant_id]);
  useEffect(() => {
    if (!unitsIds || unitsIds.length > 1) return
    if (!unit_id) {

      const getUnitId = async () => {
        const { data, error } = await supabase.from("Tenant_Unit").select("*").eq('tenant_id', tenant_id).single()
        if (error) {
          console.error("Error Fetching Unit", error)
          return
        }
        setUnitId(data.unit_id)
        lease_docs(tenant_id, data.unit_id)
      }
      getUnitId()
      return
    };
    const getUnit = async () => {
      const { data, error } = await supabase.from("Units").select("*").eq("unit_id", unit_id).single();
      if (error) {
        console.error("Error Fetching Units", error);
        return;
      }
      setSelectedUnit(data || []);

      lease_docs(tenant_id, data.unit_id)
    }
    getUnit();
  }, [unit_id, unitsIds]);
  /** ---------- Load extracted terms ---------- */
  useEffect(() => {
    if (!tenant_id || !selectedUnit) return;

    let isCancelled = false;

    const loadLeases = async () => {
      try {


        const leases = await getTenantLeaseInfo(tenant_id, unit_id)

        if (isCancelled || !leases) return;

        setLeaseSummary(leases.lease_summary || []);
        setFinancial(leases.financial_snapshot || []);
        setResponsibility(leases.responsibility || []);
        setKeyDates(leases.keyDates || []); // note: key may be 'keyDates' in your result
        setRights(leases.rights || []);
      } catch (err) {
        console.error("Error loading lease terms", err);
      }
    };

    loadLeases();
    return () => {
      isCancelled = true;
    };
  }, [tenant_id]);

  /** ---------- Load overrides (with modified_at) ---------- */
  useEffect(() => {
    if (!tenant_id) return;
    let isCancelled = false;

    (async () => {
      try {
        const o = await getTenantTermOverrides(tenant_id);
        if (isCancelled) return;

        // compatibility: if helper returns { key: value }, wrap it
        const shaped = Object.fromEntries(
          Object.entries(o || {}).map(([k, v]) => {
            if (v && typeof v === "object" && ("value" in v || "modified_at" in v)) {
              return [k, { value: v.value ?? "", modified_at: v.modified_at ?? null }];
            }
            return [k, { value: v ?? "", modified_at: null }];
          })
        );
        setOverrides(shaped);
      } catch (e) {
        console.error("Error loading term overrides", e);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [tenant_id]);
  const lease_docs = async (tenant_id, unit_id) => {
    const { data, error } = await supabase.from('lease_documents').select('*').eq('tenant_id', tenant_id).eq('unit_id', unit_id)
    if (error) {
      console.error("Error Fetching Lease Documents")
      return
    }
    setLeaseDocs(data)
  }
  /** ---------- Job status per lease ---------- */
  const loadJobStatuses = useCallback(
    async (isCancelled = false) => {
      try {
        const leaseIds = (leaseDocs || []).map((l) => l.lease_id).filter(Boolean);
        if (leaseIds.length === 0) return;

        const response = await getTableIdList("Upload_Job_Status", "lease_id", leaseIds);
        const latestStatusByLease = (response || []).reduce((acc, status) => {
          const leaseId = status?.lease_id;
          if (!leaseId) return acc;

          const prev = acc[leaseId];
          const isNewer =
            !prev ||
            (status?.created_at &&
              prev?.created_at &&
              new Date(status.created_at) > new Date(prev.created_at));
          if (isNewer) acc[leaseId] = status;
          return acc;
        }, {});
        if (!isCancelled) setLeaseStatus(latestStatusByLease);
      } catch (err) {
        console.error("Error fetching job statuses", err);
      }
    },
    [leaseDocs]
  );

  useEffect(() => {
    if (!leaseDocs || leaseDocs.length === 0) return;
    let isCancelled = false;
    loadJobStatuses(isCancelled);
    return () => {
      isCancelled = true;
    };
  }, [leaseDocs, loadJobStatuses]);


  /** ---------- Override application ---------- */
  const applyOverridesToList = useCallback(
    (list) => {
      if (!Array.isArray(list)) return list;
      const now = new Date();

      return list.map((item) => {
        if (!item || typeof item !== "object") return item;

        const entries = Object.entries(item);
        if (!entries.length) return item;

        const [label, rawObj] = entries[0];
        if (!rawObj || typeof rawObj !== "object") return item;

        const key = FIELD_KEYS[label];
        if (!key) return item;

        const ov = overrides[key];
        if (!ov) return item;

        let shouldApplyOverride = true;

        if (DATE_KEYS.has(key)) {
          const rawDate = parseDateLoose(rawObj.value);
          const ovEditedAt = ov.modified_at ? new Date(ov.modified_at) : null;

          if (
            rawDate &&
            ovEditedAt &&
            rawDate > ovEditedAt &&
            now >= rawDate
          ) {
            shouldApplyOverride = false;
          }
        }

        if (!shouldApplyOverride) return item;

        return {
          [label]: {
            ...rawObj,                // 🔒 preserve metadata
            value: ov.value ?? "",
            is_manual_change: true,
          },
        };
      });
    },
    [overrides]
  );



  /** ---------- Derived ---------- */
  const hasAnyTerms =
    (leaseSummary?.length ?? 0) +
    (financial?.length ?? 0) +
    (responsibility?.length ?? 0) +
    (keyDates?.length ?? 0) +
    (rights?.length ?? 0) >
    0;

  /** ---------- Loading / guard ---------- */
  if (isLoading || !tenant) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
        <Spinner />
      </div>
    );
  }
  const tenantTerms = () => {
    if (unit_id) {
      navigate(`/terms/${tenant_id}?unit_id=${unit_id}`)
    }
    else navigate(`/terms/${tenant_id}`)
  }
  const handleOpenExtraction = async (payload) => {

    const label = Object.keys(payload)[0]
    const term = Object.values(payload)[0]
    setActiveExtraction(term);
    setActiveLabel(label)

    if (term != null) {
      const url = await getSignedUrl(term.source_doc);
      console.log(url)
      setSignedUrl(`${url}#page=${term.page}`);
    }
  };



  /** ---------- Render (view-only) ---------- */
  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-7xl mx-auto">
      {/* Header / Actions */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-sm sm:text-base px-3 py-2 rounded-xl bg-gray-700 hover:bg-gray-600"
          aria-label="Go back"
        >
          ← Back
        </button>
        {extraction && (
          <button
            onClick={() => tenantTerms()}
            className="text-sm sm:text-base px-3 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 underline"
          >
            View All Terms
          </button>
        )}
      </div>

      {/* Top: Profile & Messages (stack on mobile, side-by-side on lg) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 h-80">
        {roleData && (
          <div className="flex justify-center">
            <Profile
              entity={tenant}
              session={session}
              getFilePath={(t) => t?.photo_file_path}
              getLabel={(t) => t?.Tenant_Name}
              getRelatedEntity={async () => {
                if (!unitsIds || unitsIds.length === 0) return [];
                const { data, error } = await supabase.from("Units").select("*").in("unit_id", unitsIds);
                if (error) {
                  console.error("Error Fetching Units", error);
                  return [];
                }
                return data || [];
              }}
              getRelatedFilePath={(unit) => unit?.photo_file_path}
              getRelatedLabel={(unit) => `${unit?.Suite} - ${unit?.address}`}
              RelatedTitle="Unit(s)"
              getRelatedEntityId={(unit) => unit?.unit_id}
              Title="Tenant"
              getEntityId={(t) => t?.tenant_id}
              edit_Entity={roleData?.Edit_Tenants}
              delete_Entity={roleData?.Can_Delete_Tenants}
              className="w-full max-w-2xl"
              selectedUnit={selectedUnit[0] ? selectedUnit[0] : null}
            />
          </div>
        )}

        <LoadPreviousMessages entityId={tenant_id} session={session} entityType="tenant" />
      </div>
      {extraction && selectedUnit != [] && (
        <div>
          {/* ---------- Row 1: Lease Summary | Contact Info ---------- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <SectionCard title="Lease Summary">
              {leaseSummary?.length ? (
                applyOverridesToList(leaseSummary).map((item, idx) =>

                  <EntryRow key={`summary-${idx}`} item={item}
                    onValueClick={() => {

                      handleOpenExtraction(item); // or however you fetch it
                    }}
                  />)
              ) : (
                <p className="py-2 text-sm text-muted-foreground">No summary found.</p>
              )}
            </SectionCard>

            <SectionCard title="Contact Info">
              {contacts?.length ? (
                <div className="flex flex-col gap-3">
                  {contacts.map((contact) => (
                    <button
                      key={contact?.contact_id}
                      className="text-left rounded-xl p-3 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      onClick={() => navigate(`/contact/${contact?.contact_id}`)}
                    >
                      <EntryRow item={{ Name: contact?.Contact_Name }} />
                      <EntryRow item={{ Type: contact?.Contact_Type }} />
                      <EntryRow item={{ Phone: contact?.Phone }} />
                      <EntryRow item={{ Email: contact?.Email }} />
                      <EntryRow item={{ Address: contact?.Address }} />
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState title="No contacts found." />
              )}
            </SectionCard>
          </div>

          {/* ---------- Row 2: Financial Snapshot | Responsibility ---------- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <SectionCard title="Financial Snapshot">
              {financial?.length ? (
                applyOverridesToList(financial).map((item, idx) => <EntryRow key={`fin-${idx}`} item={item}
                  onValueClick={() => {

                    handleOpenExtraction(item); // or however you fetch it
                  }} />)
              ) : (
                <p className="py-2 text-sm text-muted-foreground">No financial terms found.</p>
              )}
            </SectionCard>

            <SectionCard title="Responsibility">
              {responsibility?.length ? (
                applyOverridesToList(responsibility).map((item, idx) => <EntryRow key={`resp-${idx}`} item={item}
                  onValueClick={() => {

                    handleOpenExtraction(item); // or however you fetch it
                  }} />)
              ) : (
                <p className="py-2 text-sm text-muted-foreground">No responsibilities found.</p>
              )}
            </SectionCard>
          </div>

          {/* ---------- Row 3: Key Dates | Critical Rights & Options ---------- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <SectionCard title="Key Dates">
              {keyDates?.length ? (
                applyOverridesToList(keyDates).map((item, idx) => <EntryRow key={`date-${idx}`} item={item}
                  onValueClick={() => {

                    handleOpenExtraction(item); // or however you fetch it
                  }} />)
              ) : (
                <p className="py-2 text-sm text-muted-foreground">No key dates found.</p>
              )}
            </SectionCard>

            <SectionCard title="Critical Rights and Options">
              {rights?.length ? (
                applyOverridesToList(rights).map((item, idx) => <EntryRow key={`rights-${idx}`} item={item}
                  onValueClick={() => {
                    handleOpenExtraction(item); // or however you fetch it
                  }} />)
              ) : (
                <p className="py-2 text-sm text-muted-foreground">No rights or options found.</p>
              )}
            </SectionCard>
          </div>
        </div>
      )}
      {/* ---------- Row 4: Lease Documents (full width) ---------- */}
      <div className="mb-6">
        <SectionCard title="Lease Documents">
          {leaseDocs?.length ? (
            <div className="flex flex-col gap-3">
              {leaseDocs.map((lease) => {
                const title = (lease?.lease_file_path || "").split("/").pop();
                const status = leaseStatus?.[lease?.lease_id]?.job_info?.status;

                return (
                  <div
                    key={lease?.lease_id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-xl bg-gray-800/60"
                  >
                    <button
                      className="text-left underline hover:text-gray-200"
                      onClick={async () => {
                        const signedUrl = await getSignedUrl(lease?.lease_file_path);
                        if (signedUrl) window.open(signedUrl, "_blank", "noopener,noreferrer");
                      }}
                    >
                      {title || "Lease Document"}
                    </button>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="opacity-75">Status:</span>
                      <span className="font-medium">
                        {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"}
                      </span>

                      {status === "error" && (
                        <>
                          <span className="opacity-50">•</span>
                          <button
                            className="px-3 py-1 rounded-lg bg-gray-600 hover:bg-gray-500"
                            onClick={async () => {
                              // 1) Check if file still exists in Storage
                              const exists = await fileExistsInStorage(lease?.lease_file_path);
                              if (!exists) {
                                // If missing, send them to upload flow for this tenant
                                navigate(`/upload_docs?tenant_id=${tenant_id}`);
                                return;
                              }
                              const group_id = crypto.randomUUID();
                              await supabase.from("upload_groups").insert({
                                id: group_id,
                                company_id: tenant.property_management_id,
                                total_jobs: 1,
                                tenantId: tenant.tenant_id,
                              });
                              // 2) Requeue the job
                              await supabase.from("Upload_Job_Status").insert({
                                lease_id: lease?.lease_id,
                                job_info: { error: null, status: "queued", results: null },
                                group_id: group_id,
                              });
                              loadJobStatuses();
                            }}
                          >
                            Reupload
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No lease documents found." hint="Upload lease files to see them listed here." />
          )}
        </SectionCard>
      </div>
      {activeLabel && (
        <ExtractionModal
          label={safeExtraction.label}
          aiValue={safeExtraction.value}
          aiFuture={safeExtraction.future_value}
          aiConfidence={safeExtraction.confidence_score}
          aiReason={safeExtraction.reason}
          requiresReview={safeExtraction.manual_review}
          signedUrl={signedUrl}
          onClose={() => {
            setActiveLabel(null)
            setActiveExtraction(null);
            setSignedUrl(null);

          }}
          onSave={(finalValue, meta) => {

            // Example override write
            saveOverride(activeLabel, finalValue, meta, tenant_id, unit_id, company_id, session);
            setActiveLabel(null)
            setActiveExtraction(null);
            setSignedUrl(null);
          }}
          tenant_id={tenant_id}
        />
      )}


      {/* Absolute nothing state */}
      {!hasAnyTerms && leaseDocs?.length === 0 && (
        <div className="text-center text-sm text-gray-300">
          Nothing to show yet. Try uploading a lease or syncing terms.
        </div>
      )}
    </div>
  );
};

export default TenantPage;
