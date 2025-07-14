// src/pages/TenantPage.jsx

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { useAuth } from '../components/AuthProvider';
import { supabase } from '../supabaseClient';

import Spinner from '../components/Spinner';
import Profile from '../components/Profile';
import DisplayBox from '../components/DisplayBox';
import LoadPreviousMessages from '../components/PreviousMessages';

/**
 * TenantPage
 * Displays a tenant profile, related units, lease details, and previous messages.
 */
const TenantPage = () => {
  const { session } = useAuth();
  const { tenant_id } = useParams();

  const [tenant, setTenant] = useState(null);
  const [unitsIds, setUnits] = useState([]);

  const [maintenance, setMaintenance] = useState('');
  const [insurance, setInsurance] = useState('');
  const [taxes, setTaxes] = useState('');

  /**
   * Fetch tenant by ID
   */
  useEffect(() => {
    if (!session || !tenant_id) return;

    const fetchTenant = async () => {
      const { data, error } = await supabase
        .from('tenant')
        .select('*')
        .eq('tenant_id', tenant_id)
        .single();

      if (error) {
        console.error('Error Fetching Tenant', error);
      } else {
        setTenant(data);
      }
    };

    fetchTenant();
  }, [session, tenant_id]);

  /**
   * Get all units linked to this tenant
   */
  useEffect(() => {
    if (!tenant) return;

    const getUnits = async () => {
      const { data, error } = await supabase
        .from('Tenant_Unit')
        .select('*')
        .eq('tenant_id', tenant_id);

      if (error) {
        console.error('Error Fetching Units for Tenant', error);
        return;
      }

      setUnits(data.map((row) => row.unit_id));
    };

    getUnits();
  }, [tenant, tenant_id]);

  /**
   * Get lease documents and extract terms
   */
  useEffect(() => {
    if (!tenant_id) return;

    const getLeaseDocs = async () => {
      const { data, error } = await supabase
        .from('lease_documents')
        .select('*')
        .eq('tenant_id', tenant_id);

      if (error) {
        console.error('No Tenant Docs', error);
        return;
      }

      const byDate = (a, b) => new Date(b.effective_date) - new Date(a.effective_date);

      const latestMaintenance = data
        .filter((lease) => lease.effective_date && lease.maintenance_terms !== null)
        .sort(byDate)[0]?.maintenance_terms;

      const latestInsurance = data
        .filter((lease) => lease.effective_date && lease.insurance !== null)
        .sort(byDate)[0]?.insurance;

      const latestTaxes = data
        .filter((lease) => lease.effective_date && lease.taxes !== null)
        .sort(byDate)[0]?.taxes;

      setMaintenance(latestMaintenance || '');
      setInsurance(latestInsurance || '');
      setTaxes(latestTaxes || '');
    };

    getLeaseDocs();
  }, [tenant_id]);

  if (!tenant) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="p-20">
      {/* Top Row: Profile + Messages */}
      <div className="flex flex-row items-start items-stretch pb-10">
        <div>
          <Profile
            entity={tenant}
            session={session}
            getFilePath={(t) => t.photo_file_path}
            getLabel={(t) => t.Tenant_Name}
            getRelatedEntity={async () => {
              const { data, error } = await supabase
                .from('Units')
                .select('*')
                .in('unit_id', unitsIds);

              if (error) {
                console.error('Error Fetching Units', error);
              }

              return data || [];
            }}
            getRelatedFilePath={(unit) => unit?.photo_file_path}
            getRelatedLabel={(unit) => unit?.address}
            RelatedTitle="Unit(s)"
            getRelatedEntityId={(unit) => unit.unit_id}
          />
        </div>

        <div className="w-2/5 ml-auto max-h-[32rem] overflow-y-auto">
          <LoadPreviousMessages
            entityId={tenant_id}
            session={session}
            entityType="tenant"
          />
        </div>
      </div>

      {/* Mid Row: Placeholder Sections */}
      <div className="flex flex-row items-start items-stretch pb-10">
        <DisplayBox className="w-2/5 mr-6">
          <div>
            <h2 className="text-2xl"><u>Terms & Rent</u></h2>
            <p>Jayton this section will take some work. I'm gonna get the app running for now.</p>
          </div>
        </DisplayBox>

        <DisplayBox className="ml-auto w-2/5 overflow-y-auto">
          <div>
            <h2 className="text-2xl"><u>Contact Info</u></h2>
            <p>We will also need to decide what goes here. Canva has me a little confused. Cause I don't get leases that well</p>
            <p>Are these different people who we contact and is the info in the leases or will we have to manually upload</p>
          </div>
        </DisplayBox>
      </div>

      {/* Bottom Row: Lease Terms */}
      <div className="flex flex-row items-start items-stretch">
        <DisplayBox className="w-2/5 mr-6">
          <div>
            <h2 className="text-2xl"><u>Maintenance</u></h2>
            <p>{maintenance}</p>
          </div>
        </DisplayBox>

        <DisplayBox className="ml-auto w-2/5 overflow-y-auto">
          <div>
            <h2 className="text-2xl"><u>Taxes</u></h2>
            <p>{taxes}</p>
            <h2 className="text-2xl"><u>Insurance</u></h2>
            <p>{insurance}</p>
          </div>
        </DisplayBox>
      </div>
    </div>
  );
};

export default TenantPage;
