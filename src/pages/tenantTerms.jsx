import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getLeaseDocs } from "../utilities/GetMessages";
import DisplayBox from "../components/DisplayBox";
import { getTable } from "../utilities/supabaseCalls";
import { useAuth } from "../components/AuthProvider.jsx";
import {
  getTenantTermOverrides,
  upsertTenantTermOverrides,
} from "../utilities/supabaseCalls.jsx";

function parseDateLoose(input) {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input) ? null : input;

  const s = String(input).trim();
  if (!s) return null;

  // Normalize like 1/2/2026, 01-02-2026, 2026-01-02, Jan 2 2026, etc.
  const tryParse = (str) => {
    const d = new Date(str);
    return isNaN(d) ? null : d;
  };

  // If looks like M/D/Y or M-D-Y, ensure 4-digit year
  const mdy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (mdy) {
    let [ , m, d, y ] = mdy;
    if (y.length === 2) y = Number(y) + (Number(y) >= 70 ? 1900 : 2000);
    return tryParse(`${y}-${m}-${d}`);
  }

  // ISO-ish or natural language
  return tryParse(s);
}
/** Display Label → canonical key used in DB / overrides (normalized) */
const FIELD_KEYS = {
  // Basic Lease
  "Lease Execution Date": "lease_execution_date",
  "Lease Commencement Date": "lease_commencement_date",
  "Delivery/Possession Date": "delivery_possession_date",
  "Lease Expiration Date": "lease_expiration_date",
  "Lease Term": "lease_term",
  "Suite Identifier": "suite_identifier",
  "Property Address": "property_address",
  "Premises Description": "premises_description",
  "Permitted Use": "permitted_use",
  "Rentable Square Footage": "rentable_square_footage",
  "Usable Square Footage": "usable_square_footage",
  "Parking Allocation": "parking_allocation",
  "Storage/Additional Space": "storage_additional_space",

  // Rent
  "Base Rent Monthly": "base_rent_monthly",
  "Base Rent Annually": "base_rent_annually",
  "Base Rent PSF": "base_rent_psf",
  "Operating Expenses CAM Monthly": "operating_expenses_cam_monthly",
  "Operating Expenses CAM PSF": "operating_expenses_cam_psf",
  "CAM Start Date": "cam_start_date",
  "CAM Summary": "cam_summary",
  "Rent Escalation": "rent_escalation_display",
  "Rent Commencement Date": "rent_commencement_date",
  "Rent Abatement End": "rent_abatement_end",
  "Security Deposit Amount": "security_deposit_amount",
  "Security Deposit Term": "security_deposit_term",
  "Tenant Improvement Allowance": "tenant_improvement_allowance",

  // Expense
  "Property Taxes": "property_taxes",
  "Insurance Cost": "insurance_cost",
  "Tenant Reimbursement": "tenant_reimbursement",
  "Utility Responsibility": "utility_responsibility",
  "HVAC Responsibilities": "hvac_responsibilities",
  "Tenant Maintenance Responsibilities": "tenant_maintenance_responsibilities",
  "Landlord Maintenance Responsibilities": "landlord_maintenance_responsibilities",

  // Legal
  "Indemnity Clauses": "indemnity_clauses",
  "Insurance Requirements": "insurance_requirements",
  "Property Insurance": "property_insurance",
  "Default and Remedies": "default_and_remedies",
  "Force Majeure": "force_majeure",
  "Estoppel Certificate Required": "estoppel_certificate_required",
  "Assignment and Subletting": "assignment_and_subletting",
  "Guarantor Information": "guarantor_information",
  "Security Access Rights": "security_access_rights",

  // Options
  "Renewal Options": "renewal_options",
  "Option Exercise Deadlines": "option_exercise_deadlines",
  "Holdover Terms": "holdover_terms",
  "ROFR/ROFO Clauses": "rofr_rofo_clauses",
  "Purchase Options": "purchase_options",

  // Special
  "Exclusivity Rights": "exclusivity_rights",
  "Exclusive Use Clause": "exclusive_use_clause",
  "Signage Rights": "signage_rights",
  "Co-Tenancy Clauses": "co_tenancy_clauses",
  "Expansion/Contraction Rights": "expansion_contraction_rights",
  "Termination Rights": "termination_rights",

  // Work
  "Landlord Work": "landlord_work",
  "Tenant Work": "tenant_work",
};
function formatForDisplay(label, value) {
  let s = String(value ?? "").trim();

  if (label === "Rent Escalation") {
    // remove surrounding [ ... ]
    if (s.startsWith("[") && s.endsWith("]")) s = s.slice(1, -1);

    // try to pretty format JSON list entries
    try {
      const arr = JSON.parse(`[${s}]`);
      return arr
        .map((r) =>
          `${r.period}\n• Base Rent: $${Number(r.monthly_base_rent).toLocaleString()}\n` +
          `• CAM: $${Number(r.monthly_cam).toLocaleString()}\n` +
          `• Total: $${Number(r.total_monthly_rent).toLocaleString()}`
        )
        .join("\n\n");
    } catch {
      return s;
    }
  }

  return s;
}

