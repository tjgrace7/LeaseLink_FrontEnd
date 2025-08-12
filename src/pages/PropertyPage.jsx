// src/pages/PropertyPage.jsx (refactor)
// Mobile-first, accessible, commented, and UI-polished

import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState, useCallback } from 'react';

import { supabase } from '../supabaseClient';
import { useAuth } from '../components/AuthProvider';

import EntityListBox from '../components/EntityListBox';
import Profile from '../components/Profile';
import LoadPreviousMessages from '../components/PreviousMessages';

/**
 * PropertyPage
 * ------------------------------------------------------------
 * Displays a property profile, associated units, managing owner, and chat history.
 * Improvements:
 *  - Mobile-first layout, clean spacing, consistent card styles
 *  - Minimal column selects + ordering for deterministic lists
 *  - Loading and empty states
 *  - Stable callbacks and safer effect guards to avoid re-renders
 */
const PropertyPage = () => {
  const { property_id } = useParams();
  const navigate = useNavigate();
  const { session, userData, roleData } = useAuth();

  // ——— Local state
  const [property, setProperty] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState({ property: false, units: false });
  const [error, setError] = useState({ property: '', units: '' });

  const isReady = useMemo(() => Boolean(session && property_id), [session, property_id]);

  // ——— Fetch property by id
  useEffect(() => {
    if (!isReady) return;

    const fetchProperty = async () => {
      setLoading((s) => ({ ...s, property: true }));
      setError((e) => ({ ...e, property: '' }));
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('prop_id, Property_Name, photo_file_path, owner_id')
          .eq('prop_id', property_id)
          .single();

        if (error) throw error;
        setProperty(data);
      } catch (err) {
        console.error('Error fetching property', err);
        setError((e) => ({ ...e, property: err?.message || 'Failed to load property.' }));
      } finally {
        setLoading((s) => ({ ...s, property: false }));
      }
    };

    fetchProperty();
  }, [isReady, property_id]);

  // ——— Fetch units linked to this property
  useEffect(() => {
    if (!userData || !property?.prop_id) return;

    const getUnits = async () => {
      setLoading((s) => ({ ...s, units: true }));
      setError((e) => ({ ...e, units: '' }));
      try {
        const { data, error } = await supabase
          .from('Units')
          .select('unit_id, Suite, address, square_footage, tenant_id')
          .eq('property_id', property.prop_id)
          .order('Suite', { ascending: true });

        if (error) throw error;
        setUnits(data || []);
      } catch (err) {
        console.error('No Units at Property', err);
        setError((e) => ({ ...e, units: err?.message || 'Failed to load units.' }));
      } finally {
        setLoading((s) => ({ ...s, units: false }));
      }
    };

    getUnits();
  }, [userData, property?.prop_id]);

  // ——— Navigation handler for a selected unit
  const selectUnit = useCallback((unit_id, type) => {
    // TODO: PermissionGate check
    navigate(`/${type}/${unit_id}`);
  }, [navigate]);

  // ——— Async: fetch a tenant by id (used by EntityListBox)
  const fetchTenantById = useCallback(async (tenant_id) => {
    if (!tenant_id) return null;
    const { data, error } = await supabase
      .from('tenant')
      .select('tenant_id, Tenant_Name')
      .eq('tenant_id', tenant_id)
      .single();

    if (error) {
      console.error('Error Fetching Tenant', error);
      return null;
    }
    return data;
  }, []);

  if (loading.property && !property) {
    return (
      <div className="px-4 sm:px-6 md:px-10 lg:px-16 xl:px-20 py-6 sm:py-8">
        <div className="h-32 rounded-2xl bg-white/10 animate-pulse" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="px-4 sm:px-6 md:px-10 lg:px-16 xl:px-20 py-6 sm:py-8 text-white">
        Failed to load property.
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 md:px-10 lg:px-16 xl:px-20 py-6 sm:py-8">
      {/* Property Profile + Managing Owner */}
      {roleData && (
        <Profile
          entity={property}
          session={session}
          getFilePath={(p) => p.photo_file_path}
          getLabel={(p) => p.Property_Name}
          getRelatedEntity={async (prop) => {
            if (!prop?.owner_id) return null;
            const { data, error } = await supabase
              .from('building_owner')
              .select('owner_id, owner_name, image_file_path')
              .eq('owner_id', prop.owner_id)
              .single();

            if (error) {
              console.error('Error Fetching Owner:', error);
              return null;
            }
            return data;
          }}
          getRelatedLabel={(o) => o?.owner_name}
          getRelatedFilePath={(o) => o?.image_file_path}
          getRelatedEntityId={(o) => o?.owner_id}
          RelatedTitle="Managing Owner"
          className="w-full lg:w-3/5"
          Title="Property"
          getEntityId={(e) => e.prop_id}
          edit_Entity={roleData.Edit_Properties}
        />
      )}

      {/* Units associated with this property */}
      <div className="mt-6">
        <EntityListBox
          type="units"
          entities={units}
          selectEntity={selectUnit}
          getEntityLabel={(unit) => unit.address || unit.Suite || 'Unnamed Unit'}
          getEntityId={(unit) => unit.unit_id}
          Label="Units"
          placeholder="Units"
          getSQ={(unit) => unit.square_footage}
          getSuite={(unit) => unit.Suite}
          getRelatedEntity={async (unit) => fetchTenantById(unit.tenant_id)}
          renderRelatedLabel={(tenant) => tenant?.Tenant_Name}
          loading={loading.units}
        />
        {error.units && (
          <p className="text-red-300 text-sm mt-2" role="alert">{error.units}</p>
        )}
      </div>

      {/* Previous chat history for this property */}
      <div className="mt-6">
        <LoadPreviousMessages
          entityId={property_id}
          session={session}
          entityType="property"
          className="mt-6"
          boxType="unit"
        />
      </div>
    </div>
  );
};

export default PropertyPage;