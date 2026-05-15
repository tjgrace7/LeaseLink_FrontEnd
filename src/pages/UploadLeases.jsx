// src/pages/UploadLeases.jsx

import { useRef, useState, useEffect, useCallback } from "react";
import { useAuth } from "../components/AuthProvider";
import { useNavigate } from "react-router-dom";

import DisplayBox from "../components/DisplayBox";
import Dropdown from "../components/dropdown";
import { supabase } from "../supabaseClient";
import Spinner from "../components/Spinner";
import { GTMUpload } from "../components/gtag";
import { putWithProgress } from "../utilities/Generic";

/**
 * UploadLeases — with per-file progress UI + post-run lock/reset
 * Steps per file:
 *  1) Requesting URL
 *  2) Uploading (progress % with XHR)
 *  3) Processing
 *  4) Done / Error
 */
// XHR PUT to get upload progress (fetch has no native upload progress)
const UploadLeases = () => {
  const { session, userData } = useAuth();
  const navigate = useNavigate();

  // Data
  const [tenants, setTenants] = useState([]);
  const [units, setUnits] = useState([]);
  const [properties, setProperties] = useState([]);

  // Selections
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);

  // Files
  const [fileList, setFileList] = useState([]);

  // UI state
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [submittingFiles, setSubmittingFiles] = useState(false);
  const [completed, setCompleted] = useState(false); // 🔐 lock after a run

  const [multipleUnits, setMultipleUnits] = useState(false);

  // Per-file status map: { [id]: { name, step, progress, message, error, done } }
  const [fileStatuses, setFileStatuses] = useState({});

  // File input ref to clear chooser after success
  const fileInputRef = useRef(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const company_id = localStorage.getItem('activeCompanyId')
  // A stable ID per file (good enough for the session)
  const fileId = (f) => `${f.name}-${f.size}-${f.lastModified}`;

  const setStatus = (id, patch) =>
    setFileStatuses((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), ...patch },
    }));



  // ----------------- Fetch Tenants on Load -----------------
  useEffect(() => {
    if (!session || !company_id) return;
    let cancelled = false;

    const getTenants = async () => {
      setLoadingTenants(true);
      try {
        const { data, error } = await supabase
          .from("tenant")
          .select("*")
          .eq("property_management_id", company_id);

        if (error) throw error;
        if (!cancelled) setTenants(data || []);
      } catch (err) {
        console.error("Tenant Fetch Error", err);
        if (!cancelled) setTenants([]);
      } finally {
        if (!cancelled) setLoadingTenants(false);
      }
    };

    getTenants();
    return () => {
      cancelled = true;
    };
  }, [session, company_id]);


  // ----------------- When a tenant is selected, fetch linked units + properties -----------------
  const tenantSelected = useCallback(
    async (tenant) => {
      setSelectedTenant(tenant);
      setSelectedUnit(null);
      setSelectedProperty(null);
      setUnits([]);
      setProperties([]);

      if (!tenant?.tenant_id) return;

      setLoadingLinks(true);
      try {
        // 1) Units for tenant
        const { data: unitData, error: unitError } = await supabase
          .from("Units")
          .select("*")
          .eq("tenant_id", tenant.tenant_id);

        if (unitError) throw unitError;
        const safeUnits = unitData || [];
        setUnits(safeUnits);
        if (safeUnits.length === 1) setSelectedUnit(safeUnits[0]);

        // 2) Property IDs linked to tenant (via join table)
        const { data: propLinks, error: propertyError } = await supabase
          .from("Property_Tenant")
          .select("property_id")
          .eq("tenant_id", tenant.tenant_id);

        if (propertyError) throw propertyError;

        const propertyIds = (propLinks || [])
          .map((r) => r?.property_id)
          .filter(Boolean);

        if (propertyIds.length === 0) {
          setProperties([]);
          return;
        }

        // 3) Pull actual property rows for display (names + images)
        const { data: fullProps, error: propsErr } = await supabase
          .from("properties")
          .select("*")
          .in("prop_id", propertyIds);

        if (propsErr) throw propsErr;

        const safeProps = fullProps || [];
        setProperties(safeProps);
        if (safeProps.length === 1) setSelectedProperty(safeProps[0]);
      } catch (err) {
        console.error("Error Fetching Units/Properties", err);
        setUnits([]);
        setProperties([]);
      } finally {
        setLoadingLinks(false);
      }
    },
    [supabase]
  );

  // ----------------- Files: capture user selection -----------------
  const handleFileChange = (event) => {
    const incoming = Array.from(event.target.files || []);
    // If picking new files after a completed run, unlock a new run
    if (incoming.length > 0 && completed) setCompleted(false);

    setFileList(incoming);

    // Initialize statuses
    const init = {};
    for (const f of incoming) {
      const id = fileId(f);
      init[id] = {
        name: f.name,
        step: "Ready",
        progress: 0,
        message: "",
        error: null,
        done: false,
      };
    }
    setFileStatuses(init);
  };

  // ----------------- Submit Uploads with per-file progress -----------------
  const Submit = useCallback(async () => {
    if (submittingFiles || completed) return; // prevent double-run
    if (!selectedTenant || !selectedProperty || !selectedUnit || fileList.length === 0) {
      alert("Please select a tenant, property, unit, and at least one file.");
      return;
    }

    if (!session?.access_token || !session?.user?.id) {
      alert("Your session has expired. Please sign in again.");
      return;
    }

    setSubmittingFiles(true);

    try {
      const groupId = crypto.randomUUID()
      const { error } = await supabase.from('upload_groups').insert({
        id: groupId,
        company_id: company_id,
        total_jobs: fileList.length,
        tenantId: selectedTenant.tenant_id
      })
      if (error) {
        console.error("Group Upload Error")
      }
      for (const file of fileList) {
        const id = fileId(file);
        try {
          // Step 1: Request signed URL
          setStatus(id, { step: "Requesting URL", message: "Generating signed upload URL…" });

          const res = await fetch(`${supabaseUrl}/functions/v1/generate_upload_url`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              company_id: company_id,
              tenant_id: selectedTenant.tenant_id,
              property_id: selectedProperty.prop_id,
              unit_id: selectedUnit.unit_id,
              filename: file.name,
              contentType: file.type || "application/octet-stream",
              user_id: session.user.id,
              group_id: groupId
            }),
          });

          if (!res.ok) {
            const errText = await res.text().catch(() => "");
            throw new Error(`Failed to get signed URL (${res.status}): ${errText}`);
          }
          GTMUpload()
          const { lease_id, signed_url, lease_file_path, bucket, job_id, error: fxError } = await res.json();
          if (fxError) throw new Error(fxError);
          if (!signed_url || !lease_file_path || !bucket) {
            throw new Error("Edge function did not return expected fields.");
          }

          // Step 2: Upload with progress
          setStatus(id, { step: "Uploading", message: "Uploading to storage…", progress: 0 });
          try {
            await putWithProgress(
              signed_url,
              file,
              file.type || "application/octet-stream",
              (pct) => setStatus(id, { progress: pct })
            );
          } catch (uploadErr) {
            console.error("Upload Error", uploadErr);
            setStatus(id, {
              step: "Error",
              message: err?.message || "Unknown error",
              error: true,
            });
            alert(`Upload failed for file ${file.name}: ${uploadErr.message}`);
            continue; // skip to next file
          }
          // Optional: immediately trigger processing after upload (instead of waiting for a separate step or background worker)
         //const serverurl = "http://localhost:8000";
         /*
          const lease_request = {
            user_id: session.user.id,
            property_id: selectedProperty.prop_id,
            unit_id: selectedUnit.unit_id,
            tenant_id: selectedTenant.tenant_id,
            file_path: lease_file_path,
            lease_document_id: lease_id,
            bucket: bucket,
            company_id: userData.company_id
          }
          try {

            const serverRes = await fetch(`${serverurl}/firstLease`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                auth_id: session.user.id,
                lease_data: lease_request,
                job_id: job_id,
                group_id: groupId
              }),
            });
            // If FastAPI raised HTTPException or an unhandled error → !ok
            console.log("serverRes", serverRes);
            if (!serverRes.ok) {
              const errorBody = await serverRes.json().catch(() => null);

              const message =
                errorBody?.detail ||          // from HTTPException(detail="...")
                errorBody?.error ||           // from JSONResponse({"error": ...})
                `Request failed with status ${serverRes.status}`;

              throw new Error(message);
            }

            const data = await serverRes.json(); // success path
            console.log("Success:", data);
          } catch (err) {
            console.error("firstLease error:", err);

            // Show toast, set error state, etc.
            // setError(err.message);
          } 
          */
            
          // Step 3: Trigger processing
          setStatus(id, { step: "Processing", message: "Starting file processing…" });

          setStatus(id, { step: "Done", message: "Finished!", progress: 100, done: true });


          console.log(`✅ File processed: ${file.name}`);
        } catch (err) {
          console.error("❌ Error during upload for", file.name, err);
          setStatus(id, {
            step: "Error",
            message: err?.message || "Unknown error",
            error: true,
          });
        }
      }

      // After the whole run, lock + clear input/queues
      setCompleted(true);           // 🔐 lock UI to prevent accidental re-run
      setFileList([]);              // clear queue
      setFileStatuses({});          // or keep if you want a summary
      if (fileInputRef.current) fileInputRef.current.value = ""; // clear <input type="file" />

      // Optional: navigate immediately
      // navigate("/dashboard");
      alert("🎉 Uploads finished. Processing triggered for successful files.");
    } catch (err) {
      console.error("❌ Error during upload flow:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setSubmittingFiles(false);
    }
  }, [
    fileList,
    selectedProperty,
    selectedTenant,
    selectedUnit,
    session,
    supabaseUrl,
    company_id,
    submittingFiles,
    completed,
  ]);

  // ----------------- Render -----------------

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold">Upload Leases</h1>
        <button
          onClick={() => navigate(-1)}
          className="text-sm sm:text-base px-3 py-2 rounded-xl bg-gray-700 hover:bg-gray-600"
          aria-label="Go back"
        >
          ← Back
        </button>
      </div>

      <DisplayBox className="flex flex-col gap-4">
        {/* Tenant */}
        <div>
          <label className="block mb-2 font-medium">Tenant</label>
          {loadingTenants ? (
            <div className="py-2 text-sm text-gray-300">Loading tenants…</div>
          ) : (
            <Dropdown
              options={tenants}
              onSelect={tenantSelected}
              placeholder={selectedTenant?.DBA || selectedTenant?.Tenant_Name || "Select Tenant"}
              getOptionId={(t) => t?.tenant_id}
              getOptionTitle={(t) => t?.DBA || t?.Tenant_Name}
            />
          )}
        </div>

        {/* Property */}
        {selectedTenant && (
          <div>
            <label className="block mb-2 font-medium">Property</label>
            {loadingLinks ? (
              <div className="py-2 text-sm text-gray-300">Loading properties…</div>
            ) : properties.length > 1 ? (
              <Dropdown
                options={properties}
                onSelect={setSelectedProperty}
                placeholder="Select Property"
                getOptionId={(p) => p?.prop_id}
                getOptionTitle={(p) => p?.Property_Name}
              />
            ) : properties.length === 1 ? (
              <div className="text-sm text-gray-200 bg-gray-800 rounded-xl px-3 py-2 inline-block">
                {properties[0]?.Property_Name || "Property"}
              </div>
            ) : (
              <div className="text-sm text-gray-300">No properties linked to this tenant.</div>
            )}
          </div>
        )}

        {/* Unit */}
        {selectedTenant && (
          <div>
            <label className="block mb-2 font-medium">Unit</label>
            {loadingLinks ? (
              <div className="py-2 text-sm text-gray-300">Loading units…</div>
            ) : units.length > 1 ? (
              <Dropdown
                className="mt-1"
                options={units}
                onSelect={setSelectedUnit}
                placeholder={selectedUnit?.Suite || "Select Unit"}
                getOptionId={(u) => u?.unit_id}
                getOptionTitle={(u) => `${u?.Suite} - ${u?.address}`}
              />
            ) : units.length === 1 ? (
              <div className="text-sm text-gray-200 bg-gray-800 rounded-xl px-3 py-2 inline-block">
                {units[0]?.address || "Unit"}
              </div>
            ) : (
              <div className="text-sm text-gray-300">No units linked to this tenant.</div>
            )}
          </div>
        )}

        {/* Files */}
        {selectedTenant && (
          <div className="mt-2">
            <label className="block mb-2 font-medium">Upload Lease Files</label>
            <div className="bg-gray-700 p-4 rounded-xl">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                className="block text-white disabled:opacity-50"
                disabled={submittingFiles || completed}
                aria-label="Select one or more lease files to upload"
              />

              {/* Live per-file statuses */}
              {Object.keys(fileStatuses).length > 0 && (
                <div className="mt-4 space-y-3">
                  {fileList.map((file) => {
                    const id = fileId(file);
                    const s = fileStatuses[id] || {};
                    const isWorking = s.step && !["Done", "Error", "Ready"].includes(s.step);
                    return (
                      <div
                        key={id}
                        className="rounded-lg border border-gray-600 p-3 bg-gray-800/70"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium break-all">{s.name || file.name}</div>
                          <div
                            className={`text-xs px-2 py-1 rounded ${s.step === "Done"
                              ? "bg-green-600/30 text-green-300"
                              : s.step === "Error"
                                ? "bg-red-600/30 text-red-300"
                                : "bg-blue-600/30 text-blue-200"
                              }`}
                          >
                            {s.step || "Ready"}
                          </div>
                        </div>

                        {/* Progress bar only during Uploading */}
                        {s.step === "Uploading" && (
                          <div className="mt-2">
                            <div className="h-2 w-full bg-gray-600 rounded-full overflow-hidden">
                              <div
                                className="h-2 bg-blue-500 transition-all"
                                style={{ width: `${Math.min(s.progress || 0, 100)}%` }}
                              />
                            </div>
                            <div className="mt-1 text-xs text-gray-300">
                              {Math.min(s.progress || 0, 100)}%
                            </div>
                          </div>
                        )}

                        {/* Spinner-ish hint during non-upload working steps */}
                        {isWorking && s.step !== "Uploading" && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-gray-300">
                            <div className="animate-spin h-3 w-3 rounded-full border-2 border-gray-400 border-t-transparent" />
                            <span>{s.message || "Working…"}</span>
                          </div>
                        )}

                        {/* Messages / Errors */}
                        {(s.message && !s.error) && s.step !== "Uploading" && (
                          <div className="mt-1 text-xs text-gray-300">{s.message}</div>
                        )}
                        {s.error && (
                          <div className="mt-1 text-xs text-red-300">Error: {s.message}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit */}
        {selectedTenant && (
          <div className="pt-2">
            <button
              className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
              onClick={Submit}
              disabled={
                submittingFiles ||
                completed || // 🔐 lock after first run
                !selectedTenant ||
                !selectedProperty ||
                !selectedUnit ||
                fileList.length === 0 ||
                loadingLinks
              }
            >
              {completed
                ? "Finished"
                : submittingFiles
                  ? "Uploading…"
                  : fileList.length > 0
                    ? `Upload ${fileList.length} File${fileList.length > 1 ? "s" : ""}`
                    : "Submit"}
            </button>

            {/* Optional post-run CTA */}
            {completed && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-sm text-green-300">All done!</span>
                <button
                  className="px-4 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white"
                  onClick={() => navigate("/dashboard")}
                >
                  Go to Dashboard
                </button>
              </div>
            )}
          </div>
        )}
      </DisplayBox>
    </div>
  );
};

export default UploadLeases;
