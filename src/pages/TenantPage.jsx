// src/pages/TenantPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { useAuth } from "../components/AuthProvider";
import { supabase } from "../supabaseClient";

import Spinner from "../components/Spinner";
import Profile from "../components/Profile";
import DisplayBox from "../components/DisplayBox";
import LoadPreviousMessages from "../components/PreviousMessages";
import { getTenantLeaseInfo } from "../utilities/GetMessages";
import { getTableIdList, fileExistsInStorage } from "../utilities/supabaseCalls";
import { getTenantTermOverrides } from "../utilities/supabaseCalls.jsx";

/** ---------- Field mapping (Display Label → canonical key used for overrides) ---------- */
const FIELD_KEYS = {
  // Dates (examples)
  "Lease Execution Date": "lease_execution_date",
  "Lease Commencement Date": "lease_commencement_date",
  "Delivery/Possession Date": "delivery_possession_date",
  "Lease Expiration Date": "lease_expiration_date",
  "Rent Commencement Date": "rent_commencement_date",
  "CAM Start Date": "cam_start_date",

  // Financial (examples)
  "Base Rent Monthly": "base_rent_monthly",
  "Base Rent Annually": "base_rent_annually",
  "Base Rent PSF": "base_rent_psf",
  "Operating Expenses CAM Monthly": "operating_expenses_cam_monthly",
  "Operating Expenses CAM PSF": "operating_expenses_cam_psf",

  // Responsibility / rights / other (extend as needed)
  "Property Taxes": "property_taxes",
  "Insurance Cost": "insurance_cost",
  "Tenant Reimbursement": "tenant_reimbursement",
  "Utility Responsibility": "utility_responsibility",
  "HVAC Responsibilities": "hvac_responsibilities",
  "Tenant Maintenance Responsibilities": "tenant_maintenance_responsibilities",
  "Landlord Maintenance Responsibilities": "landlord_maintenance_responsibilities",
  "Renewal Options": "renewal_options",
  "Option Exercise Deadlines": "option_exercise_deadlines",
  "Holdover Terms": "holdover_terms",
  "ROFR/ROFO Clauses": "rofr_rofo_clauses",
  "Purchase Options": "purchase_options",
  "Termination Rights": "termination_rights",
};

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
const EntryRow = ({ item }) => {
  if (!item || typeof item !== "object") return null;

  const entries = Object.entries(item);
  if (entries.length === 0) return null;

  const [label, rawValue] = entries[0];
  if (rawValue == null) return null;

  let display = String(rawValue).trim();
  if (!display) return null;

  // 🔹 Special case: Rent Escalation
  if (label === "Rent Escalation") {
    // Remove surrounding [] if present
    if (display.startsWith("[") && display.endsWith("]")) {
      display = display.slice(1, -1);
    }

    // Try to pretty-print JSON-like content
    try {
      const parsed = JSON.parse(`[${display}]`);
      display = parsed
        .map(
          (r) =>
            `${r.period}\n` +
            `• Base Rent: $${r.monthly_base_rent.toLocaleString()}\n` +
            `• CAM: $${r.monthly_cam.toLocaleString()}\n` +
            `• Total: $${r.total_monthly_rent.toLocaleString()}`
        )
        .join("\n\n");
    } catch {
      // fallback: just show cleaned text
    }
  }
  // 🔹 Generic JSON fallback (other fields)
  else if (
    (display.startsWith("{") && display.endsWith("}")) ||
    (display.startsWith("[") && display.endsWith("]"))
  ) {
    try {
      display = JSON.stringify(JSON.parse(display), null, 2);
    } catch {}
  }

  return (
    <div className="border-b border-muted/30 py-2 last:border-b-0 overflow-hidden">
      <dt className="text-sm font-medium text-muted-foreground mb-1">
        {label}
      </dt>
      <dd className="text-sm leading-relaxed whitespace-pre-wrap break-all">
        {display}
      </dd>
    </div>
  );
};



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
  const { session, roleData } = useAuth();
  const { tenant_id } = useParams();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState(null);
  const [unitsIds, setUnitsIds] = useState([]);
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
          setUnitsIds(Array.isArray(unitLinks) ? unitLinks.map((row) => row.unit_id) : []);
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

  /** ---------- Load extracted terms ---------- */
  useEffect(() => {
    if (!tenant_id) return;

    let isCancelled = false;

    const loadLeases = async () => {
      try {
        const leases = await getTenantLeaseInfo(tenant_id);
        if (isCancelled || !leases) return;

        setLeaseSummary(leases.lease_summary || []);
        setFinancial(leases.financial_snapshot || []);
        setResponsibility(leases.responsibility || []);
        setKeyDates(leases.keyDates || []); // note: key may be 'keyDates' in your result
        setRights(leases.rights || []);
        setLeaseDocs(leases.lease_docs || []);
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

  /** ---------- Signed URL ---------- */
  const getSignedUrl = useCallback(async (filePath) => {
    if (!filePath) return null;
    const { data, error } = await supabase.storage.from("lease-docs").createSignedUrl(filePath, 600);
    if (error) {
      console.error("Error Generating Signed URL", error);
      return null;
    }
    return data?.signedUrl ?? null;
  }, []);

  /** ---------- Override application ---------- */
  const applyOverridesToList = useCallback(
    (list) => {
      if (!Array.isArray(list) || list.length === 0) return list;
      const now = new Date();

      return list.map((item) => {
        if (!item || typeof item !== "object") return item;
        const entries = Object.entries(item);
        if (entries.length === 0) return item;

        const [label, raw] = entries[0];
        const key = FIELD_KEYS[label];
        if (!key) return item;

        const ov = overrides[key]; // { value, modified_at }
        if (!ov) return item;

        // Only apply the date rule to specific date keys (recommended)
        if (DATE_KEYS.has(key)) {
          const rawDate = parseDateLoose(raw);
          const ovEditedAt = ov.modified_at ? new Date(ov.modified_at) : null;

          // If raw (amendment) is newer than the edit and already effective, prefer raw
          if (rawDate && ovEditedAt && rawDate > ovEditedAt && now >= rawDate) {
            return item; // keep raw (amendment)
          }
        }

        // Otherwise show override value
        return { [label]: ov.value ?? "" };
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

        <button
          onClick={() => navigate(`/terms/${tenant_id}`)}
          className="text-sm sm:text-base px-3 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 underline"
        >
          View All Terms
        </button>
      </div>

      {/* Top: Profile & Messages (stack on mobile, side-by-side on lg) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
              getRelatedLabel={(unit) => unit?.address}
              RelatedTitle="Unit(s)"
              getRelatedEntityId={(unit) => unit?.unit_id}
              Title="Tenant"
              getEntityId={(t) => t?.tenant_id}
              edit_Entity={roleData?.Edit_Tenants}
              delete_Entity={roleData?.Can_Delete_Tenants}
              className="w-full max-w-2xl"
            />
          </div>
        )}

        <LoadPreviousMessages entityId={tenant_id} session={session} entityType="tenant" />
      </div>

      {/* ---------- Row 1: Lease Summary | Contact Info ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SectionCard title="Lease Summary">
          {console.log("Lease Summary", leaseSummary)}
          {leaseSummary?.length ? (
            applyOverridesToList(leaseSummary).map((item, idx) => <EntryRow key={`summary-${idx}`} item={item} />)
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
            applyOverridesToList(financial).map((item, idx) => <EntryRow key={`fin-${idx}`} item={item} />)
          ) : (
            <p className="py-2 text-sm text-muted-foreground">No financial terms found.</p>
          )}
        </SectionCard>

        <SectionCard title="Responsibility">
          {responsibility?.length ? (
            applyOverridesToList(responsibility).map((item, idx) => <EntryRow key={`resp-${idx}`} item={item} />)
          ) : (
            <p className="py-2 text-sm text-muted-foreground">No responsibilities found.</p>
          )}
        </SectionCard>
      </div>

      {/* ---------- Row 3: Key Dates | Critical Rights & Options ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SectionCard title="Key Dates">
          {keyDates?.length ? (
            applyOverridesToList(keyDates).map((item, idx) => <EntryRow key={`date-${idx}`} item={item} />)
          ) : (
            <p className="py-2 text-sm text-muted-foreground">No key dates found.</p>
          )}
        </SectionCard>

        <SectionCard title="Critical Rights and Options">
          {rights?.length ? (
            applyOverridesToList(rights).map((item, idx) => <EntryRow key={`rights-${idx}`} item={item} />)
          ) : (
            <p className="py-2 text-sm text-muted-foreground">No rights or options found.</p>
          )}
        </SectionCard>
      </div>

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
