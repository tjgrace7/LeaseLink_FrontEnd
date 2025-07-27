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
    const generalLiability = getMostRecentField('general_liability')
    const latestTaxes = getMostRecentField('taxes')

    const terms_Rent = [
        { "Term": getMostRecentField('term') },
        { "Current Rent": getMostRecentField('current_rent') },
        { "Rent Increase": getMostRecentField('rent_increase') },
        { "CAMS": getMostRecentField('CAMS') },
        { "Square Footage": getMostRecentField('square_footage') },
        { "State of Registration": getMostRecentField('state_of_registration') },
        { "Mailing Address": getMostRecentField('mailing_address') },
        { "Effective Date": getMostRecentField('effective_date') },
        { "Execution Date": getMostRecentField('execution_date') },
        { "Document Type": getMostRecentField('document_type') },
        { "Details": getMostRecentField('details') },
        { "Lease Execution Date": getMostRecentField('lease_execution_date') },
        { "Lease Commencement Date": getMostRecentField('lease_commencement_date') },
        { "Property Address": getMostRecentField('Property_Address') },
        { "Suite Identifier": getMostRecentField('suite_identifier') },
        { "Lease Type": getMostRecentField('lease_type') },
        { "Lease Expiration Date": getMostRecentField('lease_expiration_date') },
        { "Lease Term": getMostRecentField('lease_term') },
        { "Base Rent Monthly": getMostRecentField('base_rent_monthly') },
        { "Rent Escalation": getMostRecentField('rent_escalation') },
        { "Security Deposit Amount": getMostRecentField('security_deposit_amount') },
        { "Base Rent PSF": getMostRecentField('base_rent_psf') },
        { "Base Rent Annually": getMostRecentField('base_rent_annually') },
        { "Operating Expenses CAM PSF": getMostRecentField('operating_expenses_CAM_psf') },
        { "Operating Expenses CAM Monthly": getMostRecentField('operating_expenses_CAM_monthly') },
        { "CAM Summary": getMostRecentField('CAM_Summary') },
        { "Property Taxes": getMostRecentField('property_taxes') },
        { "Insurance Cost": getMostRecentField('insurance_cost') },
        { "Tenant Reimbursement": getMostRecentField('tenant_reimbursement') },
        { "Rent Abatement End": getMostRecentField('rent_abatement_end') },
        { "Rent Commencement Date": getMostRecentField('rent_commmencement_date') },
        { "Renewal Notice Deadline": getMostRecentField('renewal_notice_deadline') },
        { "CAM Start Date": getMostRecentField('CAM_start_date') },
        { "Option Exercise Deadlines": getMostRecentField('option_exercise_deadlines') },
        { "Renewal Options": getMostRecentField('renewal_options') },
        { "Termination Rights": getMostRecentField('termination_rights') },
        { "ROFR/ROFO Clauses": getMostRecentField('ROFR_ROFO_clauses') },
        { "Exclusivity Rights": getMostRecentField('exclusivity_rights') },
        { "Co-Tenancy Clauses": getMostRecentField('co_tenancy_clauses') },
        { "Purchase Options": getMostRecentField('purchase_options') },
        { "Rentable Square Footage": getMostRecentField('rentable_square_footage') },
        { "Usable Square Footage": getMostRecentField('usable_square_footage') },
        { "Premises Description": getMostRecentField('premises_description') },
        { "Parking Allocation": getMostRecentField('parking_allocation') },
        { "Storage/Additional Space": getMostRecentField('storage_additional_space') },
        { "Tenant Maintenance Responsibilities": getMostRecentField('tenant_maintenance_responsibilities') },
        { "Landlord Maintenance Responsibilities": getMostRecentField('landlord_maintenance_responsibilities') },
        { "HVAC Responsibilities": getMostRecentField('hvac_responsibilities') },
        { "Utility Responsibility": getMostRecentField('utility_responsibility') },
        { "Default and Remedies": getMostRecentField('default_and_remedies') },
        { "Assignment and Subletting": getMostRecentField('assignment_and_subletting') },
        { "Insurance Requirements": getMostRecentField('insurance_requirements') },
        { "Indemnity Clauses": getMostRecentField('indemnity_clauses') },
        { "Force Majeure": getMostRecentField('force_majeure') },
        { "Estoppel Certificate Required": getMostRecentField('estoppel_certificate_required') },
        { "Signage Rights": getMostRecentField('signage_rights') },
        { "Permitted Use": getMostRecentField('permitted_use') },
        { "Exclusive Use Clause": getMostRecentField('exclusive_use_clause') },
        { "Guarantor Information": getMostRecentField('guarantor_information') },
        { "Tenant Improvement Allowance": getMostRecentField('tenant_improvement_allowance') },
        { "Holdover Terms": getMostRecentField('holdover_terms') },
        { "Security Access Rights": getMostRecentField('security_access_rights') },
        { "Landlord Work": getMostRecentField('landlord_work') },
        { "Tenant Work": getMostRecentField('Tenant_work') },
        { "Security Deposit Term": getMostRecentField('security_deposit_term') },
        { "Delivery/Possession Date": getMostRecentField('delivery_posession_date') },
        { "Expansion/Contraction Rights": getMostRecentField('expansion_contraction_rights') }

    ];
    const leaseDocs = data
    return { Maintenance: latestMaintenance || "", Insurance: latestInsurance || "", Taxes: latestTaxes || "", terms_Rent, leaseDocs, Liability: generalLiability || "" }
};
