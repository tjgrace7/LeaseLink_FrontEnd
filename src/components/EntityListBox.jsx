// src/components/EntityListBox.jsx

import SearchBar from './SearchBar';

/**
 * EntityListBox
 * Displays a labeled list of entities with a search bar.
 *
 * Props:
 * - type: the entity type passed to the SearchBar (e.g., 'tenants', 'properties')
 * - selectEntity: function to call when an entity is selected
 * - entities: array of entity objects
 * - getEntityLabel: function to extract display label from an entity
 * - getEntityId: function to extract unique ID from an entity
 * - Label: display label/title for the section (e.g. "Tenants")
 */
const EntityListBox = ({ type, selectEntity, entities, getEntityLabel, getEntityId, Label }) => {
  // If no Label provided, don't render anything
  if (!Label) return null;

  return (
    <div className="bg-lease-gradient text-white p-5 rounded-lg pt-5 mt-20">
      {/* Header: SearchBar and Centered Title */}
      <div className="relative flex items-center pb-10">
        <div className="z-10">
          <SearchBar
            placeholder={`Search ${Label}`}
            selectEntity={(entity_id) => selectEntity(entity_id)}
            type={type}
          />
        </div>
        <h1 className="text-2xl font-bold absolute left-1/2 transform -translate-x-1/2">
          {Label}
        </h1>
      </div>

      {/* Entity List */}
      <ul className="max-h-80 overflow-y-auto space-y-2">
        {Array.isArray(entities) &&
          entities.map((entity) => (
            <li
              key={getEntityId(entity)}
              className="border border-gray-500 text-white px-4 py-2 rounded-shadow"
            >
              <button onClick={() => selectEntity(getEntityId(entity))}>
                {getEntityLabel(entity)}
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
};

export default EntityListBox;