/** Read-only row */
const FieldRow = React.memo(function FieldRow({ label, value, hasOverride, onClick }) {
  return (
    <div
      className="space-y-1 border-b border-muted/30 py-2 last:border-b-0 cursor-pointer hover:bg-white/5 rounded"
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <dt className="text-lg font-medium text-muted-foreground">{label}:</dt>
        {hasOverride && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
            Edited
          </span>
        )}
      </div>

      <dd className="max-w-full overflow-hidden whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-relaxed">
        {formatForDisplay(label, value) || <span className="text-white/40">—</span>}
      </dd>
    </div>
  );
});


const TenantTerms = () => {
  const { tenant_id } = useParams();
  const [searchParams] = useSearchParams();
  const unit_id = searchParams.get('unit_id');
  const { session } = useAuth();

  const [tenantName, setTenantName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Buckets
  const [basicLease, setBasicLease] = useState([]);
  const [rent, setRent] = useState([]);
  const [expense, setExpense] = useState([]);
  const [legal, setLegal] = useState([]);
  const [options, setOptions] = useState([]);
  const [special, setSpecial] = useState([]);
  const [landlord, setLandlord] = useState([]);

  // Overrides + edits
  const [overrides, setOverrides] = useState({});
  const [edits, setEdits] = useState({});

  // Single, persistent editor state
  const [editMode, setEditMode] = useState(false);
  const [activeKey, setActiveKey] = useState(null);      // canonical key being edited
  const [activeLabel, setActiveLabel] = useState(null);  // display label (for UI)
  const [draft, setDraft] = useState("");                // textarea value
  const [saveNote, setSaveNote] = useState("");
  const [saving, setSaving] = useState(false);
  const editorRef = useRef(null);

  useEffect(() => {
    if (!tenant_id) return;
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setErrorMsg("");

      try {
        let doc
        if(!unit_id) doc = await getLeaseDocs(tenant_id);
        else doc = await getLeaseDocs(tenant_id, unit_id)
        if (!cancelled && doc) {
          setBasicLease(doc.basic_lease ?? []);
          setRent(doc.rent ?? []);
          setExpense(doc.expense ?? []);
          setLegal(doc.legal ?? []);
          setSpecial(doc.special ?? []);
          setOptions(doc.options ?? []);
          setLandlord(doc.landlord ?? []);
        }

        const t = await getTable("tenant", "tenant_id", tenant_id);
        if (!cancelled) {
          setTenantName(
            !t || !Array.isArray(t) || t.length === 0 ? "" : t[0]?.Tenant_Name ?? ""
          );
        }

        const o = await getTenantTermOverrides(tenant_id);
        if (!cancelled) setOverrides(o || {});
      } catch (e) {
        console.error(e);
        if (!cancelled) setErrorMsg("There was a problem loading tenant terms.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tenant_id]);

  // Compute displayed value for a label
const getDisplayValue = useCallback(
  (label, rawValue) => {
    const key = FIELD_KEYS[label];
    if (!key) return rawValue ?? "";

    // 1) live edits in memory always take precedence while editing
    if (key in edits) return edits[key];

    const ov = overrides[key]; // { value, modified_at }
    if (!ov) return rawValue ?? "";

    // 2) If the RAW value looks like a date, compare against override's modified_at
    const rawDate = parseDateLoose(rawValue);
    const ovEditedAt = ov.modified_at ? new Date(ov.modified_at) : null;
    const now = new Date();

    if (rawDate && ovEditedAt && rawDate > ovEditedAt && now >= rawDate) {
      // Newer amendment has taken effect → prefer the raw value from the docs
      return rawValue ?? "";
    }

    // Otherwise, show the override's value
    return ov.value ?? "";
  },
  [edits, overrides]
);


  // Build flattened sections (read-only list)
  const sections = useMemo(() => {
    const S = [
      { title: "Basic Lease Details", data: basicLease },
      { title: "Rent & Financial Terms", data: rent },
      { title: "Reimbursement & Expense Responsibilities", data: expense },
      { title: "Legal, Risk & Liability", data: legal },
      { title: "Options & Deadlines", data: options },
      { title: "Special Rights & Limitations", data: special },
      { title: "Landlord & Tenant Work Obligations", data: landlord },
    ];

    return S.map((section) => ({
      ...section,
      fields: (section.data || []).map((item, idx) => {
        const [label, rawValue] = Object.entries(item)[0] || [];
        const key = FIELD_KEYS[label];
        return {
          id: key ?? `${section.title}-${idx}`,
          label,
          key,
          value: getDisplayValue(label, rawValue),
         hasOverride: !!key && overrides[key]?.value != null && overrides[key]?.value !== "",

        };
      }),
    }));
  }, [basicLease, rent, expense, legal, options, special, landlord, overrides, edits, getDisplayValue]);

  // Open field in the persistent editor
  const openEditor = useCallback((label, value) => {
    const key = FIELD_KEYS[label];
    if (!key) return;
    setActiveKey(key);
    setActiveLabel(label);
    setDraft(value ?? "");
    setEditMode(true);
    // focus after render
    setTimeout(() => editorRef.current?.focus(), 0);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditMode(false);
    setActiveKey(null);
    setActiveLabel(null);
    setDraft("");
  }, []);

  const saveCurrent = useCallback(() => {
    if (!activeKey) return;
    setEdits((prev) => ({ ...prev, [activeKey]: draft }));
    // do not exit edit mode; user can continue typing or navigate to another field
  }, [activeKey, draft]);

const saveAll = useCallback(async () => {
  const pending = { ...edits, ...(activeKey ? { [activeKey]: draft } : {}) };
  if (!tenant_id || Object.keys(pending).length === 0) {
    setEditMode(false);
    setActiveKey(null);
    setActiveLabel(null);
    setDraft("");
    return;
  }
  try {
    setSaving(true);
    await upsertTenantTermOverrides(tenant_id, pending, saveNote || null, session.user.id);

    const stamped = {};
    const nowIso = new Date().toISOString();
    for (const [k, v] of Object.entries(pending)) {
      stamped[k] = { value: v, modified_at: nowIso };
    }

    setOverrides((prev) => ({ ...prev, ...stamped }));
    setEdits({});
    setSaveNote("");
    setEditMode(false);
    setActiveKey(null);
    setActiveLabel(null);
    setDraft("");
  } catch (e) {
    console.error(e);
    setErrorMsg("Could not save your changes.");
  } finally {
    setSaving(false);
  }
}, [tenant_id, edits, activeKey, draft, saveNote, session?.user?.id]);


  const SectionCard = ({ title, children }) => (
    <DisplayBox className="h-full overflow-hidden">
      <section aria-labelledby={title} className="flex h-full flex-col">
        <header className="mb-3 flex items-center justify-between border-b border-muted/30 pb-2">
          <h2 id={title} className="text-xl font-semibold tracking-tight">
            {title}
          </h2>
        </header>
        <div className="min-h-[2rem] flex-1 overflow-hidden">
          <dl className="divide-y divide-muted/20 text-md">{children}</dl>
        </div>
      </section>
    </DisplayBox>
  );

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 md:mb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {tenantName || "Tenant Terms"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Key terms extracted from lease documents and organized for quick review. LeaseLink can
            make mistakes—review source documents for critical decisions.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {!editMode ? (
            <button
              type="button"
              onClick={() => setEditMode(true)}
              className="rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              disabled={isLoading}
            >
              Edit Terms
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={saveNote}
                onChange={(e) => setSaveNote(e.target.value)}
                placeholder="Optional note about these changes"
                className="min-w-60 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
              />
              <button
                type="button"
                onClick={saveAll}
                disabled={saving}
                className="rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save All"}
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sticky editor (only in edit mode) */}
      {editMode && (
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm text-white/70">
              {activeLabel ? (
                <>Editing: <span className="font-medium text-white">{activeLabel}</span></>
              ) : (
                <>Click a field below to edit</>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={saveCurrent}
                className="rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-white/90 hover:bg-white/15 disabled:opacity-50"
                disabled={!activeKey}
              >
                Save Field
              </button>
            </div>
          </div>
          <textarea
            ref={editorRef}
            disabled={!activeKey}
            rows={5}
            className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm leading-relaxed text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 disabled:opacity-60"
            placeholder={activeKey ? "Type to edit…" : "Select a field to start editing…"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </div>
      )}

      {/* Loading & Error */}
      {isLoading && (
        <div className="rounded-2xl border bg-card p-4 text-sm shadow-sm">Loading tenant terms…</div>
      )}
      {!isLoading && errorMsg && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      {/* Content Grid */}
      {!isLoading && !errorMsg && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
          {sections.map((section) => (
            <DisplayBox key={section.title} className="h-full overflow-hidden">
              <section aria-labelledby={section.title} className="flex h-full flex-col">
                <header className="mb-3 flex items-center justify-between border-b border-muted/30 pb-2">
                  <h2 id={section.title} className="text-xl font-semibold tracking-tight">
                    {section.title}
                  </h2>
                </header>
                <div className="min-h-[2rem] flex-1 overflow-hidden">
                  <dl className="divide-y divide-muted/20 text-md">
                    {section.fields.length ? (
                      section.fields.map((f, idx) => (
                        <FieldRow
                          key={f.id || `${section.title}-${idx}`}
                          label={f.label}
                          value={f.value}
                          hasOverride={f.hasOverride}
                          onClick={() => {
                            if (!editMode) return;
                            openEditor(f.label, f.value);
                          }}
                        />
                      ))
                    ) : (
                      <p className="py-2 text-sm text-muted-foreground">No items found.</p>
                    )}
                  </dl>
                </div>
              </section>
            </DisplayBox>
          ))}
        </div>
      )}
    </main>
  );
};

export default TenantTerms;

