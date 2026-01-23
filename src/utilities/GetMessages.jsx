import { supabase } from "../supabaseClient";
import { ExtractionModal } from "../components/Modal";
import { ExternalLink } from "lucide-react";

const supabase_url = import.meta.env.VITE_SUPABASE_URL;

/* --------------------------------- Helpers --------------------------------- */

export const parseUSDate = (s) => {
    if (!s || typeof s !== "string") return "";

    const str = s.trim();

    let year, month, day;

    // ISO format: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [y, m, d] = str.split("-");
        year = Number(y);
        month = Number(m);
        day = Number(d);
    }
    // US format: MM/DD/YYYY or MM/DD/YY
    else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str)) {
        const [m, d, yRaw] = str.split("/").map((x) => x.trim());
        year = Number(yRaw);
        month = Number(m);
        day = Number(d);
        if (year < 100) year += 2000;
    } else {
        // Unknown format → return original
        return s;
    }

    if (
        !Number.isFinite(year) ||
        !Number.isFinite(month) ||
        !Number.isFinite(day)
    ) {
        return s;
    }

    // Zero-pad for display
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");

    return `${mm}/${dd}/${year}`;
};




/**
 * Accepts a rent_escalation value that may be:
 *  - an array like: [{ period:"MM/DD/YY-MM/DD/YY", amount: 1234.56 }, ...]
 *  - a JSON string of the above
 *  - any other string/format — returned unchanged
 *
 * Returns:
 *  - "MM/DD/YY-MM/DD/YY — $X,XXX.XX" for the next future escalation (start >= today)
 *  - "No further rent escalation" if none remain
 *  - the original value if unrecognized format
 */


/* ---------------------------- Supabase fetchers ---------------------------- */

export const getPreviousChats = async (entityId, session, setChats) => {
    const response = await fetch(
        `${supabase_url}/functions/v1/entity-session-organizer?entity_id=${encodeURIComponent(entityId)}`,
        {
            method: "GET",
            headers: { Authorization: `Bearer ${session.access_token}` },
        }
    );

    const data = await response.json();
    if (!data) {
        setChats("No Previous Chats Available");
    } else {
        setChats(data.sessions);
    }
};

export const getCompanyPreviousChats = async (company_id, session, setChats) => {
    const response = await fetch(
        `${supabase_url}/functions/v1/company_recent_chats?company_id=${encodeURIComponent(company_id)}`,
        {
            method: "GET",
            headers: { Authorization: `Bearer ${session.access_token}` },
        }
    );

    const data = await response.json();
    if (!data) {
        setChats("No Previous Chats Available");
    } else {
        setChats(data.sessions);
    }
};

