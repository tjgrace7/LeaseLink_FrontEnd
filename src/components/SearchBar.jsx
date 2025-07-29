import { FiSearch } from 'react-icons/fi';
import { useState, useEffect } from 'react'
import { useAuth } from '../components/AuthProvider';


// SearchBar Component
const SearchBar = ({ placeholder, selectEntity, type }) => {
    const supabase_url = import.meta.env.VITE_SUPABASE_URL;
    const { session } = useAuth();

    const [searchInput, setSearchInput] = useState('');
    const [searchResults, setSearchResults] = useState({
        tenants: [],
        properties: [],
        units: [],
        owners: [],
    });

    useEffect(() => {
        if (!session) return;
        const delayDebounce = setTimeout(() => {
            if (searchInput.trim() !== '') {
                onSearch(searchInput);
            } else {
                setSearchResults({ tenants: [], properties: [], units: [], owners: [] });
            }
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [searchInput]);

    const EntitySelected = async (entityId, entityName, entityType) => {
        selectEntity(entityId, entityType);
        setSearchResults({ tenants: [], properties: [], units: [], owners: [] });
        localStorage.setItem('entity_selected', true);
        localStorage.setItem('entity_name', entityName);
        localStorage.setItem('entity_type', entityType);
        localStorage.setItem('entity_id', entityId);

    };

    const onSearch = async (searchInput) => {
        try {
            const searchResults = await fetch(`${supabase_url}/functions/v1/search-bar?q=${searchInput}&type=${type}`, {
                method: 'GET',
                headers: {
                    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${session.access_token}`
                }
            });
            const data = await searchResults.json();
            if (data.results) {
                setSearchResults(data.results || { tenants: [], properties: [], units: [], owners: [] });
            }
        } catch (err) {
            console.error("Search Failed", err);
        }
    };

    return (
        <div className="relative w-full mt-4 max-w-md mx-auto z-50">
            {/* Search Input */}
            <div className="bg-[#3334] rounded-lg px-3 py-2 w-full">
                <div className='flex p-2 bg-[#333] rounded space-x-2'>
                    <FiSearch className='text-white w-5 h-5' />
                    <input
                        type="text"
                        placeholder={placeholder}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className='bg-transparent outline-none text-white placeholder-gray-400 w-full text-sm leading-tight py-1'
                    />
                </div>
            </div>

            {/* Search Results Dropdown */}
            {(searchResults.tenants.length > 0 ||
                searchResults.properties.length > 0 ||
                searchResults.units.length > 0 ||
                searchResults.owners.length > 0) && (
                <div className="absolute top-full mt-2 w-full bg-[#3334] max-h-80 overflow-y-auto rounded shadow-xl z-50 p-3 space-y-2 backdrop-blur-sm">
                    {/* Owners */}
                    {searchResults.owners.length > 0 && (
                        <div>
                            <h2 className='underline'>Owners</h2>
                            <ul>
                                {searchResults.owners.map((owner, index) => (
                                    <li key={owner.id || `owner-${index}`}>
                                        <button
                                            className='text-left block w-full hover:bg-gray-700 p-2 rounded'
                                            onClick={() => EntitySelected(owner.owner_id, owner.owner_name, 'owner')}
                                        >
                                            {owner.owner_name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {/* Tenants */}
                    {searchResults.tenants.length > 0 && (
                        <div>
                            <h2 className='underline'>Tenants</h2>
                            <ul>
                                {searchResults.tenants.map((tenant, index) => (
                                    <li key={tenant.id || `tenant-${index}`}>
                                        <button
                                            className='text-left block w-full hover:bg-gray-700 p-2 rounded'
                                            onClick={() => EntitySelected(tenant.tenant_id, tenant.Tenant_Name, 'tenant')}
                                        >
                                            {tenant.Tenant_Name} - {tenant.DBA}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {/* Properties */}
                    {searchResults.properties.length > 0 && (
                        <div>
                            <h2 className='underline'>Properties</h2>
                            <ul>
                                {searchResults.properties.map((property, index) => (
                                    <li key={property.id || `property-${index}`}>
                                        <button
                                            className='text-left block w-full hover:bg-gray-700 p-2 rounded'
                                            onClick={() => EntitySelected(property.prop_id, property.Property_Name, 'property')}
                                        >
                                            {property.Property_Name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {/* Units */}
                    {searchResults.units.length > 0 && (
                        <div>
                            <h2 className='underline'>Units</h2>
                            <ul>
                                {searchResults.units.map((unit, index) => (
                                    <li key={unit.id || `unit-${index}`}>
                                        <button
                                            className='text-left block w-full hover:bg-gray-700 p-2 rounded'
                                            onClick={() => EntitySelected(unit.unit_id, unit.address, 'unit')}
                                        >
                                            {unit.address}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchBar;
