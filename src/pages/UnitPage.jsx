// src/pages/UnitPage.jsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../components/AuthProvider';

import Spinner from '../components/Spinner';
import Profile from '../components/Profile';
import DisplayBox from '../components/DisplayBox';
import PreviousMessages from '../components/PreviousMessages';

/**
 * UnitPage
 * Displays a unit profile, related property, current & past tenants, and previous messages.
 */
const UnitPage = () => {
  const [unit, setUnit] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [currentTenant, setCurrentTenant] = useState(null);

  const { unit_id } = useParams();
  const { session, roleData } = useAuth();
  const navigate = useNavigate();

  /**
   * Fetch unit details by ID
   */
  useEffect(() => {
    if (!session || !unit_id) return;

    const fetchUnit = async () => {
      const { data, error } = await supabase
        .from('Units')
        .select('*')
        .eq('unit_id', unit_id)
        .single();

      if (error) {
        console.error('Error Fetching Unit', error);
      } else {
        setUnit(data);
      }
    };

    fetchUnit();
  }, [session, unit_id]);

  /**
   * Fetch all tenants who have ever leased the unit
   */
  useEffect(() => {
    if (!unit) return;

    const getTenants = async () => {
      const { data: joinData, error: joinError } = await supabase
        .from('Tenant_Unit')
        .select('*')
        .eq('unit_id', unit_id);

      if (joinError) {
        console.error('Error loading tenant relationships', joinError);
        return;
      }

      const tenantIds = joinData.filter((row) => row && row.tenant_id != null).map((row) => row.tenant_id);

      if (tenantIds.length === 0) return;

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenant')
        .select('*')
        .in('tenant_id', tenantIds);

      if (tenantError) {
        console.error('Error loading tenants', tenantError);
      } else {
        const TenantSet = tenantData.filter((tenant) => tenant.tenant_id !== unit.tenant_id)
        const curtenant = tenantData.find((tenant) => tenant.tenant_id === unit.tenant_id)
        setTenants(TenantSet);
        setCurrentTenant(curtenant)
      }
    };

    getTenants();
  }, [unit]);



  /**
   * Navigate to tenant profile
   */
  const tenantSelect = (tenant_id) => {
    console.log('Selected tenant:', tenant_id);
    navigate(`/tenant/${tenant_id}`);
  };

  if (!unit) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="p-20">
      <div className="flex flex-row items-start items-stretch">
        {/* Left: Unit profile with related property */}
        <div>
          <Profile
            entity={unit}
            session={session}
            getFilePath={(u) => u.photo_file_path}
            getLabel={(u) => u.address}
            getRelatedEntity={async () => {
              const { data, error } = await supabase
                .from('properties')
                .select('*')
                .eq('prop_id', unit.property_id)
                .single();

              if (error) {
                console.error('Error Fetching Property:', error);
              }

              return data;
            }}
            getRelatedFilePath={(property) => property?.photo_file_path}
            getRelatedLabel={(property) => property?.Property_Name}
            RelatedTitle="Property"
            getRelatedEntityId={(property) => property.prop_id}
            Title="Unit"
            getEntityId={(u) => u.unit_id}
            edit_Entity={roleData.Edit_Units}
          />
        </div>

        {/* Right: Tenants */}
        {(tenants.length > 0 || currentTenant) && (
          <DisplayBox className="ml-auto overflow-y-auto w-2/5">
            <div className="flex flex-col">
              {/* Current Tenant */}
              {currentTenant && (
                <div>
                  <h1>
                    <u>Current Tenant</u>
                  </h1>
                  <button
                    className="cursor-pointer hover:bg-[#3a3a3d] p-2 rounded text-left"
                    onClick={() => tenantSelect(currentTenant.tenant_id)}
                  >
                    {currentTenant.Tenant_Name}
                  </button>
                </div>
              )}

              {/* Previous Tenants */}
              {tenants.length > 0 && (
                <div className="mt-4">
                  <h2>
                    <u>Previous Tenants</u>
                  </h2>
                  <div className="flex flex-col overflow-y-auto space-y-2 pr-2">
                    {tenants.map((tenant) => (
                      <button
                        key={tenant.tenant_id}
                        className="cursor-pointer hover:bg-[#3a3a3d] p-2 rounded text-left"
                        onClick={() => tenantSelect(tenant.tenant_id)}
                      >
                        {tenant.Tenant_Name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DisplayBox>
        )}
      </div>

      {/* Previous Chat Sessions */}
      <div className="mt-20">
        <PreviousMessages entityId={unit_id} session={session} entityType="unit" />
      </div>
    </div>
  );
};

export default UnitPage;
