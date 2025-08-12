import { createPortal } from "react-dom";

const DropdownPortal = ({ children, position }) => {
  return createPortal(
    <div
      className="fixed z-50 rounded-2xl bg-gray-900/98 shadow-lg ring-1 ring-gray-800 backdrop-blur"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
      }}
    >
      {children}
    </div>,
    document.body
  );
};

export default DropdownPortal;
