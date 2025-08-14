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
import { getTableIdList } from "../utilities/supabaseCalls";

/**
 * Helpers
 */

// Render a single "Label: Value" row
const InfoRow = ({ label, value }) => {
  if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div className="mb-3">
      <div className="flex flex-col sm:flex-row sm:items-center">
        <h3 className="text-base sm:text-lg font-medium sm:mr-2">{label}:</h3>
        <p className="text-sm sm:text-base break-words">{String(value)}</p>
      </div>
    </div>
  );
};

// Render an array of one-key objects like [{ "Base Rent": "$1,234" }, ...]
const TermsList = ({ title, items }) => {
  if (!items || items.length === 0) return null;

  return (
    <DisplayBox className="w-full">
      <div>
        <h2 className="text-xl sm:text-2xl underline mb-3">{title}</h2>
        <div>
          {items.map((item, idx) => {
            const entries = Object.entries(item || {});
            if (entries.length === 0) return null;
            const [key, value] = entries[0];
            return <InfoRow key={`${title}-${idx}-${key}`} label={key} value={value} />;
          })}
        </div>
      </div>
    </DisplayBox>
  );
};

const EmptyState = ({ title, hint }) => (
  <div className="text-sm text-gray-300">
    <p className="font-medium">{title}</p>
    {hint && <p className="opacity-80">{hint}</p>}
  </div>
);

