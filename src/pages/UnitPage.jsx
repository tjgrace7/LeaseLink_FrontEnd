// src/pages/UnitPage.jsx

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../components/AuthProvider";

import Spinner from "../components/Spinner";
import Profile from "../components/Profile";
import DisplayBox from "../components/DisplayBox";
import PreviousMessages from "../components/PreviousMessages";

/**
 * Small helpers
 */
const SectionTitle = ({ children }) => (
  <h2 className="text-xl sm:text-2xl underline mb-3">{children}</h2>
);

const EmptyState = ({ title, hint }) => (
  <div className="text-sm text-gray-300 w-full text-left cursor-pointer hover:bg-gray-700 p-3 rounded-xl">
    <p className="font-medium">{title}</p>
    {hint && <p className="opacity-80">{hint}</p>}
  </div>
);

/**
 * UnitPage
 * Displays a unit profile, related property, current & past tenants, and previous messages.
 */
const UnitPage = () => {
  const { unit_id } = useParams();
  const { session, roleData } = useAuth();
  const navigate = useNavigate();

  // Core data
  const [unit, setUnit] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [currentTenant, setCurrentTenant] = useState(null);

  // Loading flags
  const [loadingUnit, setLoadingUnit] = useState(true);
  const [loadingTenants, setLoadingTenants] = useState(true);

  /**
   * Fetch unit details by ID
   */
  useEffect(() => {
    if (!session || !unit_id) return;

    let cancelled = false;
    const fetchUnit = async () => {
      setLoadingUnit(true);
      try {
        const { data, error } = await supabase
          .from("Units")
          .select("*")
          .eq("unit_id", unit_id)
          .single();
        if (error) throw error;
        if (!cancelled) setUnit(data || null);
      } catch (err) {
        console.error("Error fetching unit", err);
        if (!cancelled) setUnit(null);
      } finally {
        if (!cancelled) setLoadingUnit(false);
      }
    };

    fetchUnit();
    return () => {
      cancelled = true;
    };
  }, [session, unit_id]);

  /**
   * Fetch all tenants who have ever leased the unit.
   * This depends on knowing the unit (for currentTenant separation),
   * so we run after the unit finishes loading.
   */
  useEffect(() => {
    if (!unit_id || loadingUnit) return;

    let cancelled = false;
    const getTenants = async () => {
      setLoadingTenants(true);
      try {
        // Join rows for this unit
        const { data: joinData, error: joinError } = await supabase
          .from("Tenant_Unit")
          .select("*")
          .eq("unit_id", unit_id);

        if (joinError) throw joinError;

        const tenantIds = (joinData || [])
          .filter((row) => row && row.tenant_id != null)
          .map((row) => row.tenant_id);

        if (tenantIds.length === 0) {
          if (!cancelled) {
            setTenants([]);
            setCurrentTenant(null);
          }
          return;
        }

        // Pull all tenant rows in a single call
        const { data: tenantData, error: tenantError } = await supabase
          .from("tenant")
          .select("*")
          .in("tenant_id", tenantIds);

        if (tenantError) throw tenantError;

        const current = tenantData?.find((t) => t?.tenant_id === unit?.tenant_id) || null;
        const previous = (tenantData || []).filter((t) => t?.tenant_id !== unit?.tenant_id);

        if (!cancelled) {
          setCurrentTenant(current);
          setTenants(previous);
        }
      } catch (err) {
        console.error("Error loading tenants for unit", err);
        if (!cancelled) {
          setCurrentTenant(null);
          setTenants([]);
        }
      } finally {
        if (!cancelled) setLoadingTenants(false);
      }
    };

    getTenants();
    return () => {
      cancelled = true;
    };
  }, [unit_id, unit, loadingUnit]);

  /**
   * Navigate to tenant profile
   */
  const tenantSelect = useCallback(
    (tenantId) => {
      if (!tenantId) return;
      navigate(`/tenant/${tenantId}`);
    },
    [navigate]
  );

  const isLoading = loadingUnit || !unit;

  if (isLoading) {
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
      </div>

      {/* Top: Unit profile & Property (left) + Tenants (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unit profile & related property */}

          <Profile
            entity={unit}
            session={session}
            getFilePath={(u) => u?.photo_file_path}
            getLabel={(u) => u?.address}
            getRelatedEntity={async () => {
              if (!unit?.property_id) return null;
              const { data, error } = await supabase
                .from("properties")
                .select("*")
                .eq("prop_id", unit.property_id)
                .single();
              if (error) {
                console.error("Error fetching property", error);
                return null;
              }
              return data;
            }}
            getRelatedFilePath={(property) => property?.photo_file_path}
            getRelatedLabel={(property) => property?.Property_Name}
            RelatedTitle="Property"
            getRelatedEntityId={(property) => property?.prop_id}
            Title="Unit"
            getEntityId={(u) => u?.unit_id}
            edit_Entity={roleData?.Edit_Units}
            delete_Entity={roleData?.Can_Delete_Units}
          />

        {/* Tenants list */}
        <DisplayBox className="w-full gap-12">

          {/* Current Tenant */}
          <div className="mb-5">
            <h3 className="text-lg font-medium mb-2">Current Tenant</h3>
            {loadingTenants ? (
              <div className="py-2 text-sm text-gray-300">Loading current tenant…</div>
            ) : currentTenant ? (
              <button
                className="w-full text-left cursor-pointer hover:bg-gray-700 p-3 rounded-xl"
                onClick={() => tenantSelect(currentTenant.tenant_id)}
              >
                {currentTenant.Tenant_Name}
              </button>
            ) : (
              <EmptyState title="No current tenant on record." />
            )}
          </div>

          {/* Previous Tenants */}
          <div>
            <h3 className="text-lg font-medium mb-2">Previous Tenants</h3>
            {loadingTenants ? (
              <div className="py-2 text-sm text-gray-300">Loading previous tenants…</div>
            ) : tenants?.length ? (
              <div className="flex flex-col gap-2">
                {tenants.map((t) => (
                  <button
                    key={t?.tenant_id}
                    className="w-full text-left cursor-pointer hover:bg-gray-700 p-3 rounded-xl"
                    onClick={() => tenantSelect(t?.tenant_id)}
                  >
                    {t?.Tenant_Name}
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState title="No previous tenants found." />
            )}
          </div>
        </DisplayBox>
      </div>

    </div>
  );
};

export default UnitPage;
