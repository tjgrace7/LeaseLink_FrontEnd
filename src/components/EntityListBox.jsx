// src/components/EntityListBox.jsx

import SearchBar from './SearchBar';
import { useEffect, useState } from 'react'

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
const EntityListBox = ({ type, selectEntity, entities, getEntityLabel, getEntityId, Label, placeholder, boxType, getSQ, getSuite, getRelatedEntity, renderRelatedLabel }) => {
  // If no Label provided, don't render anything
  if (!Label) return null;
  const RelatedEntityInfo = ({ entity }) => {
    const [related, setRelated] = useState(null)
    useEffect(() => {
      const fetch = async () => {
        if (getRelatedEntity) {
          const data = await getRelatedEntity(entity)
          setRelated(data);
        }
      };
      fetch();
    }, [entity])


    if (!related || !renderRelatedLabel) return null;
    return <span className='text-white text-md'>{renderRelatedLabel(related)}</span>;
  }
  
  const sortedEntities = [...(entities ?? [])].sort((a, b) => {
    const hasSuite = !!getSuite?.(a); // check once for all

    if (hasSuite) {
      // If suites are present, sort by suite
      return getSuite(a).toString().trim().localeCompare(
        getSuite(b).toString().trim(),
        undefined,
        { numeric: true }
      );
    } else {
      // Otherwise, sort by label
      return getEntityLabel(a).toString().toLowerCase().localeCompare(
        getEntityLabel(b).toString().toLowerCase()
      );
    }
  });
  return (
    <div className="bg-lease-gradient text-white p-5 rounded-lg pt-5 mt-20">
      {/* Header: SearchBar and Centered Title */}
      <div className="relative flex items-center pb-10">
        <div className="z-10">
          <SearchBar
            placeholder={`Search ${placeholder}`}
            selectEntity={selectEntity}
            type={type}
          />
        </div>
        <h1 className="text-2xl font-bold absolute left-1/2 transform -translate-x-1/2">
          {Label}
        </h1>
      </div>

      {/* Entity List */}
      <ul className="max-h-80 overflow-y-auto space-y-2">
        {Array.isArray(sortedEntities) &&
          sortedEntities.map((entity) => (
            <li key={getEntityId(entity)}>
              <button
                onClick={async () => {
                  if (getRelatedEntity) {
                    const related = await getRelatedEntity(entity);
                    if (related && related.tenant_id) {
                      console.log("Tenant Id", related.tenant_id)
                      selectEntity(related.tenant_id, 'tenant');
                      return;
                    }
                  }
                  selectEntity(getEntityId(entity), boxType);
                }}
                className="w-full text-left border border-gray-500 text-white px-4 py-2 rounded-lg"
              >
                <div className="flex justify-between items-center w-full gap-4">
                  {getSuite && (

                    <span className="text-md text-white flex flex-col">
                      <div>
                        <h2>Suite</h2>
                        {getSuite(entity)}
                      </div>
                    </span>

                  )}
                  <span className="font-medium flex flex-col">
                    <div>
                      {Label === "Units" && (
                        <h2>Address</h2>
                      )}
                      {getEntityLabel(entity)}
                    </div>
                  </span>
                  {getSQ && (
                    <span className="text-md text-white">
                      <div>
                        <h2>Square Footage</h2>
                        {getSQ(entity)} sq ft
                      </div>
                    </span>
                  )}
                  {getRelatedEntity && renderRelatedLabel && (
                    <div>
                      {Label === "Units" && (
                        <h2>Current Tenant</h2>
                      )}
                      <RelatedEntityInfo entity={entity} />
                    </div>
                  )}
                </div>
              </button>
            </li>
          ))}
      </ul>

    </div >
  );
};

export default EntityListBox;