const getLeaseInfo = async (tenant_id, unit_id = null) => {
    if (!unit_id) {
        const { data, error } = await supabase
            .from("Lease_Extractions")
            .select("*")
            .eq("tenant_id", tenant_id)
            .eq('Is_Current', true).single();


        if (error) {
            console.error("No Tenant Docs", error);
            return [];
        }
        return data
    }
    else {
        const { data, error } = await supabase
            .from("Lease_Extractions")
            .select("*")
            .eq("tenant_id", tenant_id)
            .eq('unit_id', unit_id)
            .eq('Is_Current', true);


        if (error) {
            console.error("No Tenant Docs", error);
            return [];
        }
        return data
    }
};
const moneyToNumber = (s) => {
    if (!s || typeof s !== "string") return null;
    const negative = s.includes("(") && s.includes(")");
    const cleaned = s.replace(/[^0-9.]+/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? (negative ? -n : n) : null;
};


export const parseFutureRents = (futureValue) => {
    if (!futureValue || typeof futureValue !== "string") return [];

    return futureValue
        .split(";")
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .map((chunk) => {
            // supports "YYYY-MM-DD: $2,438.73"
            const [datePart, moneyPart] = chunk.split(":").map((x) => x.trim());
            const monthly = moneyToNumber(moneyPart);
            const annual = monthly != null ? monthly * 12 : null;

            return {
                effective_date: datePart || null,
                monthly_rent: monthly,
                annual_rent: annual,
                raw: chunk,
            };
        })
        .filter((x) => x.effective_date && x.monthly_rent != null);
};
/*------------------------------ getLeaseDocs ------------------------------ */
export const formatFutureAnnual = (futureValue) =>
    parseFutureRents(futureValue)
        .map((r) => `${r.effective_date}: $${r.annual_rent.toFixed(2)}/yr`)
        .join("; ");

export const getLeaseDocs = async (tenant_id, unit_id = null) => {
    const res = await getLeaseInfo(tenant_id, unit_id);
    const data = res[0]

    const { data: unitdata, error: unitError } = await supabase.from('Units').select('square_footage').eq('unit_id', unit_id).single()
    if (unitError) {
        console.error("Error Fetching Unit Data")
    }
    const square_footage = unitdata.square_footage
    const basic_lease = [
        { "Lease Signed Date": data.lease_signed_date },
        { "Latest Modification Date": data.latest_lease_modification_signed_date },
        { "Lease Commencement Date": data.lease_commencement_date },

        { "Possession Date": data.possession_date },
        { "Lease Expiration Date": data.lease_expiration_date },
        { "Lease Term (Months)": data.lease_term_months },

    ];
    let Annual_Rent = {}
    let Base_Rent_PSF = {}
    if (data.base_rent_amount_current) {
        Annual_Rent = {
            'page': data.base_rent_amount_current.page,
            'value': `$${moneyToNumber(data.base_rent_amount_current.value) * 12}`,
            'reason': "Calculated from Base Rent",
            'source_doc': data.base_rent_amount_current.source_doc,
            'future_value': null,
            'future_value_effective_date': null,
            'is_manual_change': data.base_rent_amount_current.is_manual_change,
            'manual_review': false,
        }

        Base_Rent_PSF =
        {

            'page': data.base_rent_amount_current.page,
            'value': `$${((moneyToNumber(data.base_rent_amount_current.value) * 12) / square_footage).toFixed(2)}`,
            'reason': "Calculated from Base Rent",
            'source_doc': data.base_rent_amount_current.source_doc,
            'future_value': null,
            'future_value_effective_date': null,
            'is_manual_change': data.base_rent_amount_current.is_manual_change,
            'manual_review': false,

        }
    }
    const rent = [
        { "Current Base Rent (Periodic)": data.base_rent_amount_current },
        { "Base Rent Frequency": data.base_rent_frequency },
        { "Base Rent Payment Timing": data.base_rent_payment_timing },
        { "Base Rent Due Day": data.base_rent_due_day },
        { "Current Rent Effective Date": data.base_rent_effective_date },
        { "Base Rent Annually": Annual_Rent },
        { "Base Rent PSF (Annualized)": Base_Rent_PSF },
        { "Additional Rent Componants": data.additional_rent_components },
        { "Additional Rent Billing Method": data.additional_rent_billing_method },
        { "Additional Rent Limitations": data.additional_rent_limitations },
        // Use the computed next escalation here:
        { "Base Rent Schedule": data.base_rent_schedule },
        { "Rent Commencement Date": data.rent_commencement_date },
        { "Additional Rent Commencement Date": data.additional_rent_commencement_date },
        { "Rent Abatement End": data.rent_abatement_end_date },
        { "Security Deposit Amount": data.security_deposit_amount },
        { "Security Deposit Type": data.security_deposit_type },
    ];

    const premises = [
        { "Premises Description": data.premises_description },
        { "Permitted Use": data.permitted_use },
        { "Parking Allocation": data.parking_allocation },
        { "Utility Responsibility": data.utility_responsibilities },
        { "HVAC Responsibilities": data.hvac_responsibilities },
        { "Tenant Maintenance Responsibilities": data.tenant_maintenance_responsibilities },
        { "Landlord Maintenance Responsibilities": data.landlord_maintenance_responsibilities },
    ];



    const rights = [
        { "Rights Index": data.rights_index },
        { "Renewal Options Summary": data.renewal_options_summary },
        { "Renwal Notice Requirements": data.renewal_notice_requirements_summary },
    ];


    return { 'basic_lease': basic_lease, 'rent': rent || "", 'premises': premises || "", 'rights': rights, }
};

/* ---------------------------- getTenantLeaseInfo --------------------------- */

export const getTenantLeaseInfo = async (tenant_id, unit_id = null) => {
    const data = await getLeaseInfo(tenant_id, unit_id);



    const lease_summary = [
        { "Lease Commencement Date": data.lease_commencement_date },
        { "Lease Expiration Date": data.lease_expiration_date },
        { "Lease Term (Months)": data.lease_term_months },
    ];


    const financial_snapshot = [
        { "Current Base Rent (Periodic)": data.base_rent_amount_current },
        { "Additional Rent Componants": data.additional_rent_components },
        { "Base Rent Schedule": data.base_rent_schedule },
        { "Security Deposit Amount": data.security_deposit_amount },
    ];

    const responsibility = [
        { "Tenant Maintenance Responsibilities": data.tenant_maintenance_responsibilities },
        { "Landlord Maintenance Responsibilities": data.landlord_maintenance_responsibilities },
    ];

    const keyDates = [
        { "Rent Commencement Date": data.rent_commencement_date },
        { "Rent Abatement End": data.rent_abatement_end_date },
        { "Renewal Options Notice Requirements": data.renewal_notice_requirements_summary },
    ];

    const rights = [
        { "Renewal Options Summary": data.renewal_options_summary },
        { "Rights Index": data.rights_index },
    ];

    const lease_docs = data;
    return { 'lease_summary': lease_summary, 'financial_snapshot': financial_snapshot, 'responsibility': responsibility, 'keyDates': keyDates, 'rights': rights, 'lease_docs': lease_docs }

};


export const getSignedUrl = async (filePath) => {
    if (!filePath) return null;
    const { data, error } = await supabase.storage.from("lease-docs").createSignedUrl(filePath, 600);
    if (error) {
        console.error("Error Generating Signed URL", error);
        return null;
    }
    console.log(data)
    return data?.signedUrl ?? null;
};

export const FIELD_KEYS = {
    // Basic Lease

    "Lease Signed Date": "lease_signed_date",
    "Latest Modification Date": 'latest_lease_modification_signed_date',
    "Base Rent Frequency": 'base_rent_frequency',
    "Base Rent Payment Timing": 'base_rent_payment_timing',
    "Base Rent Due Day": 'base_rent_due_day',
    "Current Rent Effective Date": 'base_rent_effective_date',

    "Lease Commencement Date": "lease_commencement_date",
    "Possession Date": "possession_date",
    "Lease Expiration Date": "lease_expiration_date",
    "Lease Term (Months)": "lease_term_months",

    "Premises Description": "premises_description",
    "Permitted Use": "permitted_use",
    "Parking Allocation": "parking_allocation",

    // Rent
    "Current Base Rent (Periodic)": "base_rent_amount_current",
    "Annual Base Rent (Current)": "base_rent_annualized_current",
    "Base Rent PSF (Annualized)": "base_rent_psf_annualized_current",
    "Base Rent Schedule": "base_rent_schedule",
    "Rent Commencement Date": "rent_commencement_date",
    "Rent Abatement End Date": "rent_abatement_end_date",
    "Additional Rent Componants": "additional_rent_components",
    "Additional Rent Billing Method": "additional_rent_billing_method",
    "Additional Rent Commencement Date": "additional_rent_commencement_date",
    "Additional Rent Limitations": "additional_rent_limitations",
    "Security Deposit Amount": "security_deposit_amount",
    "Security Deposit Type": "security_type",


    // Expense
    "Utility Responsibility": "utility_responsibility",
    "HVAC Responsibilities": "hvac_responsibilities",
    "Tenant Maintenance Responsibilities": "tenant_maintenance_responsibilities",
    "Landlord Maintenance Responsibilities": "landlord_maintenance_responsibilities",


    // Options
    "Renewal Options Summary": "renewal_options_summary",
    "Rights Index": "rights_index",
    "Renewal Notice Requirements": 'renewal_notice_requirements_summary'


};
export const saveOverride = async (termLabel, newValue, meta, tenant_id, unit_id, company_id, session) => {
    const server_url = "http://localhost:8000";
  //const server_url = import.meta.env.VITE_SERVER_URL;
    const decision = meta?.decision; // "approve" | "edit" | "create"
    const approvedAI = !!meta?.approved_ai;
    const access_token = session?.access_token
    //Will be null unless decision === create
    const metaSourceDoc = meta?.source_doc
    const patch =
      decision === "approve" && approvedAI
        ? {
          manual_review: false,      // reviewed/approved, no longer needs review
          is_manual_change: false,
          // they didn't change the value
          // value unchanged (optional: set value = aiValue if you want)
        }
        : {
          value: newValue ?? "",
          manual_review: false,
          is_manual_change: true,
        };
    // <-- add this (or your real column)
    const columnLabel = FIELD_KEYS[termLabel]

    if (decision != 'create') {
      const { data, error } = await supabase.rpc("update_lease_extraction_term", {
        p_patch: patch,
        p_tenant_id: tenant_id,
        p_term_key: columnLabel,
        p_unit_id: unit_id,
      })
      if (error) {
        console.error("saveOverride error:", error);
        return { ok: false, error };
      }
    }
    else {
      const {data, error} = await supabase.from('Lease_Extractions').update({[columnLabel]: {
        'page': 0,
        'value': newValue,
        'reason': "Manual Human Adjustment",
        'source_doc': metaSourceDoc,
        'manual_review': false,
        'is_manual_change': true,
        'confidence_score': 1,
        'future_value': null,
        'future_effective_date': null
      }}).eq('tenant_id', tenant_id).eq('unit_id', unit_id).eq("Is_Current", true)
      if (error) {
        console.error("Error Updating Column", error)
        return {ok: false, error}
      }
    }
    if (columnLabel === 'lease_commencement_date' && decision != "approve") {
      const payload = {
        auth_id: session?.user?.id,
        tenant_id: tenant_id,
        unit_id: unit_id,
        company_id: company_id
      }
      const res = await fetch(`${server_url}/refresh_tenant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        console.error("Server Error:", error);
      }
    }
    window.location.reload();
    return { ok: true }
  };