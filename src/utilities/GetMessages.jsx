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
    const sortDate = 'lease_commencement_date'
    const byDate = (a, b) => new Date(b[sortDate]) - new Date(a[sortDate]);

    const getMostRecentField = (fieldname) => {
        return data.filter((lease) => lease[sortDate] && lease[fieldname] != null).sort(byDate)[0]?.[fieldname] ?? null
    }

    const latestMaintenance = getMostRecentField('maintenance_terms')

    const latestInsurance = getMostRecentField('insurance')

    const latestTaxes = getMostRecentField('taxes')

    const terms_Rent = [
        getMostRecentField('term'),
        getMostRecentField('current_rent'),
        getMostRecentField('rent_increase'),
        getMostRecentField('CAMS'),
        getMostRecentField('square_footage'),
        getMostRecentField('state_of_registration'),
        getMostRecentField('mailing_address'),
        getMostRecentField('effective_date'),
        getMostRecentField('execution_date'),
        getMostRecentField('document_type'),
        getMostRecentField('details'),
        getMostRecentField('lease_execution_date'),
        getMostRecentField('lease_commencement_date'),
        getMostRecentField('Property_Address'),
        getMostRecentField('suite_identifier'),
        getMostRecentField('lease_type'),
        getMostRecentField('lease_expiration_date'),
        getMostRecentField('lease_term'),
        getMostRecentField('base_rent_monthly'),
        getMostRecentField('rent_escalation'),
        getMostRecentField('security_deposit_amount'),
        getMostRecentField('base_rent_psf'),
        getMostRecentField('base_rent_annually'),
        getMostRecentField('operating_expenses_CAM_psf'),
        getMostRecentField('operating_expenses_CAM_monthly'),
        getMostRecentField('CAM_Summary'),
        getMostRecentField('property_taxes'),
        getMostRecentField('insurance_cost'),
        getMostRecentField('tenant_reimbursement'),
        getMostRecentField('rent_abatement_end'),
        getMostRecentField('rent_commmencement_date'),
        getMostRecentField('renewal_notice_deadline'),
        getMostRecentField('CAM_start_date'),
        getMostRecentField('option_exercise_deadlines'),
        getMostRecentField('renewal_options'),
        getMostRecentField('termination_rights'),
        getMostRecentField('ROFR_ROFO_clauses'),
        getMostRecentField('exclusivity_rights'),
        getMostRecentField('co_tenancy_clauses'),
        getMostRecentField('purchase_options'),
        getMostRecentField('rentable_square_footage'),
        getMostRecentField('usable_square_footage'),
        getMostRecentField('premises_description'),
        getMostRecentField('parking_allocation'),
        getMostRecentField('storage_additional_space'),
        getMostRecentField('tenant_maintenance_responsibilities'),
        getMostRecentField('landlord_maintenance_responsibilities'),
        getMostRecentField('hvac_responsibilities'),
        getMostRecentField('utility_responsibility'),
        getMostRecentField('default_and_remedies'),
        getMostRecentField('assignment_and_subletting'),
        getMostRecentField('insurance_requirements'),
        getMostRecentField('indemnity_clauses'),
        getMostRecentField('compliance_with_laws'),
        getMostRecentField('force_majeure'),
        getMostRecentField('estoppel_certificate_required'),
        getMostRecentField('signage_rights'),
        getMostRecentField('permitted_use'),
        getMostRecentField('exclusive_use_clause'),
        getMostRecentField('guarantor_information'),
        getMostRecentField('tenant_improvement_allowance'),
        getMostRecentField('holdover_terms'),
        getMostRecentField('security_access_rights'),
        getMostRecentField('landlord_work'),
        getMostRecentField('Tenant_work'),
        getMostRecentField('security_deposit_term'),
        getMostRecentField('delivery_posession_date'),
        getMostRecentField('expansion_contraction_rights')
    ]
    return {Maintenance: latestMaintenance || "", Insurance: latestInsurance || "", Taxes: latestTaxes || "", Terms: terms_Rent || []}
};
