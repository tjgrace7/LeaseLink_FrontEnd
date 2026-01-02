import { supabase } from "../supabaseClient";

const supabase_url = import.meta.env.VITE_SUPABASE_URL;

/* --------------------------------- Helpers --------------------------------- */

const parseUSDate = (s) => {
    // supports "MM/DD/YY" or "MM/DD/YYYY"
    if (!s || typeof s !== "string") return new Date(NaN);
    const [mRaw, dRaw, yRaw] = s.split("/").map((x) => x.trim());
    let m = Number(mRaw);
    let d = Number(dRaw);
    let y = Number(yRaw);
    if (!Number.isFinite(m) || !Number.isFinite(d) || !Number.isFinite(y)) {
        return new Date(NaN);
    }
    if (y < 100) y += 2000; // assume 20xx
    return new Date(y, m - 1, d); // (year, monthIndex, day)
};

const tryParseJSON = (value) => {
    if (typeof value !== "string") return value;
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
};

const fmtCurrency = (n) => {
    const num = typeof n === "string" ? Number(n.replace(/[$,]/g, "")) : Number(n);
    if (!Number.isFinite(num)) return n; // fall back to raw if not numeric
    return num.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
};

const toNumber = (v) => {
    if (v == null) return null;
    const n = parseFloat(String(v).replace(/[$,]/g, ""));
    return Number.isFinite(n) ? n : null;
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
const getNextRentEscalation = (rawValue, today = new Date()) => {
  const parsed = tryParseJSON(rawValue);

  if (!Array.isArray(parsed)) return rawValue;

  // Key aliases
  const RANGE_KEYS = ["period", "date_range", "dateRange", "range", "term", "dates", 'months'];
  const DATE_KEYS  = ["date", "start_date", "startDate", "effective_date", "effectiveDate", "as_of", "asOf", 'months'];

  const MONTHLY_KEYS = ["monthly", "monthly_rent", "monthlyRent", "rent_monthly", "base_rent_monthly", "amount_monthly"];
  const ANNUAL_KEYS  = ["annual_rent", "annualRent", "annual", "yearly_rent", "yearlyRent", "rent_annual", "base_rent_annual"];
  const AMOUNT_KEYS  = ["amount", "rent", "rate"]; // generic bucket people use inconsistently
  const PSF_KEYS     = ["psf", "rent_psf", "rate_psf", "psf_rate", "per_sf", "per_sqft", "per_square_foot"];

  const getFirst = (obj, keys) => {
    for (const k of keys) {
      if (obj && obj[k] != null && obj[k] !== "") return obj[k];
    }
    return null;
  };

  const toNumber = (v) => {
    if (v == null) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  // Parses:
  // - "7/1/2024" (US)
  // - "2013/08/01" or "2013-08-01" (YMD)
  const parseFlexibleDate = (s) => {
    if (!s) return NaN;
    const str = String(s).trim();

    // Y/M/D or Y-M-D
    const ymd = str.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
    if (ymd) {
      const y = Number(ymd[1]);
      const m = Number(ymd[2]) - 1;
      const d = Number(ymd[3]);
      return new Date(y, m, d);
    }

    // fallback to your existing US parser
    return parseUSDate(str);
  };

  const parseRange = (rangeStr) => {
    if (!rangeStr) return null;
    const s = String(rangeStr).trim();

    const parts = s.includes(" to ")
      ? s.split(" to ")
      : s.split(" - ").length === 2
        ? s.split(" - ")
        : s.split("-"); // handles "7/1/2024-6/30/2025"

    if (!parts || parts.length < 2) return null;

    const start = String(parts[0]).trim();
    const end = String(parts[1]).trim();
    if (!start || !end) return null;

    const startDate = parseFlexibleDate(start);
    const endDate = parseFlexibleDate(end);
    if (isNaN(startDate) || isNaN(endDate)) return null;

    return { startDate, endDate, period: `${start} - ${end}` };
  };

  const normalizeRowDates = (row) => {
    // 1) Try range-like field (period/date_range/etc.)
    const rangeRaw = getFirst(row, RANGE_KEYS);
    const range = parseRange(rangeRaw);
    if (range) return range;

    // 2) Try single date field
    const dateRaw = getFirst(row, DATE_KEYS);
    if (dateRaw) {
      const d = parseFlexibleDate(dateRaw);
      if (!isNaN(d)) {
        const label = String(dateRaw).trim();
        return { startDate: d, endDate: d, period: label };
      }
    }

    // 3) No parseable date => cannot schedule this escalation
    return null;
  };

  const normalized = parsed
    .map((row) => {
      if (!row || typeof row !== "object") return null;

      const dates = normalizeRowDates(row);
      if (!dates) return null;

      const monthly = toNumber(getFirst(row, MONTHLY_KEYS));
      const annual  = toNumber(getFirst(row, ANNUAL_KEYS));
      const amount  = toNumber(getFirst(row, AMOUNT_KEYS));
      const psf     = toNumber(getFirst(row, PSF_KEYS));

      // Prefer display: monthly > annual > amount > psf
      // (Your latest example has both amount + monthly; monthly is usually what you want.)
      const display =
        monthly != null ? { kind: "monthly", value: monthly } :
        annual  != null ? { kind: "annual",  value: annual  } :
        amount  != null ? { kind: "amount",  value: amount  } :
        psf     != null ? { kind: "psf",     value: psf     } :
        null;

      return { ...row, ...dates, monthly, annual, amount, psf, display };
    })
    .filter(Boolean);

  if (!normalized.length) {
    // If we couldn't parse any dates, it's usually because entries were relative (e.g. "first anniversary")
    // Return original so you can still show it somewhere.
    return rawValue;
  }

  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const future = normalized
    .filter((e) => e.startDate >= startOfToday)
    .sort((a, b) => a.startDate - b.startDate);

  if (future.length === 0) return "No further rent escalation";

  const next = future[0];

  let displayAmount = "Amount not specified";
  if (next.display?.kind === "monthly") displayAmount = `${fmtCurrency(next.display.value)}/mo`;
  else if (next.display?.kind === "annual") displayAmount = `${fmtCurrency(next.display.value)}/yr`;
  else if (next.display?.kind === "amount") displayAmount = fmtCurrency(next.display.value);
  else if (next.display?.kind === "psf") displayAmount = `${next.display.value} PSF`;

  return `${next.period} — ${displayAmount}`;
};



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
            .from("lease_documents")
            .select("*")
            .eq("tenant_id", tenant_id);


        if (error) {
            console.error("No Tenant Docs", error);
            return [];
        }
        return Array.isArray(data) ? data : [];
    }
    else {
        const { data, error } = await supabase
            .from("lease_documents")
            .select("*")
            .eq("tenant_id", tenant_id)
            .eq('unit_id', unit_id);


        if (error) {
            console.error("No Tenant Docs", error);
            return [];
        }
        return Array.isArray(data) ? data : [];
    }
};
const getMostRecentField = (fieldname, data) => {
    if (!data || data.length === 0) return null;

    let value;
    if (data.length > 1) {
        const getSortDate = (lease) => {
            if (lease.lease_commencement_date) return lease.lease_commencement_date
            if (lease.lease_execution_date) return lease.lease_execution_date
            return null
        };
        const byDate = (a, b) => new Date(getSortDate(b)) - new Date(getSortDate(a));
        value =
            data
                .filter((lease) => getSortDate(lease) && lease[fieldname] != null)
                .sort(byDate)[0]?.[fieldname] ?? null;
    } else {
        value = data[0]?.[fieldname] ?? null;
    }

    if (typeof value === "string" && value.startsWith("{") && value.endsWith("}")) {
        value = value
            .slice(1, -1)
            .split(",")
            .map((item) => item.trim())
            .join("\n");
    }
    console.log(value)
    return value;
};
/* ------------------------------- getLeaseDocs ------------------------------ */

