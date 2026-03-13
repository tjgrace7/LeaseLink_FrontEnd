// ChatHeader.jsx
// Sticky top bar for the chat page.
// Contains the entity SearchBar and a "Sources" toggle button visible on mobile (<lg).
// Memoized to avoid re-renders when parent state unrelated to header changes.
import { memo } from "react";
import SearchBar from "../components/SearchBar";

/**
 * @param {boolean}  entitySelected - Whether an entity is currently selected in the chat.
 * @param {string}   entity_name    - Display name of the selected entity.
 * @param {string}   entity_type    - Type of entity (e.g. "tenant", "property").
 * @param {string}   entity_image   - Avatar/image URL for the selected entity.
 * @param {Function} selectEntity   - Callback to select a new entity from the search bar.
 * @param {string}   access_token   - Auth token forwarded to SearchBar if needed.
 * @param {Function} setSidebarOpen - Opens the chat sidebar drawer on mobile.
 */
const ChatHeader = memo(function ChatHeader({
  entitySelected, entity_name, entity_type, entity_image,
  selectEntity, access_token, setSidebarOpen
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-white/10 bg-[#121212]/95 backdrop-blur supports-[backdrop-filter]:bg-[#121212]/70">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-2 py-2 sm:gap-3 sm:px-4 sm:py-3 md:px-6">
        {/* entity pill ... */}
        <div className="w-full max-w-xs sm:max-w-lg flex-1">
          <SearchBar
            placeholder="Search Entities"
            selectEntity={selectEntity}
            type="tenants"
            entityDisplay={true}
            noAutoFocus
            data-no-autofocus
          />
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex-none inline-flex items-center rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-white/80 ring-1 ring-inset ring-white/10 hover:text-white hover:ring-white/20 lg:hidden"
          aria-label="Open chat sidebar"
          onMouseDown={(e) => e.preventDefault()}
        >
          <span className="hidden sm:inline">Sources</span>
          <span className="sm:hidden">•••</span>
        </button>
      </div>
    </div>
  );
});
export default ChatHeader;
