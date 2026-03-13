// src/components/EntityListBox.jsx
// Reusable list component for displaying any entity type (properties, units, tenants, owners, contacts).
// Features:
//   - Alphabetical / suite-aware sorting via useMemo
//   - Archived entity toggle with count badge
//   - Inline SearchBar for quick filtering
//   - Optional "related entity" column (e.g. current tenant on a unit row)
//   - Bulk-fetches Lease_Extractions to show per-row "manual review needed" counts
//
// Props:
//   type               - Entity type string passed to SearchBar.
//   selectEntity       - Callback(id, boxType) called when a row is clicked.
//   entities           - Array of entity objects to display.
//   getEntityLabel     - (entity) => string — display name for a row.
//   getEntityId        - (entity) => string|number — unique ID for a row.
//   Label              - Section heading / accessible label (e.g. "Units").
//   placeholder        - Search bar placeholder text override.
//   boxType            - Type string forwarded to selectEntity as the second arg.
//   getSQ              - (entity) => square footage value, or null.
//   getSuite           - (entity) => suite identifier, or null.
//   getRelatedEntity   - async (entity) => related entity data (e.g. tenant for a unit).
//   renderRelatedLabel - (related) => ReactNode — renders the related entity cell.
//   className          - Optional extra Tailwind classes for the outer section.

import { useEffect, useMemo, useState } from "react";
import SearchBar from "./SearchBar";
import { supabase } from "../supabaseClient";

const EntityListBox = ({
  type,
  selectEntity,
  entities = [],
  getEntityLabel = (e) => "",
  getEntityId = (e) => "",
  Label,
  placeholder = "",
  boxType,
  getSQ,
  getSuite,
  getRelatedEntity,
  renderRelatedLabel,
  className = "", // NEW (optional): allow parent styling
}) => {
  if (!Label) return null;

  const [showArchived, setShowArchived] = useState(false);
  const [reviewCountMap, setReviewCountMap] = useState(() => new Map());
  const makeKey = (tenant_id, unit_id) => `${tenant_id || ""}:${unit_id || ""}`;

  // Normalizes the archived field which may come back as a boolean, "true"/"false" string,
  // "t"/"f" (Postgres shorthand), "1"/"0", or "yes"/"no".
  const isArchived = (row) => {
    const v = row?.archived;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      return s === "true" || s === "t" || s === "1" || s === "yes";
    }
    return Boolean(v);
  };


