// Updated SearchBar.jsx with mobile-friendly focus management

import { FiSearch } from 'react-icons/fi';
import { useState, useEffect, useRef, memo } from 'react';
import { useAuth } from '../components/AuthProvider';

const SearchBar = ({ 
  placeholder = 'Search…', 
  selectEntity, 
  type = 'units_properties_tenants',
  noAutoFocus = false  // Add this prop to prevent auto-focus on mobile
}) => {
  const supabase_url = import.meta.env.VITE_SUPABASE_URL;
  const { session } = useAuth();

  const [searchInput, setSearchInput] = useState('');
  const [open, setOpen] = useState(false);
  const [searchResults, setSearchResults] = useState({
    tenants: [],
    properties: [],
    units: [],
    owners: [],
  });

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   ('ontouchstart' in window);

  // Close on outside click - use more mobile-friendly event
  useEffect(() => {
    const onClickAway = (e) => {
      if (!wrapperRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    
    // Use touchend on mobile, click on desktop
    const eventType = isMobile ? 'touchend' : 'click';
    document.addEventListener(eventType, onClickAway, { passive: true });
    return () => document.removeEventListener(eventType, onClickAway);
  }, [isMobile]);

  // Debounced search
  useEffect(() => {
    if (!session) return;
    const delay = setTimeout(() => {
      if (searchInput.trim() !== '') {
        onSearch(searchInput.trim());
        setOpen(true);
      } else {
        clearResults();
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [searchInput, session, type]);

  const clearResults = () => {
    setSearchResults({ tenants: [], properties: [], units: [], owners: [] });
    setOpen(false);
  };

  const EntitySelected = (entityId, entityName, entityType) => {
    selectEntity(entityId, entityType);
    clearResults();
    localStorage.setItem('entity_selected', true);
    localStorage.setItem('entity_name', entityName);
    localStorage.setItem('entity_type', entityType);
    localStorage.setItem('entity_id', entityId);
    setSearchInput('');
    
    // Blur the search input on mobile to prevent keyboard conflicts
    if (isMobile && inputRef.current) {
      inputRef.current.blur();
    }
  };

  const onSearch = async (input) => {
    try {
      const res = await fetch(
        `${supabase_url}/functions/v1/search-bar?q=${encodeURIComponent(input)}&type=${encodeURIComponent(type)}`,
        {
          method: 'GET',
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
      console.error('Search Failed', err);
      clearResults();
    }
  };

  const hasAny =
    searchResults.tenants.length > 0 ||
    searchResults.properties.length > 0 ||
    searchResults.units.length > 0 ||
    searchResults.owners.length > 0;

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md z-50">
      {/* Input */}
      <label className="sr-only">{placeholder}</label>
      <div className="rounded-lg w-full ring-1 ring-inset ring-white/10 bg-[#2b2e3a]">
        <div className="flex items-center gap-2 p-2 rounded-lg">
          <FiSearch className="text-white/80 w-5 h-5 flex-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onFocus={() => searchInput.trim() && setOpen(true)}
            className="bg-transparent outline-none text-white placeholder-white/50 w-full text-sm leading-tight py-1"
            autoComplete="off"
            spellCheck="false"
            autoCorrect="off"
            autoCapitalize="none"
            // Prevent auto-focus on mobile if requested
            autoFocus={!isMobile && !noAutoFocus}
            aria-autocomplete="list"
            aria-expanded={open}
            // Mobile optimizations
            inputMode="search"
            enterKeyHint="search"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                clearResults();
                // Don't refocus on mobile to avoid keyboard issues
                if (!isMobile && inputRef.current) {
                  inputRef.current.focus();
                }
              }}
              className="text-white/60 hover:text-white rounded px-1 text-sm"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Results - Make sure this doesn't interfere with other inputs */}
      {open && (
        <div
          className="absolute top-full mt-2 w-full rounded-lg border border-white/10 bg-[#1f1f1f] shadow-2xl max-h-80 overflow-y-auto p-3 space-y-3 z-50"
          role="listbox"
          aria-label="Search results"
          // Prevent this from interfering with touch events
          style={{ touchAction: 'auto' }}
        >
          {!hasAny && (
            <div className="text-xs text-white/60 px-1 py-1.5">No results</div>
          )}

          {/* Rest of your sections remain the same */}
          {searchResults.owners.length > 0 && (
            <Section
              title="Owners"
              items={searchResults.owners}
              getKey={(o, i) => o.owner_id || `owner-${i}`}
              render={(o) => o.owner_name}
              onClick={(o) => EntitySelected(o.owner_id, o.owner_name, 'owner')}
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
              onClick={(t) => EntitySelected(t.tenant_id, t.Tenant_Name, 'tenant')}
            />
          )}

          {searchResults.properties.length > 0 && (
            <Section
              title="Properties"
              items={searchResults.properties}
              getKey={(p, i) => p.prop_id || `property-${i}`}
              render={(p) => p.Property_Name}
              onClick={(p) => EntitySelected(p.prop_id, p.Property_Name, 'property')}
            />
          )}

          {searchResults.units.length > 0 && (
            <Section
              title="Units"
              items={searchResults.units}
              getKey={(u, i) => u.unit_id || `unit-${i}`}
              render={(u) => u.address}
              onClick={(u) => EntitySelected(u.unit_id, u.address, 'unit')}
            />
          )}
        </div>
      )}
    </div>
  );
};

// Section component remains the same
const Section = ({ title, items, getKey, render, onClick }) => {
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
              className="w-full text-left px-2 py-2 rounded-md hover:bg-[#2b2e3a] text-white/90 active:bg-[#2b2e3a]"
              onClick={() => onClick(item)}
              role="option"
              // Prevent double-tap zoom on mobile
              style={{ touchAction: 'manipulation' }}
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