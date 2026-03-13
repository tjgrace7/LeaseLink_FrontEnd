/**
 * DropdownPortal
 *
 * Renders its children outside the normal React tree by portalling them into
 * a dedicated `<div id="dropdown-portal-root">` appended directly to
 * `document.body`. This sidesteps two common problems with dropdown menus
 * rendered inside deeply-nested components:
 *  1. `overflow: hidden` on an ancestor clips the dropdown.
 *  2. Stacking-context issues (`z-index` fighting) prevent the menu from
 *     appearing above other content.
 *
 * Position is supplied by the caller (typically via the `usePortalPosition`
 * hook) as fixed-coordinate `top`/`left`/`width` values derived from the
 * trigger element's bounding rect.
 *
 * @param {{ top, left, width, placement? }} position
 *   — Fixed-coordinate position for the menu container.
 *     When `placement` is "top", a `translateY(-100%)` transform is applied
 *     so the menu opens upward above the trigger instead of below it.
 * @param {React.ReactNode} children        — The menu content to portal
 * @param {string}          menuClassName   — Extra CSS classes on the container div
 */
// src/components/portal.jsx
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export default function DropdownPortal({ position, children, menuClassName = "" }) {
  const [root, setRoot] = useState(null);

  useEffect(() => {
    let el = document.getElementById("dropdown-portal-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "dropdown-portal-root";
      document.body.appendChild(el);
    }
    setRoot(el);
  }, []);

  if (!root || !position) return null;

  const style = {
    position: "fixed",
    top: `${position.top}px`,
    left: `${position.left}px`,
    minWidth: `${position.width}px`,
    zIndex: 1000,
    // If placement is "top", anchor to the top and lift by 100% of the menu’s height
    transform: position.placement === "top" ? "translateY(-100%)" : undefined,
  };

  return createPortal(
    <div style={style} className={menuClassName}>
      {children}
    </div>,
    root
  );
}
