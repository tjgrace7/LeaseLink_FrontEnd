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
