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
import { getTenantLeaseInfo } from '../utilities/GetMessages';
import { getTableIdList } from '../utilities/supabaseCalls';
/**
 * TenantPage
 * Displays a tenant profile, related units, lease details, and previous messages.
 */
const TenantPage = () => {
  const { session, roleData } = useAuth();
  const { tenant_id } = useParams();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState(null);
  const [unitsIds, setUnits] = useState([]);
  const [contacts, setContacts] = useState([]);


  const [leaseSummary, setLeaseSummary] = useState([]);
  const [financial, setFinancial] = useState([]);
  const [responsibility, setResponsibility] = useState([])
  const [keyDates, setKeyDates] = useState([])
  const [rights, setRights] = useState([])
  const [leaseDocs, setLeaseDocs] = useState([])
  const [leaseStatus, setLeaseStatus] = useState({})
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
    if (!tenant_id) return;

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
  }, [tenant_id]);

  /**
   * Get lease documents and extract terms
   */
  useEffect(() => {
    if (!tenant_id) return
    const getLeases = async () => {
      const leases= await getTenantLeaseInfo(tenant_id)
setLeaseSummary(leases.lease_summary || []);
setFinancial(leases.financial_snapshot || []);
setResponsibility(leases.responsibility || []);
setKeyDates(leases.keyDates || []);
setRights(leases.rights || []);
setLeaseDocs(leases.lease_docs || []);

    }
    getLeases();
  }, [tenant_id]);
  useEffect(() => {
    if (!leaseDocs) return
    const getJobs = async () => {
      const leaseIds = leaseDocs.map((lease) => lease.lease_id)
      const response = await getTableIdList('Upload_Job_Status', 'lease_id', leaseIds)

      const latestStatusbyLease = response.reduce((acc, status) => {
        const leaseId = status.lease_id
        if (!acc[leaseId] || new Date(status.created_at) > new Date(acc[leaseId].created_at)) {
          acc[leaseId] = status
        }
        return acc;
      }, {})

      setLeaseStatus(latestStatusbyLease)
    }
    getJobs()
  }, [leaseDocs])
  const getSignedUrl = async (filePath) => {
    const { data, error } = await supabase.storage.from('lease-docs').createSignedUrl(filePath, 600)

    if (error) {
      console.error("Error Generating Signed URL", error)
      return null
    }
    return data.signedUrl
  }
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
          {roleData && (
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
              edit_Entity={roleData.Edit_Tenants}
            />
          )}
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
            <div className='flex items-center justify-between'>
            <h2 className="text-2xl"><u>Lease Summary</u></h2>
            <button onClick={() => navigate(`/terms/${tenant_id}`)} className='text-2xl bg-gray-700 underline'>
              View All Terms
            </button>
            </div>
            {leaseSummary.length > 0 && leaseSummary.map((item, index) => {
              const [[key, value]] = Object.entries(item);
              console.log(key)
              // ❌ Skip empty value

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
        {contacts.length > 0 && (
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
        )}
      </div>

      {/* Bottom Row: Lease Terms */}
      <div className="flex flex-row items-start items-stretch">
        <DisplayBox className="w-2/5 mr-6">
          <div>
            <h2 className="text-2xl"><u>Financial Snapshot</u></h2>
            {financial.length > 0 && financial.map((item, index) => {
              const [[key, value]] = Object.entries(item);

              // ❌ Skip empty values

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
            <h2 className="text-2xl"><u>Responsibility</u></h2>
            {responsibility.length > 0 && responsibility.map((item, index) => {
              const [[key, value]] = Object.entries(item);

              // ❌ Skip empty values

              return (
                <div key={index} className="mb-4">
                  <div className="flex flex-row items-center">
                    <h2 className="text-lg mr-2">{key}:</h2>
                    <p>{value}</p>
                  </div>
                </div>
              );
            })}
            <h2 className="text-2xl"><u>Key Dates</u></h2>
            {keyDates.length > 0 && keyDates.map((item, index) => {
              const [[key, value]] = Object.entries(item);

              // ❌ Skip empty values

              return (
                <div key={index} className="mb-4">
                  <div className="flex flex-row items-center">
                    <h2 className="text-lg mr-2">{key}:</h2>
                    <p>{value}</p>
                  </div>
                </div>
              );
            })}
            <h2 className='text-2xl underline'>Critical Rights and Options</h2>
            {rights.length > 0 && rights.map((item, index) => {
              const [[key, value]] = Object.entries(item);

              // ❌ Skip empty values

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
      </div>
      {
        leaseDocs.length > 0 && (
          <div className="flex flex-row items-start items-stretch">
            <DisplayBox className='mr-6'>
              <div>
                <h2 className="text-2xl"><u>Lease Documents</u></h2>
                {leaseDocs.map((lease) => {
                  const title = lease.lease_file_path.split('/').pop()
                  const status = leaseStatus[lease.lease_id]?.job_info.status
                  return (
                    <div className='flex overflow-x-auto justify between items-center gap-4' key={lease.lease_id}>
                      <p className='text-white underline cursor-pointer' onClick={async () => {

                        const signedUrl = await getSignedUrl(lease.lease_file_path)

                        if (signedUrl) window.open(signedUrl, '_blank');
                      }}>{title}</p>
                      <p>-</p>
                      <p>{status?.charAt(0).toUpperCase() + status?.slice(1)}</p>
                      {status === 'error' && (
                        <div className='flex overflow-x-auto justify between items-center gap-4'>
                          <p>-</p>
                          <button className='bg-gray-400' onClick={() => navigate('/upload_docs')}>Reupload</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </DisplayBox>
          </div>
        )
      }

    </div >
  );
};

export default TenantPage;
