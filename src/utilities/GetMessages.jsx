import { supabase } from "../supabaseClient";

//When an entity is selected from the Search Bar. This function calls supabase edge function entity-session-organizer to get all previous chat sessions for that entity
export const getPreviousChats = async (entityId, session, setChats) => {
    const supabase_url = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabase_url}/functions/v1/entity-session-organizer?entity_id=${entityId}`,
        {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        })

    const data = await response.json();
    if (data === null) {
        setChats("No Previous Chats Available");
    }
    else {
        setChats(data.sessions)
    }
}
export const getCompanyPreviousChats = async (company_id, session, setChats) => {
    const supabase_url = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabase_url}/functions/v1/company_recent_chats?company_id=${company_id}`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }

        })
    const data = await response.json();
    if (data === null) {
        setChats("No Previous Chats Available");
    }
    else {
        setChats(data.sessions)
    }
}

export const getLeaseDocs = async (tenant_id) => {
    console.log(tenant_id)
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

    return {Maintenance: latestMaintenance || "", Insurance: latestInsurance || "", Taxes: latestTaxes || ""}
};