export const getLeaseDocs = async (tenant_id, unit_id = null) => {
    const data = await getLeaseInfo(tenant_id, unit_id);


    const basic_lease = [
        { "Lease Execution Date": getMostRecentField("lease_execution_date", data) },
        { "Lease Commencement Date": getMostRecentField("lease_commencement_date", data) },
        { "Delivery/Possession Date": getMostRecentField("delivery_posession_date", data) },
        { "Lease Expiration Date": getMostRecentField("lease_expiration_date", data) },
        { "Lease Term": getMostRecentField("lease_term", data) },
        { "Premises Description": getMostRecentField("premises_description", data) },
        { "Permitted Use": getMostRecentField("permitted_use", data) },
        { "Rentable Square Footage": getMostRecentField("rentable_square_footage", data) },
        { "Parking Allocation": getMostRecentField("parking_allocation", data) },
    ];

    const rawRentEsc = getMostRecentField("rent_escalation", data);
    const rentEscalationDisplay = getNextRentEscalation(rawRentEsc);

    const rent = [
        { "Base Rent Monthly": getMostRecentField("base_rent_monthly", data) },
        { "Base Rent Annually": getMostRecentField("base_rent_annually", data) },
        { "Base Rent PSF": getMostRecentField("base_rent_psf", data) },
        { "Operating Expenses CAM Monthly": getMostRecentField("operating_expenses_CAM_monthly", data) },
        { "Operating Expenses CAM PSF": getMostRecentField("operating_expenses_CAM_psf", data) },
        { "CAM Start Date": getMostRecentField("CAM_start_date", data) },
        { "CAM Summary": getMostRecentField("CAM_Summary", data) },
        // Use the computed next escalation here:
        { "Rent Escalation": rentEscalationDisplay },
        { "Rent Commencement Date": getMostRecentField("rent_commmencement_date", data) },
        { "Rent Abatement End": getMostRecentField("rent_abatement_end", data) },
        { "Security Deposit Amount": getMostRecentField("security_deposit_amount", data) },
        { "Security Deposit Term": getMostRecentField("security_deposit_term", data) },
        { "Tenant Improvement Allowance": getMostRecentField("tenant_improvement_allowance", data) },
    ];

    // Backfill Annual if missing but Monthly exists
    const monthly = toNumber(rent.find((r) => "Base Rent Monthly" in r)?.["Base Rent Monthly"]);
    const idxAnnual = rent.findIndex((r) => "Base Rent Annually" in r);
    if (idxAnnual !== -1 && !rent[idxAnnual]["Base Rent Annually"] && monthly != null) {
        rent[idxAnnual]["Base Rent Annually"] = fmtCurrency(monthly * 12);
    }

    const expense = [
        { "Property Taxes": getMostRecentField("property_taxes", data) },
        { "Insurance Cost": getMostRecentField("insurance_cost", data) },
        { "Tenant Reimbursement": getMostRecentField("tenant_reimbursement", data) },
        { "Utility Responsibility": getMostRecentField("utility_responsibility", data) },
        { "HVAC Responsibilities": getMostRecentField("hvac_responsibilities", data) },
        { "Tenant Maintenance Responsibilities": getMostRecentField("tenant_maintenance_responsibilities", data) },
        { "Landlord Maintenance Responsibilities": getMostRecentField("landlord_maintenance_responsibilities", data) },
    ];

    const legal = [
        { "Indemnity Clauses": getMostRecentField("indemnity_clauses", data) },
        { "Insurance Requirements": getMostRecentField("insurance_requirements", data) },
        { "Property Insurance": getMostRecentField("property_insurance", data) },
        { "Default and Remedies": getMostRecentField("default_and_remedies", data) },
        { "Force Majeure": getMostRecentField("force_majeure", data) },
        { "Estoppel Certificate Required": getMostRecentField("estoppel_certificate_required", data) },
        { "Assignment and Subletting": getMostRecentField("assignment_and_subletting", data) },
        { "Guarantor Information": getMostRecentField("guarantor_information", data) },
        { "Security Access Rights": getMostRecentField("security_access_rights", data) },
    ];

    const options = [
        { "Renewal Options": getMostRecentField("renewal_options", data) },
        { "Option Exercise Deadlines": getMostRecentField("option_exercise_deadlines", data) },
        { "Holdover Terms": getMostRecentField("holdover_terms", data) },
        { "ROFR/ROFO Clauses": getMostRecentField("ROFR_ROFO_clauses", data) },
        { "Purchase Options": getMostRecentField("purchase_options", data) },
    ];

    const special = [
        { "Exclusivity Rights": getMostRecentField("exclusivity_rights", data) },
        { "Exclusive Use Clause": getMostRecentField("exclusive_use_clause", data) },
        { "Signage Rights": getMostRecentField("signage_rights", data) },
        { "Co-Tenancy Clauses": getMostRecentField("co_tenancy_clauses", data) },
        { "Expansion/Contraction Rights": getMostRecentField("expansion_contraction_rights", data) },
        { "Termination Rights": getMostRecentField("termination_rights", data) },
    ];

    const landlord = [
        { "Landlord Work": getMostRecentField("landlord_work", data) },
        { "Tenant Work": getMostRecentField("Tenant_work", data) },
    ];

    return { 'basic_lease': basic_lease, 'rent': rent || "", 'expense': expense || "", legal: legal || "", 'options': options, 'special': special, landlord: landlord || "" }
};

