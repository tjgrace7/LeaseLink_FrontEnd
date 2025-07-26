// src/pages/TenantPage.jsx

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../components/AuthProvider';
import { supabase } from '../supabaseClient';

import Spinner from '../components/Spinner';
import Profile from '../components/Profile';
import DisplayBox from '../components/DisplayBox';
import LoadPreviousMessages from '../components/PreviousMessages';
import { getLeaseDocs } from '../utilities/GetMessages';
/**
 * TenantPage
 * Displays a tenant profile, related units, lease details, and previous messages.
 */
const TenantPage = () => {
  const { session } = useAuth();
  const { tenant_id } = useParams();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState(null);
  const [unitsIds, setUnits] = useState([]);
  const [contacts, setContacts] = useState([]);


  const [maintenance, setMaintenance] = useState('');
  const [insurance, setInsurance] = useState('');
  const [taxes, setTaxes] = useState('');
  const [Terms, setTerms] = useState([])

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

  //Sets Contacts for Tenants
  useEffect(() => {
    if (!tenant_id || !session) return;
    const getContacts = async () => {

      const { data, error } = await supabase.from('Tenant_Contact').select("*").eq("tenant_id", tenant_id)
      console.log(data)
      if (error) {
        console.error("Error Fetching Contacts Related to Tenant", error)
        return;
      }

      const contactIds = data.map((c) => c.contact_id)
      const { data: contactData, error: contactError } = await supabase.from('Contact').select('*').in('contact_id', contactIds)
      if (contactError) {
        console.error("Error Fetching Contacts", contactError)
        return
      }

      setContacts(contactData);
    }
    getContacts();
  }, [session, tenant_id])
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
    if (!tenant_id) return
    const getLeases = async () => {
      const leases = await getLeaseDocs(tenant_id)
      setMaintenance(leases.Maintenance)
      setInsurance(leases.Insurance)
      setTaxes(leases.Taxes)
      setTerms(leases.terms_Rent)
    }
    getLeases();
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
            Title="Tenant"
            getEntityId={(t) => t.tenant_id}
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
        <DisplayBox className="w-2/5 mr-6 max-h-[600px] overflow-y-auto">
          <div>
            <h2 className="text-2xl"><u>Terms & Rent</u></h2>
            {Terms.map((item, index) => {
              const [[key, value]] = Object.entries(item);

              // ❌ Skip empty values
              if (!value || value == "N/A") return null;

              return (
                <div key={index} className="mb-4">
                  <div className="flex flex-row items-center">
                    <h2 className="text-lg mr-2">{key}:</h2>
                    <p>{value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </DisplayBox>

        <DisplayBox className="ml-auto w-2/5 overflow-y-auto">
          <div>
            <h2 className="text-2xl"><u>Contact Info</u></h2>
            {contacts.map((contact) => (
              <button className='flex flex-col items-start text-white hover:bg-gray-700' key={contact.contact_id} onClick={() => navigate(`/contact/${contact.contact_id}`)}>
                <div className='mb-4'>
                  <div className='flex flex-row items-center'>
                    <h2 className='text-lg mr-2'>Name:</h2>
                    <p>{contact.Contact_Name}</p>
                  </div>
                  <div className='flex flex-row items-center'>
                    <h3 className='text-md mr-2'>Type:</h3>
                    <p>{contact.Contact_Type}</p>
                  </div>
                  <div className='flex flex-row items-center'>
                    <h3 className='text-md mr-2'>Phone:</h3>
                    <p>{contact.Phone}</p>
                  </div>
                  <div className='flex flex-row items-center'>
                    <h3 className='text-md mr-2'>Email:</h3>
                    <p>{contact.Email}</p>
                  </div>
                  <div className='flex flex-row items-center'>
                    <h3 className='text-md mr-2'>Address:</h3>
                    <p>{contact.Address}</p>
                  </div>
                </div>
              </button>
            )
            )}
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
