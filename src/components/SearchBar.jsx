import { FiSearch } from "react-icons/fi";
import { useState, useEffect, useRef, memo, useMemo } from "react";
import { useAuth } from "../components/AuthProvider";

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
};

const SearchBar = ({
  placeholder = "Search…",
  selectEntity,
  type = "units_properties_tenants",
  noAutoFocus = false,
  className = "",
  dropdownClassName = "",
}) => {
  const supabase_url = import.meta.env.VITE_SUPABASE_URL;
  const { session } = useAuth();

  const [searchInput, setSearchInput] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const [searchResults, setSearchResults] = useState({
    tenants: [],
    properties: [],
    units: [],
    owners: [],
  });

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Use screen size, not UA sniffing
  const isSmallScreen = useMediaQuery("(max-width: 640px)");
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  // Consolidate results into a flat list for keyboard navigation
  const flatResults = useMemo(() => {
    const arr = [];
    searchResults.owners.forEach((o) => arr.push({ kind: "owner", item: o, label: o.owner_name }));
    searchResults.tenants.forEach((t) => arr.push({ kind: "tenant", item: t, label: t.Tenant_Name }));
    searchResults.properties.forEach((p) => arr.push({ kind: "property", item: p, label: p.Property_Name }));
    searchResults.units.forEach((u) => arr.push({ kind: "unit", item: u, label: u.address }));
    return arr;
  }, [searchResults]);

  // Close on click/tap outside (pointer events cover mouse + touch)
  useEffect(() => {
    const onPointerDown = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!session) return;

    const delay = setTimeout(() => {
      const q = searchInput.trim();
      if (q) {
        onSearch(q);
        setOpen(true);
      } else {
        clearResults();
      }
    }, 250);

    return () => clearTimeout(delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, session, type]);

  // Reset active index when results change / close
  useEffect(() => {
    if (!open) setActiveIndex(-1);
    else setActiveIndex(flatResults.length ? 0 : -1);
  }, [open, flatResults.length]);

  const clearResults = () => {
    setSearchResults({ tenants: [], properties: [], units: [], owners: [] });
    setOpen(false);
    setActiveIndex(-1);
  };

  const EntitySelected = (entityId, entityName, entityType) => {
    selectEntity(entityId, entityType);
    clearResults();

    localStorage.setItem("entity_selected", true);
    localStorage.setItem("entity_name", entityName);
    localStorage.setItem("entity_type", entityType);
    localStorage.setItem("entity_id", entityId);
    setSearchInput("");

    // On small screens, blur to dismiss keyboard
    if (isSmallScreen && inputRef.current) inputRef.current.blur();
  };

  const onSearch = async (input) => {
    try {
      const res = await fetch(
        `${supabase_url}/functions/v1/search-bar?q=${encodeURIComponent(input)}&type=${encodeURIComponent(type)}`,
        {
          method: "GET",
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await res.json();
      if (data?.results) {
        setSearchResults(data.results || { tenants: [], properties: [], units: [], owners: [] });
      } else {
        clearResults();
      }
    } catch (err) {
      console.error("Search Failed", err);
      clearResults();
    }
  };

  const hasAny =
    searchResults.tenants.length > 0 ||
    searchResults.properties.length > 0 ||
    searchResults.units.length > 0 ||
    searchResults.owners.length > 0;

  // Dropdown sizing that adapts to viewport height on every device
  const dropdownMaxHeight = "clamp(14rem, 45vh, 24rem)";

  // Mobile dropdown: fixed "sheet" under the input so it doesn't clip
  const useFixedDropdown = isSmallScreen ;

  const onKeyDown = (e) => {
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (flatResults.length ? (i + 1) % flatResults.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (flatResults.length ? (i - 1 + flatResults.length) % flatResults.length : -1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && flatResults[activeIndex]) {
        e.preventDefault();
        const r = flatResults[activeIndex];
        if (r.kind === "owner") EntitySelected(r.item.owner_id, r.item.owner_name, "owner");
        if (r.kind === "tenant") EntitySelected(r.item.tenant_id, r.item.Tenant_Name, "tenant");
        if (r.kind === "property") EntitySelected(r.item.prop_id, r.item.Property_Name, "property");
        if (r.kind === "unit") EntitySelected(r.item.unit_id, r.item.address, "unit");
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative w-full z-50 ${className}`}>
    
      {/* Input */}
      <label className="sr-only">{placeholder}</label>

      <div
        className="
          w-full
          rounded-lg ring-1 ring-inset ring-white/10 bg-[#2b2e3a]
        "
      >
        <div className="flex items-center gap-2 p-2 rounded-lg">
          <FiSearch className="text-white/80 w-5 h-5 flex-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onFocus={() => searchInput.trim() && setOpen(true)}
            onKeyDown={onKeyDown}
            className="
              bg-transparent outline-none text-white placeholder-white/50 w-full
              leading-tight py-1
              text-base sm:text-sm
            "
            autoComplete="off"
            spellCheck="false"
            autoCorrect="off"
            autoCapitalize="none"
            autoFocus={!isSmallScreen && !noAutoFocus}
            aria-autocomplete="list"
            aria-expanded={open}
            inputMode="search"
            enterKeyHint="search"
          />

          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                clearResults();
                if (!isSmallScreen && inputRef.current) inputRef.current.focus();
              }}
              className="text-white/60 hover:text-white rounded px-1 text-sm"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {open && (
        <div
          className={[
            useFixedDropdown
              ? "fixed left-0 right-0"
              : "absolute left-0 right-0",
            "mt-2 rounded-lg border border-white/10 bg-[#1f1f1f] shadow-2xl p-3 space-y-3",
          ].join(" ")}
          style={{
            top: useFixedDropdown ? undefined : "100%",
            // If fixed: position right under the input
            ...(useFixedDropdown
              ? {
                  // place it just below the wrapper’s bottom edge
                  // (simple approach: align to top of viewport + element rect)
                  // we'll do a tiny trick with CSS: use margin-top only, and keep it near top via transform in effect-free way:
                  // Instead: just make it appear with some padding at top; real-world: you can compute rect if needed.
                  // For now: this keeps it usable on mobile without clipping.
                  top: "4.25rem",
                  paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
                }
              : {}),
            maxHeight: dropdownMaxHeight,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
          }}
          role="listbox"
          aria-label="Search results"
        >
          {!hasAny && <div className="text-xs text-white/60 px-1 py-1.5">No results</div>}

          {searchResults.owners.length > 0 && (
            <Section
              title="Owners"
              items={searchResults.owners}
              getKey={(o, i) => o.owner_id || `owner-${i}`}
              render={(o) => o.owner_name}
              onClick={(o) => EntitySelected(o.owner_id, o.owner_name, "owner")}
              prefersReducedMotion={prefersReducedMotion}
            />
          )}

          {searchResults.tenants.length > 0 && (
            <Section
              title="Tenants"
              items={searchResults.tenants}
              getKey={(t, i) => t.tenant_id || `tenant-${i}`}
              render={(t) => (
                <>
                  <span className="font-medium">{t.Tenant_Name}</span>
                  {t.DBA ? <span className="text-white/60"> — {t.DBA}</span> : null}
                </>
              )}
              onClick={(t) => EntitySelected(t.tenant_id, t.Tenant_Name, "tenant")}
              prefersReducedMotion={prefersReducedMotion}
            />
          )}

          {searchResults.properties.length > 0 && (
            <Section
              title="Properties"
              items={searchResults.properties}
              getKey={(p, i) => p.prop_id || `property-${i}`}
              render={(p) => p.Property_Name}
              onClick={(p) => EntitySelected(p.prop_id, p.Property_Name, "property")}
              prefersReducedMotion={prefersReducedMotion}
            />
          )}

          {searchResults.units.length > 0 && (
            <Section
              title="Units"
              items={searchResults.units}
              getKey={(u, i) => u.unit_id || `unit-${i}`}
              render={(u) => u.address}
              onClick={(u) => EntitySelected(u.unit_id, u.address, "unit")}
              prefersReducedMotion={prefersReducedMotion}
            />
          )}
        </div>
      )}
    </div>
  );
};

const Section = ({ title, items, getKey, render, onClick, prefersReducedMotion }) => {
  return (
    <div>
      <h2 className="text-[10px] sm:text-xs uppercase tracking-wide text-white/50 mb-1 px-1">
        {title}
      </h2>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={getKey(item, i)}>
            <button
              type="button"
              className="
                w-full text-left px-2 py-2 rounded-md
                hover:bg-[#2b2e3a] active:bg-[#2b2e3a]
                text-white/90
                text-sm sm:text-sm
              "
              onClick={() => onClick(item)}
              role="option"
              style={{
                touchAction: "manipulation",
                transition: prefersReducedMotion ? "none" : undefined,
              }}
            >
              {render(item)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default memo(SearchBar);
