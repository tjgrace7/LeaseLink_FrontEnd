// src/pages/UploadLeases.jsx

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../components/AuthProvider";
import { useNavigate } from "react-router-dom";

import DisplayBox from "../components/DisplayBox";
import Dropdown from "../components/dropdown";
import { supabase } from "../supabaseClient";
import Spinner from "../components/Spinner";

/**
 * UploadLeases
 * - Pick a Tenant
 * - (Auto) Pick Property & Unit if there's exactly one each, otherwise let the user select
 * - Upload one or more lease files
 * - For each file:
 *    1) Request signed URL (Edge Function)
 *    2) PUT file to Storage
 *    3) Trigger processing (Edge Function)
 *
 * Notes:
 * - We fetch Property names from `properties` table because `Property_Tenant` join rows
 *   typically won't carry display info like Property_Name.
 */

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

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  // ----------------- Fetch Tenants on Load -----------------
  useEffect(() => {
    if (!session || !userData?.company_id) return;
    let cancelled = false;

    const getTenants = async () => {
      setLoadingTenants(true);
      try {
        const { data, error } = await supabase
          .from("tenant")
          .select("*")
          .eq("property_management_id", userData.company_id);

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
  }, [session, userData?.company_id]);

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
    // Optional: basic client-side filtering
    // const allowed = incoming.filter(f => f.type === "application/pdf");
    setFileList(incoming);
  };

  // ----------------- Submit Uploads -----------------
  const Submit = useCallback(async () => {
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
      for (const file of fileList) {
        // 1) Generate Signed URL
        const res = await fetch(`${supabaseUrl}/functions/v1/generate_upload_url`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            company_id: userData.company_id,
            tenant_id: selectedTenant.tenant_id,
            property_id: selectedProperty.prop_id, // NOTE: using properties table ID
            unit_id: selectedUnit.unit_id,
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            user_id: session.user.id,
          }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(`Failed to get signed URL (${res.status}): ${errText}`);
        }

        const { signed_url, lease_file_path, bucket, error: fxError } = await res.json();
        if (fxError) throw new Error(fxError);
        if (!signed_url || !lease_file_path || !bucket) throw new Error("Edge function did not return expected fields.");

        // 2) PUT file to Storage (signed URL)
        const uploadRes = await fetch(signed_url, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text().catch(() => "");
          throw new Error(`Upload failed (${uploadRes.status}): ${errText}`);
        }

        // 3) Trigger processing
        const processRes = await fetch(`${supabaseUrl}/functions/v1/new_upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: lease_file_path,
            bucket,
          }),
        });

        if (!processRes.ok) {
          const err = await processRes.text().catch(() => "");
          throw new Error(`Processing failed (${processRes.status}): ${err}`);
        }

        console.log(`✅ File processed: ${file.name}`);
      }

      alert("🎉 All files uploaded and processing triggered.");
      navigate("/dashboard");
    } catch (err) {
      console.error("❌ Error during upload flow:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setSubmittingFiles(false);
    }
  }, [fileList, navigate, selectedProperty, selectedTenant, selectedUnit, session, supabaseUrl, userData?.company_id]);

  // ----------------- Render -----------------
  if (submittingFiles) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
        <Spinner />
      </div>
    );
  }

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
              placeholder="Select Tenant"
              getOptionId={(t) => t?.tenant_id}
              getOptionTitle={(t) => t?.Tenant_Name}
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
                placeholder="Select Unit"
                getOptionId={(u) => u?.unit_id}
                getOptionTitle={(u) => u?.address}
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
                type="file"
                multiple
                onChange={handleFileChange}
                className="block text-white"
                aria-label="Select one or more lease files to upload"
              />
              {fileList.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium mb-1">Selected Files</h3>
                  <ul className="list-disc ml-5 space-y-1 text-sm">
                    {fileList.map((file, i) => (
                      <li key={`${file.name}-${file.size}-${i}`} className="break-all">
                        {file.name}
                      </li>
                    ))}
                  </ul>
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
                !selectedTenant ||
                !selectedProperty ||
                !selectedUnit ||
                fileList.length === 0 ||
                loadingLinks
              }
            >
              {loadingLinks
                ? "Preparing…"
                : fileList.length > 0
                ? `Upload ${fileList.length} File${fileList.length > 1 ? "s" : ""}`
                : "Submit"}
            </button>
          </div>
        )}
      </DisplayBox>
    </div>
  );
};

export default UploadLeases;