// Inner component that asynchronously resolves a related entity and passes it
// (along with a review count) to a render-prop child function.
const RelatedEntityCell = ({ entity, children }) => {
  const [related, setRelated] = useState(null);
  let Tenant_Name = ""
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        if (!getRelatedEntity) return;
        const data = await getRelatedEntity(entity);
        if (!cancelled) setRelated(data || null);
      } catch (err) {
        console.error("Related fetch error", err);
        if (!cancelled) setRelated(null);
      }
      
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity]);

  const reviewCount =
    reviewCountMap.get(makeKey(entity?.tenant_id, entity?.unit_id)) || 0;

  return children({ related, reviewCount });
};

  // Sort entities: rows with a suite number come first (sorted numerically),
  // then remaining rows sorted alphabetically by label.
  const sortedEntities = useMemo(() => {
    const safe = Array.isArray(entities) ? [...entities] : [];
    const safeText = (v) => (v == null ? "" : String(v));
    const hasSuite = (e) =>
      typeof getSuite === "function" ? getSuite(e) != null && getSuite(e) !== "" : false;

    return safe.sort((a, b) => {
      const aHas = hasSuite(a);
      const bHas = hasSuite(b);

      if (aHas && bHas) {
        const aSuite = safeText(getSuite(a)).trim();
        const bSuite = safeText(getSuite(b)).trim();
        return aSuite.localeCompare(bSuite, undefined, { numeric: true, sensitivity: "base" });
      }
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;

      const aLabel = safeText(getEntityLabel(a)).toLowerCase();
      const bLabel = safeText(getEntityLabel(b)).toLowerCase();
      return aLabel.localeCompare(bLabel, undefined, { sensitivity: "base" });
    });
  }, [entities, getEntityLabel, getSuite]);

  const filteredEntities = useMemo(() => {
    if (showArchived) return sortedEntities;
    return sortedEntities.filter((e) => !isArchived(e));
  }, [sortedEntities, showArchived]);

  const archivedCount = useMemo(
    () => (Array.isArray(entities) ? entities.filter((e) => isArchived(e)).length : 0),
    [entities]
  );

  // Handles row clicks. If the entity has a related tenant (e.g. a unit with a current
  // tenant), it navigates to the tenant instead. When a tenant is linked to multiple units,
  // the specific unit_id is passed so the chat page can scope context correctly.
  const handleClick = async (entity) => {
    try {
      if (typeof getRelatedEntity === "function") {
        const related = await getRelatedEntity(entity);
        console.log("Related entity on click", related);
        if (related?.tenant_id) {
          const {data, error} = await supabase.from('Tenant_Unit').select('unit_id').eq('tenant_id', related.tenant_id);
          if (error) {
            console.error("Error fetching tenant-unit link", error);
            selectEntity?.(related.tenant_id, "tenant");
            return;
          }
          // Multi-unit tenant: pass the originating unit_id to disambiguate
          if (data && data.length > 1) {
              console.log("Entity", entity)
              selectEntity?.(related.tenant_id, "tenant", entity.unit_id, "unit_id")
              return;
            }
          selectEntity?.(related.tenant_id, "tenant");
          return;
        }
      }
      const id = typeof getEntityId === "function" ? getEntityId(entity) : undefined;
      if (id != null) selectEntity?.(id, boxType);
    } catch (err) {
      console.error("Entity click error", err);
    }
  };
  // Bulk-fetches Lease_Extractions for all visible tenant rows to count fields
  // flagged for manual review (manual_review === true). Results are stored in a
  // Map keyed by "tenant_id:unit_id" to handle multi-unit tenants. Fetched in
  // chunks of 200 to stay within Supabase query limits.
  useEffect(() => {
  let cancelled = false;

  const run = async () => {
    const tenantIds = Array.from(
      new Set(
        filteredEntities
          .map((e) => e?.tenant_id)
          .filter((t) => t && t !== "null")
      )
    );

    if (tenantIds.length === 0) {
      if (!cancelled) setReviewCountMap(new Map());
      return;
    }

    const chunkSize = 200;
    const chunks = [];
    for (let i = 0; i < tenantIds.length; i += chunkSize) {
      chunks.push(tenantIds.slice(i, i + chunkSize));
    }

    const nextMap = new Map();

    for (const chunk of chunks) {
const { data, error } = await supabase
  .from("Lease_Extractions")
  .select(`
    tenant_id,
    unit_id,
    lease_commencement_date,
    lease_signed_date,
    latest_lease_modification_signed_date,
    base_rent_amount_current,
    base_rent_frequency,
    base_rent_payment_timing,
    base_rent_due_day,
    base_rent_effective_date,
    base_rent_schedule,
    security_type,
    security_deposit_amount,
    additional_rent_components,
    additional_rent_billing_method,
    additional_rent_commencement_date,
    additional_rent_limitations,
    possession_date,
    rent_commencement_date,
    rent_abatement_end_date,
    lease_expiration_date,
    lease_term_months,
    rights_index,
    renewal_options_summary,
    renewal_notice_requirements_summary,
    premises_description,
    parking_allocation,
    tenant_maintenance_responsibilities,
    landlord_maintenance_responsibilities,
    utility_responsibilities,
    permitted_use
  `)
  .eq("Is_Current", true)
  .in("tenant_id", chunk);

      if (error) {
        console.error("Bulk fetch Lease_Extractions error", error);
        continue;
      }
      for (const row of data || []) {
        const key = makeKey(row.tenant_id, row.unit_id);

        const count = Object.values(row).filter(
          (value) =>
            value &&
            typeof value === "object" &&
            !Array.isArray(value) &&
            value.manual_review === true
        ).length;
        nextMap.set(key, count);
      }
    }

    if (!cancelled) setReviewCountMap(nextMap);
  };

  run();
  return () => {
    cancelled = true;
  };
}, [filteredEntities]);
  return (
    // Key: section stretches to parent height; flex column enables scroll region sizing
    <section className={`bg-lease-gradient text-white p-4 sm:p-5 rounded-lg w-full h-full min-h-0 flex flex-col ${className}`}>
      {/* Header row stays natural height */}
      <div className="pb-6 shrink-0">
        <div className="
    grid items-center gap-3
    grid-cols-1
    sm:grid-cols-[15rem_minmax(0,1fr)_auto]
  ">
          {/* Search */}
          <div className="w-60">
            <SearchBar
              placeholder={`Search ${placeholder || Label}`}
              selectEntity={selectEntity}
              type={type}
            />
          </div>

          {/* Title */}
          <h1
            className="
        text-xl sm:text-2xl font-bold
        text-left sm:text-center
        order-first sm:order-none
        truncate
      "
            aria-label={`${Label} list`}
            title={Label}
          >
            {Label}
          </h1>

          {/* Toggle */}
          <div className="sm:justify-self-end">
            <label className="inline-flex items-center gap-2 text-sm sm:text-base select-none cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                className="h-4 w-4 accent-rose-500"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                aria-label="Toggle showing archived items"
              />
              <span className="opacity-90">
                Show Archived{archivedCount ? ` (${archivedCount})` : ""}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Scroll region: fills remaining height and scrolls internally */}
      <ul className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
        {filteredEntities.map((entity) => {
          const id = getEntityId?.(entity);
          const entityLabel = getEntityLabel?.(entity);
          const sq = typeof getSQ === "function" ? getSQ(entity) : null;
          const suite = typeof getSuite === "function" ? getSuite(entity) : null;
          const archived = isArchived(entity);

          const rowClasses = archived
            ? "border-rose-500/50 bg-rose-900/20 hover:border-rose-400/60"
            : "border-gray-600 hover:border-gray-400";

          return (
            <li key={String(id)}>
              <button
                onClick={() => handleClick(entity)}
                className={`w-full text-left border transition-colors px-3 sm:px-4 py-2 rounded-lg ${rowClasses}`}
                aria-label={`Open ${Label.slice(0, -1)} ${entityLabel ?? ""}${archived ? " (archived)" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* LEFT SIDE */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                    <div className="flex items-start gap-4">
                      {suite != null && suite !== "" && (
                        <span className="text-sm sm:text-base text-white flex flex-col min-w-[4.5rem]">
                          <span className="opacity-80">Suite</span>
                          <span className="font-medium break-words">{String(suite)}</span>
                        </span>
                      )}

                      <span className="font-medium text-sm sm:text-base">
                        {Label === "Units" && <span className="block opacity-80">Address</span>}
                        <span className="break-words">{entityLabel ?? "—"}</span>
                      </span>
                    </div>

                    {sq != null && sq !== "" && (
                      <span className="text-sm sm:text-base text-white">
                        <span className="block opacity-80">Square Footage</span>
                        <span className="font-medium">{String(sq)}</span>
                      </span>
                    )}

                    {/* Current Tenant stays LEFT */}
                    {getRelatedEntity && renderRelatedLabel && (
                      <RelatedEntityCell entity={entity}>
                        {({ related }) =>
                          related ? (
                            <div className="text-left">
                              {Label === "Units" && (
                                <span className="block opacity-80 text-sm">Current Tenant</span>
                              )}
                              <span className="text-white text-sm sm:text-base">
                                {renderRelatedLabel(related)}
                              </span>
                            </div>
                          ) : null
                        }
                      </RelatedEntityCell>
                    )}

                    {archived && (
                      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-rose-400/40 bg-rose-500/10 text-rose-200">
                        Archived
                      </span>
                    )}
                  </div>

                  {/* RIGHT SIDE */}
                  {getRelatedEntity && renderRelatedLabel && (
                    <RelatedEntityCell entity={entity}>
                      {({ reviewCount }) =>
                        reviewCount > 0 ? (
                          <div className="shrink-0 text-right">
                            <span className="block text-xs uppercase tracking-wide text-red-300/90">
                              Extraction Review
                            </span>
                            <span className="inline-flex items-center justify-center rounded-md px-2 py-1 text-sm font-semibold text-red-200 ring-1 ring-inset ring-red-400/40 bg-red-500/10">
                              {reviewCount}
                            </span>
                          </div>
                        ) : null
                      }
                    </RelatedEntityCell>
                  )}
                </div>

              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default EntityListBox;
