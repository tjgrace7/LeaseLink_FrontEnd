import { supabase } from "../supabaseClient";


const supabase_url = import.meta.env.VITE_SUPABASE_URL;
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
    const data = await getLeaseInfo(tenant_id)

    const getMostRecentField = (fieldname) => {
        let value;

        if (data.length > 1) {
            const sortDate = 'lease_commencement_date';
            const byDate = (a, b) => new Date(b[sortDate]) - new Date(a[sortDate]);
            value = data
                .filter((lease) => lease[sortDate] && lease[fieldname] != null)
                .sort(byDate)[0]?.[fieldname] ?? null;
        } else {
            value = data[0][fieldname];
        }

        // ✅ If value is a JSON-like string, reformat it
        if (typeof value === "string" && value.startsWith("{") && value.endsWith("}")) {
            value = value
                .slice(1, -1)           // remove the { and }
                .split(",")             // split by comma
                .map(item => item.trim())
                .join("\n");             // join with newline
        }

        return value;
    };
    const basic_lease = [
        { "Lease Execution Date": getMostRecentField('lease_execution_date') },
        { "Lease Commencement Date": getMostRecentField('lease_commencement_date') },
        { "Delivery/Possession Date": getMostRecentField('delivery_posession_date') },
        { "Lease Expiration Date": getMostRecentField('lease_expiration_date') },
        { "Lease Term": getMostRecentField('lease_term') },
        { "Suite Identifier": getMostRecentField('suite_identifier') },
        { "Property Address": getMostRecentField('Property_Address') },
        { "Premises Description": getMostRecentField('premises_description') },
        { "Permitted Use": getMostRecentField('permitted_use') },
        { "Rentable Square Footage": getMostRecentField('rentable_square_footage') },
        { "Usable Square Footage": getMostRecentField('usable_square_footage') },
        { "Parking Allocation": getMostRecentField('parking_allocation') },
        { "Storage/Additional Space": getMostRecentField('storage_additional_space') },
    
    ]

    const rent = [
        { "Base Rent Monthly": getMostRecentField('base_rent_monthly') },
        { "Base Rent Annually": getMostRecentField('base_rent_annually') },
        { "Base Rent PSF": getMostRecentField('base_rent_psf') },
        { "Operating Expenses CAM Monthly": getMostRecentField('operating_expenses_CAM_monthly') },
        { "Operating Expenses CAM PSF": getMostRecentField('operating_expenses_CAM_psf') },
        { "CAM Start Date": getMostRecentField('CAM_start_date') },
        { "CAM Summary": getMostRecentField('CAM_Summary') },
        { "Rent Escalation": getMostRecentField('rent_escalation') },
        { "Rent Commencement Date": getMostRecentField('rent_commmencement_date') },
        { "Rent Abatement End": getMostRecentField('rent_abatement_end') },
        { "Security Deposit Amount": getMostRecentField('security_deposit_amount') },
        { "Security Deposit Term": getMostRecentField('security_deposit_term') },
        { "Tenant Improvement Allowance": getMostRecentField('tenant_improvement_allowance') },
    ]
    const expense = [
         { "Property Taxes": getMostRecentField('property_taxes') },
         { "Insurance Cost": getMostRecentField('insurance_cost') },
         { "Tenant Reimbursement": getMostRecentField('tenant_reimbursement') },
         { "Utility Responsibility": getMostRecentField('utility_responsibility') },
         { "HVAC Responsibilities": getMostRecentField('hvac_responsibilities') },
         { "Tenant Maintenance Responsibilities": getMostRecentField('tenant_maintenance_responsibilities') },
        { "Landlord Maintenance Responsibilities": getMostRecentField('landlord_maintenance_responsibilities') },
    ]
    const legal = [
        { "Indemnity Clauses": getMostRecentField('indemnity_clauses') },
        { "Insurance Requirements": getMostRecentField('insurance_requirements') },
        {"Property Insurance": getMostRecentField('property_insurance')},
         { "Default and Remedies": getMostRecentField('default_and_remedies') },
         { "Force Majeure": getMostRecentField('force_majeure') },
         { "Estoppel Certificate Required": getMostRecentField('estoppel_certificate_required') },
         { "Assignment and Subletting": getMostRecentField('assignment_and_subletting') },
         { "Guarantor Information": getMostRecentField('guarantor_information') },
         { "Security Access Rights": getMostRecentField('security_access_rights') },
    ]
    const options = [
        { "Renewal Options": getMostRecentField('renewal_options') },
        { "Option Exercise Deadlines": getMostRecentField('option_exercise_deadlines') },
        { "Holdover Terms": getMostRecentField('holdover_terms') },
        { "ROFR/ROFO Clauses": getMostRecentField('ROFR_ROFO_clauses') },
        { "Purchase Options": getMostRecentField('purchase_options') },
    ]
    const special = [
        { "Exclusivity Rights": getMostRecentField('exclusivity_rights') },
        { "Exclusive Use Clause": getMostRecentField('exclusive_use_clause') },
        { "Signage Rights": getMostRecentField('signage_rights') },
        { "Co-Tenancy Clauses": getMostRecentField('co_tenancy_clauses') },
        { "Expansion/Contraction Rights": getMostRecentField('expansion_contraction_rights') },
        { "Termination Rights": getMostRecentField('termination_rights') },
    ]
    const landlord = [
        { "Landlord Work": getMostRecentField('landlord_work') },
        { "Tenant Work": getMostRecentField('Tenant_work') },
    ]

    const leaseDocs = data
    return { 'basic_lease': basic_lease, 'rent': rent  || "", 'expense': expense || "", legal: legal || "", 'options': options, 'special': special, landlord: landlord || "" }
};

