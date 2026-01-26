import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { getLeaseDocs, parseUSDate, getSignedUrl, FIELD_KEYS, saveOverride } from "../utilities/GetMessages";
import DisplayBox from "../components/DisplayBox";
import { getTable } from "../utilities/supabaseCalls";
import { useAuth } from "../components/AuthProvider.jsx";
import {
  getTenantTermOverrides,
  upsertTenantTermOverrides,
} from "../utilities/supabaseCalls.jsx";
import { ExtractionModal } from "../components/Modal.jsx";
import { supabase } from "../supabaseClient.js";

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
    let [, m, d, y] = mdy;
    if (y.length === 2) y = Number(y) + (Number(y) >= 70 ? 1900 : 2000);
    return tryParse(`${y}-${m}-${d}`);
  }

  // ISO-ish or natural language
  return tryParse(s);
}
/** Display Label → canonical key used in DB / overrides (normalized) */

const sentenceCase = (str = "") =>
  str.charAt(0).toUpperCase() + str.slice(1);

/** Read-only row */
const FieldRow = React.memo(function FieldRow({ label, rawValue, onClick }) {

  const DATE_LABELS = new Set([
    "Lease Commencement Date",
    "Lease Expiration Date",
    "Rent Commencement Date",
    "Rent Abatement End",
  ]);
  let extraClass = ""
  if (rawValue.value && rawValue.manual_review && !rawValue.is_manual_change) {
    extraClass = 'bg bg-red-500'
  }
  let dateValue = ""
  if (DATE_LABELS.has(label) && rawValue.value) {
    dateValue = parseUSDate(rawValue.value);
  }

  let value_display = sentenceCase(rawValue.value)
  if (dateValue != "") {
    value_display = dateValue
  }
  if (label === "Base Rent Due Day" && rawValue.value) {
    if (rawValue.value === '2') {
      value_display = '2nd of the Month'
    }
    else if (rawValue.value === '3') value_display = '3rd of the Month'
    else if (rawValue.value === '1') value_display = '1st of the Month'
    else value_display = `${rawValue.value}th of the Month`
  }
  return (
    <button
      type="button"
      onClick={() => onClick()}
      className={`
        w-full text-left rounded-md py-2
        transition-colors
        hover:bg-muted/50
        focus:outline-none focus:ring-2 focus:ring-ring
        disabled:opacity-50 disabled:cursor-not-allowed
        ${extraClass}
    `}>
      <div className="text-sm font-medium underline underline-offset-4">
        {label}:
      </div>

      <div className="mt-1 text-sm text-muted-foreground space-y-1">
        {value_display}
      </div>
    </button>
  );
});


const TenantTerms = () => {
  const { tenant_id } = useParams();
  const [searchParams] = useSearchParams();
  const unit_id = searchParams.get('unit_id');
  const company_id = localStorage.getItem("activeCompanyId");
  const navigate = useNavigate();
  const { session } = useAuth();
  const [tenantName, setTenantName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Buckets
  const [basicLease, setBasicLease] = useState([]);
  const [rent, setRent] = useState([]);

  const [premises, setPremises] = useState([]);

  const [rights, setRights] = useState([]);

  // Overrides + edits
  const [overrides, setOverrides] = useState({});

  const [activeExtraction, setActiveExtraction] = useState(null);
  const [activeLabel, setActiveLabel] = useState(null)
  const [signedUrl, setSignedUrl] = useState(null)
  const [unit, setUnit] = useState({})
  const safeExtraction = activeExtraction ?? {
    label: activeLabel ?? "Manual Entry",
    value: null,
    future_value: null,
    confidence_score: null,
    reason: null,
    manual_review: false,
  };

  useEffect(() => {
    if(!unit_id) return;
    const getUnit = async () => {
      const unit_res = await supabase.from('Units').select('*').eq('unit_id', unit_id).single()
      if(unit_res.error)
      {
        console.error("Error Fetching Unit", unit_res)
      }
      const unit = unit_res.data
      setUnit(unit)
    }
    getUnit()
  })

  useEffect(() => {
    if (!tenant_id) return;
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setErrorMsg("");

      try {
        let doc
        doc = await getLeaseDocs(tenant_id, unit_id)
        if (!cancelled && doc) {
          setBasicLease(doc.basic_lease ?? []);
          setRent(doc.rent ?? []);
          setPremises(doc.premises ?? []);
          setRights(doc.rights ?? []);
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
    [overrides]
  );


  // Build flattened sections (read-only list)
  const sections = useMemo(() => {
    const S = [
      { title: "Basic Lease Details", data: basicLease },
      { title: "Rights", data: rights },
      { title: "Rent & Financial Terms", data: rent },
      { title: "Premises & Maintenance Responsibilities", data: premises },

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
  }, [basicLease, rent, premises, rights, overrides, getDisplayValue]);

  // Open field in the persistent editor

  const handleOpenExtraction = async (label, term) => {

    setActiveExtraction(term);
    console.log("Term", term)
    setActiveLabel(label)
    if (term != null && term != "") {
      console.log("Term Not Null")
      const url = await getSignedUrl(term.source_doc);
      setSignedUrl(`${url}#page=${term.page}`)
    }

  }


  return (
    <main className="mx-auto max-w-7xl p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 md:mb-6 md:flex-row md:items-end md:gap-4">
        <button
          onClick={() => navigate(-1)}
          className="text-sm sm:text-base px-3 py-2 rounded-xl bg-gray-700 hover:bg-gray-600"
          aria-label="Go back"
        >
          ← Back
        </button>

        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {`${tenantName} - ${unit.address}, Suite: ${unit.Suite}`|| "Tenant Terms"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Key terms extracted from lease documents and organized for quick review.
            LeaseLink can make mistakes—review source documents for critical decisions.
          </p>
        </div>
      </div>




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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-2">
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
                      section.fields.map((f, idx) =>
                      (

                        <FieldRow
                          key={f.id || `${section.title}-${idx}`}
                          label={f.label}
                          rawValue={f.value}
                          onClick={() => {

                            handleOpenExtraction(f.label, f.value);
                          }}
                        />

                      )
                      )
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
      {activeLabel && (
        <ExtractionModal
          label={safeExtraction.label}
          aiValue={safeExtraction.value}
          aiFuture={safeExtraction.future_value}
          aiConfidence={safeExtraction.confidence_score}
          aiReason={safeExtraction.reason}
          requiresReview={safeExtraction.manual_review}
          signedUrl={signedUrl}
          onClose={() => {
            setActiveLabel(null)
            setActiveExtraction(null);
            setSignedUrl(null);

          }}
          onSave={(finalValue, meta) => {

            // Example override write
            saveOverride(activeLabel, finalValue, meta, tenant_id, unit_id, company_id, session);
            setActiveLabel(null)
            setActiveExtraction(null);
            setSignedUrl(null);
          }}
          tenant_id={tenant_id}
        />
      )}
    </main>
  );
};

export default TenantTerms;

