// src/components/EntityListBox.jsx

import { useEffect, useMemo, useState } from "react";
import SearchBar from "./SearchBar";

/**
 * EntityListBox
 * Displays a labeled list of entities with a search bar.
 *
 * Props:
 * - type: string — entity type for SearchBar (e.g., 'tenants', 'properties')
 * - selectEntity: (id: string|number, kind?: string) => void
 * - entities: array of entity objects
 * - getEntityLabel: (entity) => string
 * - getEntityId: (entity) => string|number
 * - Label: section title string (e.g., "Tenants"); if falsy, renders null
 * - placeholder: string for SearchBar
 * - boxType: string passed back to selectEntity when no related entity is used
 * - getSQ: optional (entity) => number|string  (square footage)
 * - getSuite: optional (entity) => string|number
 * - getRelatedEntity: optional async (entity) => object (e.g., current tenant)
 * - renderRelatedLabel: optional (related) => string|ReactNode
 */

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
}) => {
  if (!Label) return null;

  /**
   * Related entity fetcher as a tiny sub-component
   * Isolated to ensure each list row handles its own related lookup and cancels safely.
   */
  const RelatedEntityInfo = ({ entity }) => {
    const [related, setRelated] = useState(null);

    useEffect(() => {
      let cancelled = false;
      const run = async () => {
        try {
          if (getRelatedEntity) {
            const data = await getRelatedEntity(entity);
            if (!cancelled) setRelated(data || null);
          }
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

    if (!related || !renderRelatedLabel) return null;
    return <span className="text-white text-sm sm:text-base">{renderRelatedLabel(related)}</span>;
  };

  /**
   * Robust sorting:
   * - If both items have suites, sort by suite (numeric-aware).
   * - If only one has suite, suite-first.
   * - Else sort by label.
   */
  const sortedEntities = useMemo(() => {
    const safe = Array.isArray(entities) ? [...entities] : [];
    const safeText = (v) => (v == null ? "" : String(v));
    const hasSuite = (e) => (typeof getSuite === "function" ? getSuite(e) != null && getSuite(e) !== "" : false);

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

  const handleClick = async (entity) => {
    try {
      if (typeof getRelatedEntity === "function") {
        const related = await getRelatedEntity(entity);
        // If related tenant exists, route to tenant
        console.log(related)
        if (related?.tenant_id) {
          selectEntity?.(related.tenant_id, "tenant");
          return;
        }
      }
      // Fallback: use this item’s id + boxType
      const id = typeof getEntityId === "function" ? getEntityId(entity) : undefined;
      if (id != null) selectEntity?.(id, boxType);
    } catch (err) {
      console.error("Entity click error", err);
    }
  };

  return (
    <section className="bg-lease-gradient text-white p-4 sm:p-5 rounded-lg">
      {/* Header: SearchBar (left) + centered title */}
      <div className="relative flex items-center pb-6">
        <div className="z-10">
          <SearchBar
            placeholder={`Search ${placeholder || Label}`}
            selectEntity={selectEntity}
            type={type}
          />
        </div>
        <h1
          className="text-xl sm:text-2xl font-bold absolute left-1/2 -translate-x-1/2"
          aria-label={`${Label} list`}
        >
          {Label}
        </h1>
      </div>

      {/* Entity List */}
      <ul className="max-h-80 overflow-y-auto space-y-2 pr-1">
        {sortedEntities.map((entity) => {
          const id = getEntityId?.(entity);
          const entityLabel = getEntityLabel?.(entity);
          const sq = typeof getSQ === "function" ? getSQ(entity) : null;
          const suite = typeof getSuite === "function" ? getSuite(entity) : null;

          return (
            <li key={String(id)}>
              <button
                onClick={() => handleClick(entity)}
                className="w-full text-left border border-gray-600 hover:border-gray-400 focus:border-gray-300 transition-colors px-3 sm:px-4 py-2 rounded-lg"
                aria-label={`Open ${Label.slice(0, -1)} ${entityLabel ?? ""}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  {/* Left cluster: Suite (if any) + Label */}
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

                  {/* Right cluster: SQFT + Related (e.g., current tenant) */}
                  <div className="flex items-start gap-6">
                    {sq != null && sq !== "" && (
                      <span className="text-sm sm:text-base text-white">
                        <span className="block opacity-80">Square Footage</span>
                        <span className="font-medium">{String(sq)} sq ft</span>
                      </span>
                    )}

                    {getRelatedEntity && renderRelatedLabel && (
                      <div className="text-left">
                        {Label === "Units" && <span className="block opacity-80 text-sm">Current Tenant</span>}
                        <RelatedEntityInfo entity={entity} />
                      </div>
                    )}
                  </div>
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