const getLeaseInfo = async (tenant_id) => {
    const { data, error } = await supabase
        .from('lease_documents')
        .select('*')
        .eq('tenant_id', tenant_id);


    if (error) {
        console.error('No Tenant Docs', error);
        return;
    }
    return data
}

export const getTenantLeaseInfo = async (tenant_id) => {

    const data = await getLeaseInfo(tenant_id)
    const getMostRecentField = (fieldname) => {
        let value;

        if (data.length > 1) {
            const sortDate = 'lease_commencement_date';
            const byDate = (a, b) => new Date(b[sortDate]) - new Date(a[sortDate]);
            value = data
                .filter((lease) => lease[sortDate] && lease[fieldname] != null)
                .sort(byDate)[0]?.[fieldname] ?? null;
        } else {
            value = data[0][fieldname];
        }

        // ✅ If value is a JSON-like string, reformat it
        if (typeof value === "string" && value.startsWith("{") && value.endsWith("}")) {
            value = value
                .slice(1, -1)           // remove the { and }
                .split(",")             // split by comma
                .map(item => item.trim())
                .join("\n");             // join with newline
        }

        return value;
    };
    const lease_summary = [
        { "Lease Commencement Date": getMostRecentField('lease_commencement_date') },
        { "Lease Expiration Date": getMostRecentField('lease_expiration_date') },
        { "Lease Term": getMostRecentField('lease_term') },
        { "Suite Identifier": getMostRecentField('suite_identifier') },
        { "Property Address": getMostRecentField('Property_Address') },
    ]
    const financial_snapshot = [
        { "Base Rent Monthly": getMostRecentField('base_rent_monthly') },
        { "Operating Expenses CAM Monthly": getMostRecentField('operating_expenses_CAM_monthly') },
        { "Rent Escalation": getMostRecentField('rent_escalation') },
        { "Security Deposit Amount": getMostRecentField('security_deposit_amount') },
    ]
    const responsibility = [
        { "Tenant Maintenance Responsibilities": getMostRecentField('tenant_maintenance_responsibilities') },
        { "Landlord Maintenance Responsibilities": getMostRecentField('landlord_maintenance_responsibilities') },
        { "Property Taxes": getMostRecentField('property_taxes') },
        { "Insurance Requirements": getMostRecentField('insurance_requirements') },
        {"Property Insurance": getMostRecentField('property_insurance')}
    ]
    const keyDates = [
        { "Rent Commencement Date": getMostRecentField('rent_commencement_date') },
        { "Rent Abatement End": getMostRecentField('rent_abatement_end') },
        { "Option Exercise Deadlines": getMostRecentField('option_exercise_deadlines') },
    ]
    const rights = [
        { "Renewal Options": getMostRecentField('renewal_options') },
        { "Termination Rights": getMostRecentField('termination_rights') },
        { "Exclusivity Rights": getMostRecentField('exclusivity_rights') },
        { "Expansion/Contraction Rights": getMostRecentField('expansion_contraction_rights') }
    ];
    const lease_docs = data
    return {'lease_summary':lease_summary, 'financial_snapshot': financial_snapshot, 'responsibility': responsibility, 'keyDates': keyDates, 'rights': rights, 'lease_docs': lease_docs}
}