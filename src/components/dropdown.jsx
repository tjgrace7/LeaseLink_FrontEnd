// src/components/SearchableDropdown.jsx

import { useState, useEffect } from 'react';

/**
 * SearchableDropdown
 * A reusable dropdown component with search functionality.
 *
 * Props:
 * - options: array of items (strings or objects) to choose from
 * - onSelect: callback when an item is selected
 * - placeholder: text shown when nothing is selected
 * - getOptionTitle: function to extract the display label from an object
 * - getOptionId: function to get a unique key from an object
 * - clearAfterSelect: if true, doesn't keep the selected item displayed
 */
const SearchableDropdown = ({
  options,
  onSelect,
  placeholder = "Select an option",
  getOptionTitle = null,
  getOptionId,
  clearAfterSelect = false,
  clearSelection = false
}) => {
  const [isOpen, setIsOpen] = useState(false);     // Controls dropdown visibility
  const [search, setSearch] = useState('');         // Tracks search input
  const [selected, setSelected] = useState(null);   // Stores selected item

  // Filter options based on search input
  const filteredOptions = options.filter(option => {
    const label = typeof option === 'string' ? option : getOptionTitle?.(option);
    return label?.toLowerCase().includes(search.toLowerCase());
  });
  useEffect(() => {
    if(clearSelection) setSelected(null)
    }, [clearSelection])
  // Handle item selection
  const handleSelect = (option) => {
    if (!clearAfterSelect) setSelected(option);
    onSelect(option);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative inline-block text-left w-64">
      {/* Dropdown trigger button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full bg-gray-700 text-white px-4 py-2 rounded-md text-left"
      >
        {selected
          ? typeof selected === 'string'
            ? selected
            : getOptionTitle?.(selected) ?? '[Invalid Object]'
          : placeholder}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-gray-700 border border-gray-700 rounded shadow-lg">
          {/* Search input */}
          <input
            type="text"
            className="w-full px-4 py-2 border-b border-gray-200 outline-none bg-gray-700 text-white"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Option list */}
          <ul className="max-h-60 overflow-y-auto">
            {filteredOptions.map((option) => {
              const label = typeof option === 'string' ? option : getOptionTitle(option);
              const key = typeof option === 'string' ? label : getOptionId(option);

              return (
                <li
                  key={key}
                  onClick={() => handleSelect(option)}
                  className="cursor-pointer px-4 py-2 hover:bg-gray-100 text-white hover:text-black"
                >
                  {label}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;
