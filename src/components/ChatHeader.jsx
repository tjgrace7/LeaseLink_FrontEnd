// ChatHeader.jsx
import { memo } from "react";
import SearchBar from "../components/SearchBar";
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
