// src/pages/PropertyPage.jsx
// Mobile-first, accessible, commented, and UI-polished

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, useCallback } from "react";

import { supabase } from "../supabaseClient";
import { useAuth } from "../components/AuthProvider";

import EntityListBox from "../components/EntityListBox";
import Profile from "../components/Profile";
import LoadPreviousMessages from "../components/PreviousMessages";

const PropertyPage = () => {
  const { property_id } = useParams();
  const navigate = useNavigate();
  const { session, userData, roleData } = useAuth();

  // Local state
  const [property, setProperty] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState({ property: false, units: false });
  const [error, setError] = useState({ property: "", units: "" });

  const isReady = useMemo(() => Boolean(session && property_id), [session, property_id]);

  // Fetch property by id
  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;

    const fetchProperty = async () => {
      setLoading((s) => ({ ...s, property: true }));
      setError((e) => ({ ...e, property: "" }));
      try {
        const { data, error } = await supabase
          .from("properties")
          .select("*")
          .eq("prop_id", property_id)
          .single();

        if (error) throw error;
        if (!cancelled) setProperty(data);
      } catch (err) {
        console.error("Error fetching property", err);
        if (!cancelled)
          setError((e) => ({ ...e, property: err?.message || "Failed to load property." }));
      } finally {
        if (!cancelled) setLoading((s) => ({ ...s, property: false }));
      }
    };

    fetchProperty();
    return () => {
      cancelled = true;
    };
  }, [isReady, property_id]);

  // Fetch units linked to this property
  useEffect(() => {
    if (!userData || !property?.prop_id) return;
    let cancelled = false;

    const getUnits = async () => {
      setLoading((s) => ({ ...s, units: true }));
      setError((e) => ({ ...e, units: "" }));
      try {
        const { data, error } = await supabase
          .from("Units")
          .select("*")
          .eq("property_id", property.prop_id)
          .order("Suite", { ascending: true });

        if (error) throw error;
        if (!cancelled) setUnits(data || []);
      } catch (err) {
        console.error("No Units at Property", err);
        if (!cancelled)
          setError((e) => ({ ...e, units: err?.message || "Failed to load units." }));
      } finally {
        if (!cancelled) setLoading((s) => ({ ...s, units: false }));
      }
    };

    getUnits();
    return () => {
      cancelled = true;
    };
  }, [userData, property?.prop_id]);

  // Navigation handler for a selected unit
  const selectUnit = useCallback(
    (entity_id, type, extra_id = null, extra_type = null) => {
      if (extra_id && extra_type) {
        navigate(`/${type}/${entity_id}?${extra_type}=${extra_id}`);
      } else {
        navigate(`/${type}/${entity_id}`);
      }
    },
    [navigate]
  );

  // Async: fetch a tenant by id (used by EntityListBox)
  const fetchTenantById = useCallback(async (tenant_id) => {
    if (!tenant_id) return null;
    const { data, error } = await supabase
      .from("tenant")
      .select("*")
      .eq("tenant_id", tenant_id)
      .single();

    if (error) {
      console.error("Error Fetching Tenant", error);
      return null;
    }
    return data;
  }, []);

  // ----------- Render guards -----------
  if (loading.property && !property) {
    return (
      <div className="px-4 sm:px-6 lg:px-10 py-6">
        <div className="h-32 rounded-2xl bg-white/10 animate-pulse" />
      </div>
    );
    }

  if (!property) {
    return (
      <div className="px-4 sm:px-6 lg:px-10 py-6 text-white">
        Failed to load property.
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6">
      {/* Mobile-only back button */}
      <div className="mb-4 lg:hidden">
        <button
          onClick={() => navigate(-1)}
          className="rounded-xl bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600"
          aria-label="Go back"
        >
          ← Back
        </button>
      </div>

      {/* Top: Property Profile + Managing Owner (stacks on mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {roleData && (
            <Profile
              entity={property}
              session={session}
              getFilePath={(p) => p?.photo_file_path}
              getLabel={(p) => p?.Property_Name}
              getRelatedEntity={async (prop) => {
                if (!prop?.owner_id) return null;
                const { data, error } = await supabase
                  .from("building_owner")
                  .select("owner_id, owner_name, image_file_path")
                  .eq("owner_id", prop.owner_id)
                  .single();

                if (error) {
                  console.error("Error Fetching Owner:", error);
                  return null;
                }
                return data;
              }}
              getRelatedLabel={(o) => o?.owner_name}
              getRelatedFilePath={(o) => o?.image_file_path}
              getRelatedEntityId={(o) => o?.owner_id}
              RelatedTitle="Managing Owner"
              className="w-full"
              Title="Property"
              getEntityId={(e) => e?.prop_id}
              edit_Entity={roleData?.Edit_Properties}
              delete_Entity={roleData?.Can_Delete_Properties}
            />
          )}
        </div>

        {/* Right column remains empty on small screens; units follow below */}
        <div className="hidden lg:block" />
      </div>

      {/* Units list (full width on mobile; roomier on desktop) */}
      <section className="mt-6">
        <EntityListBox
          type="units"
          entities={units}
          selectEntity={selectUnit}
          getEntityLabel={(unit) => unit?.address || unit?.Suite || "Unnamed Unit"}
          getEntityId={(unit) => unit?.unit_id}
          Label="Units"
          placeholder="Units"
          getSQ={(unit) => unit?.square_footage}
          getSuite={(unit) => unit?.Suite}
          getRelatedEntity={async (unit) => fetchTenantById(unit?.tenant_id)}
          renderRelatedLabel={(tenant) => tenant?.Tenant_Name}
          boxType="unit"
        />
        {error.units && (
          <p className="text-red-300 text-sm mt-2" role="alert">
            {error.units}
          </p>
        )}
      </section>

    </div>
  );
};

export default PropertyPage;