/**
 * TenantPage
 * Displays a tenant profile, related units, lease details, and previous messages.
 */
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

  const [isLoading, setIsLoading] = useState(true);

  // ---------- Data Fetching ----------

  // Fetch tenant + units + contacts in parallel
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

        const [{ data: tenantData, error: tenantErr }, { data: unitLinks, error: unitErr }, { data: contactLinks, error: linkErr }] =
          await Promise.all([tenantPromise, unitsPromise, contactLinkPromise]);

        if (tenantErr) throw tenantErr;
        if (unitErr) throw unitErr;
        if (linkErr) throw linkErr;

        if (!isCancelled) {
          setTenant(tenantData || null);
          setUnitsIds(Array.isArray(unitLinks) ? unitLinks.map((row) => row.unit_id) : []);
        }

        // If there are contact links, fetch contact details
        const contactIds = Array.isArray(contactLinks) ? contactLinks.map((c) => c.contact_id) : [];
        if (contactIds.length > 0) {
          const { data: contactData, error: contactError } = await supabase
            .from("Contact")
            .select("*")
            .in("contact_id", contactIds);

          if (contactError) throw contactError;
          if (!isCancelled) setContacts(contactData || []);
        } else {
          if (!isCancelled) setContacts([]);
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

  // Fetch lease terms (summary, financial, etc.)
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
        setKeyDates(leases.keyDates || []);
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

  // Fetch processing job status for each lease doc
  useEffect(() => {
    if (!leaseDocs || leaseDocs.length === 0) return;

    let isCancelled = false;

    const loadJobStatuses = async () => {
      try {
        const leaseIds = leaseDocs.map((l) => l.lease_id).filter(Boolean);
        if (leaseIds.length === 0) return;

        const response = await getTableIdList("Upload_Job_Status", "lease_id", leaseIds);
        const latestStatusByLease = (response || []).reduce((acc, status) => {
          const leaseId = status?.lease_id;
          if (!leaseId) return acc;

          const prev = acc[leaseId];
          const isNewer =
            !prev ||
            (status?.created_at && prev?.created_at && new Date(status.created_at) > new Date(prev.created_at));
          if (isNewer) acc[leaseId] = status;
          return acc;
        }, {});
        if (!isCancelled) setLeaseStatus(latestStatusByLease);
      } catch (err) {
        console.error("Error fetching job statuses", err);
      }
    };

    loadJobStatuses();
    return () => {
      isCancelled = true;
    };
  }, [leaseDocs]);

  // Signed URL for viewing a lease doc
  const getSignedUrl = useCallback(async (filePath) => {
    if (!filePath) return null;
    const { data, error } = await supabase.storage.from("lease-docs").createSignedUrl(filePath, 600);
    if (error) {
      console.error("Error Generating Signed URL", error);
      return null;
    }
    return data?.signedUrl ?? null;
  }, []);

  // ---------- Derived ----------

  const hasAnyTerms =
    (leaseSummary?.length ?? 0) +
    (financial?.length ?? 0) +
    (responsibility?.length ?? 0) +
    (keyDates?.length ?? 0) +
    (rights?.length ?? 0) >
    0;

  // ---------- Render ----------

  if (isLoading || !tenant) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
        <Spinner />
      </div>
    );
  }

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
            className="w-full max-w-2xl"
          />
          </div>
        )}

        <LoadPreviousMessages entityId={tenant_id} session={session} entityType="tenant" />

      </div>

      {/* Middle: Lease Summary + Contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {leaseSummary?.length ? (
          <TermsList title="Lease Summary" items={leaseSummary} />
        ) : (
          <DisplayBox className="w-full">
            <h2 className="text-xl sm:text-2xl underline mb-3">Lease Summary</h2>
            <EmptyState title="No summary found." hint="Upload or re-process a lease to populate this section." />
          </DisplayBox>
        )}

        <DisplayBox className="w-full">
          <div>
            <h2 className="text-xl sm:text-2xl underline mb-3">Contact Info</h2>
            {contacts?.length ? (
              <div className="flex flex-col gap-3">
                {contacts.map((contact) => (
                  <button
                    key={contact?.contact_id}
                    className="text-left text-white rounded-xl p-3 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    onClick={() => navigate(`/contact/${contact?.contact_id}`)}
                  >
                    <InfoRow label="Name" value={contact?.Contact_Name} />
                    <InfoRow label="Type" value={contact?.Contact_Type} />
                    <InfoRow label="Phone" value={contact?.Phone} />
                    <InfoRow label="Email" value={contact?.Email} />
                    <InfoRow label="Address" value={contact?.Address} />
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState title="No contacts found." />
            )}
          </div>
        </DisplayBox>
      </div>

      {/* Bottom: Financial + Responsibility/Dates/Rights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {financial?.length ? (
          <TermsList title="Financial Snapshot" items={financial} />
        ) : (
          <DisplayBox className="w-full">
            <h2 className="text-xl sm:text-2xl underline mb-3">Financial Snapshot</h2>
            <EmptyState title="No financial terms found." />
          </DisplayBox>
        )}

        <DisplayBox className="w-full">
          <div>
            <h2 className="text-xl sm:text-2xl underline mb-3">Responsibility</h2>
            {responsibility?.length ? (
              <div className="mb-4">
                {responsibility.map((item, idx) => {
                  const entries = Object.entries(item || {});
                  if (entries.length === 0) return null;
                  const [key, value] = entries[0];
                  return <InfoRow key={`resp-${idx}-${key}`} label={key} value={value} />;
                })}
              </div>
            ) : (
              <EmptyState title="No responsibilities found." />
            )}

            <h2 className="text-xl sm:text-2xl underline mt-4 mb-3">Key Dates</h2>
            {keyDates?.length ? (
              <div className="mb-4">
                {keyDates.map((item, idx) => {
                  const entries = Object.entries(item || {});
                  if (entries.length === 0) return null;
                  const [key, value] = entries[0];
                  return <InfoRow key={`dates-${idx}-${key}`} label={key} value={value} />;
                })}
              </div>
            ) : (
              <EmptyState title="No key dates found." />
            )}

            <h2 className="text-xl sm:text-2xl underline mt-4 mb-3">Critical Rights and Options</h2>
            {rights?.length ? (
              <div>
                {rights.map((item, idx) => {
                  const entries = Object.entries(item || {});
                  if (entries.length === 0) return null;
                  const [key, value] = entries[0];
                  return <InfoRow key={`rights-${idx}-${key}`} label={key} value={value} />;
                })}
              </div>
            ) : (
              <EmptyState title="No rights or options found." />
            )}
          </div>
        </DisplayBox>

      </div>

      {/* Lease Documents */}
      <div className="mb-6">
        <DisplayBox className="w-full">
          <div>
            <h2 className="text-xl sm:text-2xl underline mb-3">Lease Documents</h2>

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
                              onClick={() => navigate("/upload_docs")}
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
          </div>
        </DisplayBox>
      </div>

      {/* If absolutely nothing is available */}
      {!hasAnyTerms && leaseDocs?.length === 0 && (
        <div className="text-center text-sm text-gray-300">
          Nothing to show yet. Try uploading a lease or syncing terms.
        </div>
      )}
    </div>
  );
};

export default TenantPage;