/* ---------------------------- getTenantLeaseInfo --------------------------- */

export const getTenantLeaseInfo = async (tenant_id, unit_id = null) => {
    const data = await getLeaseInfo(tenant_id, unit_id);

    const lease_summary = [
        { "Lease Commencement Date": getMostRecentField("lease_commencement_date", data) },
        { "Lease Expiration Date": getMostRecentField("lease_expiration_date", data) },
        { "Lease Term": getMostRecentField("lease_term", data) },
        { "Suite Identifier": getMostRecentField("suite_identifier", data) },
        { "Property Address": getMostRecentField("Property_Address", data) },
    ];

    // Special handling for rent escalation here too
    const rawRentEsc = getMostRecentField("rent_escalation", data);
    const rentEscalationDisplay = getNextRentEscalation(rawRentEsc);

    const financial_snapshot = [
        { "Base Rent Monthly": getMostRecentField("base_rent_monthly", data) },
        { "Operating Expenses CAM Monthly": getMostRecentField("operating_expenses_CAM_monthly", data) },
        { "Rent Escalation": rentEscalationDisplay },
        { "Security Deposit Amount": getMostRecentField("security_deposit_amount", data) },
    ];

    const responsibility = [
        { "Tenant Maintenance Responsibilities": getMostRecentField("tenant_maintenance_responsibilities", data) },
        { "Landlord Maintenance Responsibilities": getMostRecentField("landlord_maintenance_responsibilities", data) },
        { "Property Taxes": getMostRecentField("property_taxes", data) },
        { "Insurance Requirements": getMostRecentField("insurance_requirements", data) },
        { "Property Insurance": getMostRecentField("property_insurance", data) },
    ];

    const keyDates = [
        { "Rent Commencement Date": getMostRecentField("rent_commencement_date", data) },
        { "Rent Abatement End": getMostRecentField("rent_abatement_end", data) },
        { "Option Exercise Deadlines": getMostRecentField("option_exercise_deadlines", data) },
    ];

    const rights = [
        { "Renewal Options": getMostRecentField("renewal_options", data) },
        { "Termination Rights": getMostRecentField("termination_rights", data) },
        { "Exclusivity Rights": getMostRecentField("exclusivity_rights", data) },
        { "Expansion/Contraction Rights": getMostRecentField("expansion_contraction_rights", data) },
    ];

    const lease_docs = data;
    return { 'lease_summary': lease_summary, 'financial_snapshot': financial_snapshot, 'responsibility': responsibility, 'keyDates': keyDates, 'rights': rights, 'lease_docs': lease_docs }

};

