// FormComponents.jsx
// Shared form primitive components used across create/edit forms in the app.
//
// Exports:
//   Label       - Styled <label> with optional className override.
//   Input       - Styled <input> with error state ring highlighting.
//   Field       - Composes Label + children + inline error message.
//   SectionCard - Titled card wrapper for grouping related form fields.
//   Chip        - Removable tag/pill used in multi-select fields.

import { FiX } from "react-icons/fi";
export const Label = ({ children, htmlFor, className = "" }) => (
  <label htmlFor={htmlFor} className={`text-sm font-medium mb-1 ${className}`}>
    {children}
  </label>
);

export const Input = ({ error, className = "", ...props }) => (
  <input
    {...props}
    className={`bg-gray-900/40 text-sm rounded-xl w-full px-4 py-3 outline-none ring-1 ${error ? "ring-red-500" : "ring-gray-800"
      } focus:ring-2 focus:ring-blue-400 transition ${className}`}
  />
);

export const Field = ({ label, htmlFor, error, helper, children }) => (
  <div className="flex flex-col gap-2">
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
    {error && (
      <p role="alert" className="text-xs text-red-400">
        {helper || `${label} is required`}
      </p>
    )}
  </div>
);

export const SectionCard = ({ title, right, children }) => (
  <div className="rounded-2xl p-4 md:p-5 shadow-sm hover:shadow-md transition">
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold tracking-wide uppercase text-gray-300">
        {title}
      </h2>
      {right}
    </div>
    {children}
  </div>
);

export const Chip = ({ children, onRemove }) => (
  <div className="group inline-flex items-center gap-2 rounded-full bg-gray-800/70 px-3 py-1 text-xs">
    <span className="truncate max-w-[14rem]">{children}</span>
    {onRemove && (
      <button
        type="button"
        className="opacity-70 group-hover:opacity-100 hover:text-red-400 focus:outline-none"
        aria-label="Remove"
        onClick={onRemove}
      >
        <FiX />
      </button>
    )}
  </div>
);