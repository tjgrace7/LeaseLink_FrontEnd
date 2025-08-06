import Profile from "../components/Profile";
import { useParams } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { supabase } from "../supabaseClient";
import Spinner from '../components/Spinner';
import DisplayBox from '../components/DisplayBox';
import { useEffect, useState } from "react";

const ContactPage = () => {
    const {contact_id} = useParams();
    const {session, userData, roleData} = useAuth();

    const [contact, setContact] = useState(null)
    const [tenants, setTenants] = useState([])
    const [tenantIds, setTenantIds] = useState([])
    
    useEffect(() => {
        if(!session || !userData) return;

        const getContacts = async () => {
            const {data, error} = await supabase.from("Contact").select("*").eq("contact_id", contact_id).single();
            if(error)
            {
                console.error("Error Fetching Contacts", error)
                return
            }
            setContact(data)
            const {data: tenantContacts, error: tenantContactErrors} = await supabase.from('Tenant_Contact').select("*").eq("contact_id", contact_id);
            if(tenantContactErrors) {
                console.error("Error Finding Related tennats", tenantContactErrors)
                return;
            }
            const tenant_Ids = tenantContacts.map((tenant) => tenant.tenant_id)
            setTenantIds(tenant_Ids)
            const {data: tenant, error: tenantErrors} = await supabase.from('tenant').select("*").in("tenant_id", tenant_Ids)
            if(tenantErrors) {
                console.error("Error Fetching Related tenants", tenantErrors);
                return;
            }
            setTenants(tenant);
        }
        getContacts();
    }, [session, userData, contact_id])
      if (!contact) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
        <Spinner />
      </div>
    );
  }
    return (
    <div className="flex justify-center items-center mt-6 flex-col">
  {/* Shared width container */}
  <div className="w-1/2 space-y-6">
    <Profile
      entity={contact}
      session={session}
      getFilePath={(c) => c.image_file_path}
      getLabel={(contact) => contact.Contact_Name}
      getRelatedEntity={async () => tenants}
      getRelatedFilePath={(t) => t?.photo_file_path}
      getRelatedLabel={(t) => t?.Tenant_Name}
      RelatedTitle="Tenant(s)"
      getRelatedEntityId={(t) => t.tenant_id}
      Title="Contact"
      getEntityId={(c) => c.contact_id}
      edit_Entity={roleData.Edit_Contact}
    />

    <DisplayBox className="space-y-4 overflow-y-auto flex flex-col justify-center items-center">
      <h2 className="underline text-4xl">Contact Info</h2>
      <p>{`Contact Type: ${contact.Contact_Type}`}</p>
      <p>{`Address: ${contact.Address}`}</p>
      <p>{`Phone: ${contact.Phone}`}</p>
      <p>{`Email: ${contact.Email}`}</p>
    </DisplayBox>
  </div>
</div>

    )
}
export default ContactPage;