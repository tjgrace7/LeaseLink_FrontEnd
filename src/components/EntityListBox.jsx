// src/components/EntityListBox.jsx

import { useEffect, useMemo, useState } from "react";
import SearchBar from "./SearchBar";

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

  const isArchived = (row) => {
    const v = row?.archived;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      return s === "true" || s === "t" || s === "1" || s === "yes";
    }
    return Boolean(v);
  };

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

  const handleClick = async (entity) => {
    try {
      if (typeof getRelatedEntity === "function") {
        const related = await getRelatedEntity(entity);
        if (related?.tenant_id) {
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

  return (
    // Key: section stretches to parent height; flex column enables scroll region sizing
    <section className={`bg-lease-gradient text-white p-4 sm:p-5 rounded-lg w-full h-full min-h-0 flex flex-col ${className}`}>
      {/* Header row stays natural height */}
<div className="pb-6 shrink-0">
  <div className="
    grid items-center gap-3
    grid-cols-1
    sm:grid-cols-[20rem_1fr_auto]
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
          Show archived{archivedCount ? ` (${archivedCount})` : ""}
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
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
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

                  <div className="flex items-start gap-6">
                    {sq != null && sq !== "" && (
                      <span className="text-sm sm:text-base text-white">
                        <span className="block opacity-80">Square Footage</span>
                        <span className="font-medium">{String(sq)}</span>
                      </span>
                    )}

                    {getRelatedEntity && renderRelatedLabel && (
                      <div className="text-left">
                        {Label === "Units" && <span className="block opacity-80 text-sm">Current Tenant</span>}
                        <RelatedEntityInfo entity={entity} />
                      </div>
                    )}

                    {archived && (
                      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-rose-400/40 bg-rose-500/10 text-rose-200">
                        Archived
                      </span>
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
