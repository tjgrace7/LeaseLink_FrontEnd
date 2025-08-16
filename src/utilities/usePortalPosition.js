// src/utilities/usePortalPosition.js
import { useState, useLayoutEffect } from "react";

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

export function usePortalPosition(triggerRef, isOpen, estimatedHeight = 320, margin = 8) {
  const [pos, setPos] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 0,
    placement: "bottom", // or "top"
  });

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const update = () => {
      const rect = triggerRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const spaceBelow = vh - rect.bottom - margin;
      const spaceAbove = rect.top - margin;

      // Decide placement
      const placeBottom = spaceBelow >= Math.min(estimatedHeight, spaceAbove);
      const placement = placeBottom ? "bottom" : "top";

      // Max height that fits on chosen side
      const maxHeight = placement === "bottom"
        ? Math.max(160, Math.min(estimatedHeight, spaceBelow))
        : Math.max(160, Math.min(estimatedHeight, spaceAbove));

      // Keep within viewport horizontally
      const left = clamp(rect.left, margin, vw - rect.width - margin);

      // Top coordinate (we’ll use translateY for “top” case)
      const top = placement === "bottom" ? rect.bottom + margin : rect.top - margin;

      setPos({
        top,
        left,
        width: rect.width,
        maxHeight,
        placement,
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [isOpen, triggerRef, estimatedHeight, margin]);

  return pos;
}
