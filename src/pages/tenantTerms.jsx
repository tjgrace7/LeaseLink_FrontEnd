import { useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getLeaseDocs } from "../utilities/GetMessages";
import DisplayBox from "../components/DisplayBox";
import { getTable } from "../utilities/supabaseCalls";

/**
 * TenantTerms
 * ------------------------------------------------------------
 * UI-cleaned, mobile-first page that shows structured lease terms
 * for a single tenant. Preserves your existing data flow and
 * utilities (getLeaseDocs, getTable, DisplayBox), but improves
 * layout, responsiveness, semantics, and readability.
 *
 * Highlights
 * - Mobile-first stacked cards; 2-col on md, 3-col on xl
 * - Consistent Tailwind spacing/typography/shadows
 * - Accessible semantics (section landmarks, headings, dl)
 * - Robust rendering (skips empty values, handles loading/errors)
 * - Clear comments for future maintenance
 */

const TenantTerms = () => {
  const { tenant_id } = useParams();

  // ----- UI/Loading/Error State -------------------------------------------
  const [tenantName, setTenantName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // ----- Data Buckets ------------------------------------------------------
  const [basicLease, setBasicLease] = useState([]);
  const [rent, setRent] = useState([]);
  const [expense, setExpense] = useState([]);
  const [legal, setLegal] = useState([]);
  const [options, setOptions] = useState([]);
  const [special, setSpecial] = useState([]);
  const [landlord, setLandlord] = useState([]);

  useEffect(() => {
    if (!tenant_id) return;

    let isCancelled = false; // prevent state updates after unmount

    const load = async () => {
      setIsLoading(true);
      setErrorMsg("");
      try {
        // Fetch document buckets
        const doc = await getLeaseDocs(tenant_id);
        if (!isCancelled && doc) {
          setBasicLease(doc.basic_lease ?? []);
          setRent(doc.rent ?? []);
          setExpense(doc.expense ?? []);
          setLegal(doc.legal ?? []);
          setSpecial(doc.special ?? []);
          setOptions(doc.options ?? []);
          setLandlord(doc.landlord ?? []);
        }

        // Fetch tenant display name
        const t = await getTable("tenant", "tenant_id", tenant_id);
        if (!isCancelled) {
          if (!t || !Array.isArray(t) || t.length === 0) {
            console.error("Error Fetching Tenant");
            setTenantName("");
          } else {
            setTenantName(t[0]?.Tenant_Name ?? "");
          }
        }
      } catch (err) {
        console.error(err);
        if (!isCancelled) setErrorMsg("There was a problem loading tenant terms.");
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, [tenant_id]);

  // ----- Section Config (avoids repeated markup) --------------------------
  const sections = useMemo(
    () => [
      { title: "Basic Lease Details", data: basicLease },
      { title: "Rent & Financial Terms", data: rent },
      { title: "Reimbursement & Expense Responsibilities", data: expense },
      { title: "Legal, Risk & Liability", data: legal },
      { title: "Options & Deadlines", data: options },
      { title: "Special Rights & Limitations", data: special },
      { title: "Landlord & Tenant Work Obligations", data: landlord },
    ],
    [basicLease, rent, expense, legal, options, special, landlord]
  );

  /**
   * Safely render a single key/value entry.
   * Each item is expected to be an object with a single { key: value } pair.
   */
  const EntryRow = ({ item }) => {
    // Guard against malformed items
    if (!item || typeof item !== "object") return null;

    const entries = Object.entries(item);
    if (entries.length === 0) return null;

    const [key, value] = entries[0];

    // Skip empty-ish values
    const clean = String(value ?? "").trim();
    if (!clean) return null;

    return (
      <div className="space-y-1 border-b border-muted/30 py-2 last:border-b-0">
        <dt className="text-lg font-medium text-muted-foreground">{key}:</dt>
        <dd className=" text-sm leading-relaxed break-words whitespace-pre-wrap">{clean}</dd>
      </div>
    );
  };

  /**
   * Section Card wrapper. Uses your DisplayBox if present to keep
   * consistent look. We add a sensible default wrapper if DisplayBox
   * doesn't provide card styling.
   */
  const SectionCard = ({ title, children }) => {
    return (
      <DisplayBox className="h-full overflow-hidden">
        <section aria-labelledby={title} className="flex h-full flex-col">
          <header className="mb-3 border-b border-muted/30 pb-2">
            <h2 id={title} className="text-xl font-semibold tracking-tight">
              {title}
            </h2>
          </header>
          <div className="min-h-[2rem] flex-1 overflow-hidden">
            <dl className="divide-y divide-muted/20 text-md">
              {children}
            </dl>
          </div>
        </section>
      </DisplayBox>
    );
  };

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-6">
      {/* Page Header */}
      <div className="mb-4 md:mb-6">
        {tenantName ? (
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{tenantName}</h1>
        ) : (
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Tenant Terms</h1>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          Key terms extracted from lease documents and organized for quick review. Leaselink can make mistakes. Please properly check documents for more than a quick review
        </p>
      </div>

      {/* Loading & Error States */}
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
          {sections.map(({ title, data }) => (
            <SectionCard key={title} title={title}>
              {Array.isArray(data) && data.length > 0 ? (
                data.map((item, idx) => <EntryRow key={`${title}-${idx}`} item={item} />)
              ) : (
                <p className="py-2 text-sm text-muted-foreground">No items found.</p>
              )}
            </SectionCard>
          ))}
        </div>
      )}
    </main>
  );
};

export default TenantTerms;