// src/components/dropdown.jsx
import { useEffect, useRef, useState } from "react";
import DropdownPortal from "./portal";                // your portal wrapper
import { usePortalPosition } from "../utilities/usePortalPosition"; // position hook

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
}) {
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);

  const pos = usePortalPosition(triggerRef, open);

  // --- helpers -------------------------------------------------
  const getLabel = (opt) =>
    typeof opt === "string" ? opt : getOptionTitle?.(opt) ?? "[Invalid Option]";

  const getKey = (opt, idx) => {
    if (typeof opt === "string") return opt;
    const id = getOptionId ? getOptionId(opt) : idx; // fallback to index if no id fn
    return String(id);
  };

  const triggerLabel = value
    ? (typeof value === "string" ? value : getOptionTitle?.(value) ?? "[Invalid Option]")
    : placeholder;

  // external clear support
  useEffect(() => {
    if (clearSelection && !clearAfterSelect) {
      // no internal selected state here, but if you keep local state, clear it
      // setSelected(null);
    }
  }, [clearSelection, clearAfterSelect]);

  // close on outside click, but allow clicks inside PORTAL panel
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

  const handleSelect = (opt) => {
    onSelect?.(opt);
    if (!clearAfterSelect) {
      // if you maintain internal selection, update it here
    }
    setOpen(false);
  };

  // --- render --------------------------------------------------
  const Panel = (
    <div ref={panelRef} className="rounded-2xl bg-gray-900/98 shadow-lg ring-1 ring-gray-800 backdrop-blur">
      <ul className="max-h-64 overflow-auto py-1">
        {options.map((opt, idx) => (
          <li
            key={getKey(opt, idx)}                // ✅ stable, unique key
            className="px-4 py-2 text-sm text-gray-100 hover:bg-gray-800 cursor-pointer"
            onMouseDown={(e) => {
              // Use mousedown so outside-click listeners don’t pre-close
              e.preventDefault();
              e.stopPropagation();
              handleSelect(opt);
            }}
          >
            {getLabel(opt) /* ✅ never render raw object */}
          </li>
        ))}
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
        } bg-gray-900/40 ring-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400`}
      >
        <span className="block truncate text-sm text-gray-100">{triggerLabel}</span>
      </button>

      {open &&
        (usePortal ? (
          <DropdownPortal position={pos}>{Panel}</DropdownPortal>
        ) : (
          <div className="absolute z-20 mt-1 w-full">{Panel}</div>
        ))}
    </div>
  );
}
