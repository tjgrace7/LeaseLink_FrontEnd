// src/components/dropdown.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import DropdownPortal from "./portal";
import { usePortalPosition } from "../utilities/usePortalPosition";

export default function Dropdown({
  options = [],
  value,
  onSelect,
  placeholder = "Select",
  getOptionTitle,
  getOptionId,
  clearAfterSelect = false,
  clearSelection = false,
  disabled = false,
  usePortal = true,
  className = "",
  menuClassName = "",
  // NEW: search props
  searchable = true,
  searchPlaceholder = "Search…",
  searchDebounceMs = 120,
  filterFn,                 // (opt, query, label) => boolean
  noResultsText = "No results",
  highlightMatches = true,  // bold matched text
}) {
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const pos = usePortalPosition(triggerRef, open);

  // --- helpers -------------------------------------------------
  const getLabel = (opt) =>
    typeof opt === "string" ? opt : getOptionTitle?.(opt) ?? "[Invalid Option]";

  const getKey = (opt, idx) => {
    if (typeof opt === "string") return opt;
    const id = getOptionId ? getOptionId(opt) : idx;
    return String(id);
  };

  const triggerLabel = value
    ? (typeof value === "string" ? value : getOptionTitle?.(value) ?? "[Invalid Option]")
    : placeholder;

  // external clear support
  useEffect(() => {
    if (clearSelection && !clearAfterSelect) {
      // If you store local selected state, reset it here.
    }
  }, [clearSelection, clearAfterSelect]);

  // close on outside click (allow clicks inside panel)
  useEffect(() => {
    const onDocDown = (e) => {
      if (!open) return;
      const inTrigger = triggerRef.current?.contains(e.target);
      const inPanel = panelRef.current?.contains?.(e.target);
      if (inTrigger || inPanel) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  // Focus search input when opening
  useEffect(() => {
    if (open && searchable) {
      // slight delay so DOM is ready
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open, searchable]);

  // Debounced query
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), searchDebounceMs);
    return () => clearTimeout(t);
  }, [query, searchDebounceMs]);

  const defaultFilter = (opt, q, label) =>
    !q || label.toLowerCase().includes(q.toLowerCase());

  const filtered = useMemo(() => {
    const f = filterFn ?? defaultFilter;
    return options.filter((opt) => f(opt, debouncedQuery, getLabel(opt)));
  }, [options, debouncedQuery, filterFn]);

  useEffect(() => {
    // Reset active index when the list changes or menu opens
    setActiveIndex(filtered.length ? 0 : -1);
  }, [open, filtered.length]);

  const handleSelect = (opt) => {
    onSelect?.(opt);
    if (!clearAfterSelect) {
      // If you maintain internal selection, update here
    }
    setOpen(false);
    setQuery(""); // clear search on close
  };

  // Keyboard support on the whole panel
  const onKeyDownPanel = (e) => {
    if (!open) return;
    if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", "Escape"].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Home") {
      setActiveIndex(filtered.length ? 0 : -1);
      scrollActiveIntoView(0);
      return;
    }
    if (e.key === "End") {
      const idx = filtered.length ? filtered.length - 1 : -1;
      setActiveIndex(idx);
      scrollActiveIntoView(idx);
      return;
    }
    if (e.key === "ArrowDown") {
      setActiveIndex((prev) => {
        const next = filtered.length ? Math.min((prev < 0 ? -1 : prev) + 1, filtered.length - 1) : -1;
        scrollActiveIntoView(next);
        return next;
      });
      return;
    }
    if (e.key === "ArrowUp") {
      setActiveIndex((prev) => {
        const next = filtered.length ? Math.max((prev <= 0 ? 0 : prev) - 1, 0) : -1;
        scrollActiveIntoView(next);
        return next;
      });
      return;
    }
    if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < filtered.length) {
        handleSelect(filtered[activeIndex]);
      }
    }
  };

  const scrollActiveIntoView = (idx) => {
    const list = listRef.current;
    if (!list) return;
    const item = list.querySelector(`[data-idx="${idx}"]`);
    if (!item) return;
    const itemTop = item.offsetTop;
    const itemBottom = itemTop + item.offsetHeight;
    const viewTop = list.scrollTop;
    const viewBottom = viewTop + list.clientHeight;
    if (itemTop < viewTop) list.scrollTop = itemTop;
    else if (itemBottom > viewBottom) list.scrollTop = itemBottom - list.clientHeight;
  };

  const renderHighlighted = (label) => {
    if (!highlightMatches || !debouncedQuery) return label;
    const q = debouncedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = label.split(new RegExp(`(${q})`, "ig"));
    return parts.map((part, i) =>
      part.toLowerCase() === debouncedQuery.toLowerCase() ? (
        <mark key={i} className="bg-transparent font-semibold underline underline-offset-2">
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  // --- render --------------------------------------------------
  const Panel = (
    <div
      ref={panelRef}
      className={`rounded-2xl bg-gray-900 shadow-lg ring-1 ring-gray-800 backdrop-blur ${menuClassName}`}
      onKeyDown={onKeyDownPanel}
      role="listbox"
      aria-activedescendant={activeIndex >= 0 ? `dd-opt-${activeIndex}` : undefined}
    >
      {searchable && (
        <div className="p-2 border-b border-gray-800">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg bg-gray-800/60 px-3 py-2 text-sm text-gray-100 placeholder-gray-400 outline-none ring-1 ring-gray-700 focus:ring-2 focus:ring-blue-400"
          />
        </div>
      )}

      <ul
        ref={listRef}
        className="py-1 overflow-y-auto"
        style={{ maxHeight: pos.maxHeight || 320 }}
      >
        {filtered.length === 0 ? (
          <li
            className="px-4 py-2 text-sm text-gray-400 select-none"
            aria-disabled="true"
          >
            {noResultsText}
          </li>
        ) : (
          filtered.map((opt, idx) => {
            const label = getLabel(opt);
            const isActive = idx === activeIndex;
            return (
              <li
                id={`dd-opt-${idx}`}
                data-idx={idx}
                key={getKey(opt, idx)}
                className={`px-4 py-2 text-sm cursor-pointer ${
                  isActive ? "bg-gray-800 text-gray-100" : "text-gray-100 hover:bg-gray-800"
                }`}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(opt);
                }}
                role="option"
                aria-selected={isActive}
              >
                {renderHighlighted(label)}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );

  return (
    <div className={`relative w-full ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`w-full rounded-xl px-4 py-3 text-left ring-1 transition ${
          disabled ? "opacity-60 cursor-not-allowed" : "hover:ring-blue-400"
        } bg-gray-900/80 ring-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="block truncate text-sm text-gray-100">{triggerLabel}</span>
      </button>

      {open &&
        (usePortal ? (
          <DropdownPortal position={pos} menuClassName={menuClassName}>
            {Panel}
          </DropdownPortal>
        ) : (
          <div className="absolute z-20 mt-1 w-full">{Panel}</div>
        ))}
    </div>
  );
}
