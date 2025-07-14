// src/pages/CreatePerson.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../components/AuthProvider';

import DisplayBox from '../components/DisplayBox';
import Dropdown from '../components/dropdown';
import UploadImage from '../components/upload_image';
import { fileToBase64 } from '../utilities/imageConverter';

/**
 * CreatePerson
 * Form for creating a new person: App User, Tenant, or Building Owner.
 * Fields and logic adapt based on selected type.
 */
const CreatePerson = () => {
  const { session, userData } = useAuth();
  const navigate = useNavigate();

  const personOptions = ['App User', 'Tenant', 'Building Owner'];
  const permissionLevels = ['Company Admin', 'Property Manager'];

  // Generic info
  const [selectedPerson, setPerson] = useState('');
  const [genericFormData, setGeneric] = useState({
    name: '',
    email: '',
    phone: '',
    image: '',
    imageType: '',
  });

  // Tenant-specific state
  const [tenant, setTenant] = useState({ dba: '', active: true });

  // App User-specific state
  const [permission, setPermission] = useState('');

  // Error handling
  const [errors, setErrors] = useState({});

  // Property & Unit options
  const [properties, setProperties] = useState([]);
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedUnits, setSelectedUnits] = useState([]);

  const supabase_url = import.meta.env.VITE_SUPABASE_URL;

  /**
   * Fetch available properties and units based on user and person type
   */
  useEffect(() => {
    if (selectedPerson === 'Building Owner' || !userData) return;

    const getPropertyUnits = async () => {
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select('*')
        .eq('pm_company', userData.company_id);

      if (propertyError) {
        console.error('No Properties Available', propertyError);
      } else {
        setProperties(propertyData);
      }

      if (selectedPerson === 'Tenant') {
        const { data: unitData, error: unitError } = await supabase
          .from('Units')
          .select('*')
          .eq('pmcompany_id', userData.company_id);

        if (unitError) {
          console.error('No Units Available', unitError);
        } else {
          const { data: usedUnits, error: unusedError } = await supabase
            .from('Tenant_Unit')
            .select('*')
            .in('unit_id', unitData.map((u) => u.unit_id));

          if (unusedError) {
            console.error('Tenant_Unit Failed', unusedError);
          } else {
            const usedIds = new Set(usedUnits.map((u) => u.unit_id));
            const availableUnits = unitData.filter((unit) => !usedIds.has(unit.unit_id));
            setUnits(availableUnits);
          }
        }
      }
    };

    getPropertyUnits();
  }, [selectedPerson, userData]);

  /**
   * Handle input changes for both generic and tenant-specific fields
   */
  const handleChange = (event) => {
    const { name, value } = event.target;

    setGeneric((prev) => ({ ...prev, [name]: value }));

    if (selectedPerson === 'Tenant') {
      setTenant((prev) => ({ ...prev, [name]: value }));
    }
  };

  /**
   * Validate and submit the form to Supabase Edge Function
   */
  const handleSubmit = async () => {
    const newErrors = {};
    if (!genericFormData.name) newErrors.name = true;
    if (!genericFormData.email) newErrors.email = true;
    if (!genericFormData.phone) newErrors.phone = true;
    if (selectedPerson === 'App User' && !permission) newErrors.PermissionLevel = true;

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const storagePath = `${userData.company_id}/${selectedPerson}/${genericFormData.name}`;
    const imageBase64 = genericFormData.image
      ? await fileToBase64(genericFormData.image)
      : null;

    const response = await fetch(`${supabase_url}/functions/v1/Create_Person`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personType: selectedPerson,
        name: genericFormData.name,
        email: genericFormData.email,
        phone: genericFormData.phone,
        user_id: session.user.id,
        company_id: userData.company_id,
        image: imageBase64,
        properties: selectedProperties,
        units: selectedUnits,
        dba: tenant.dba,
        active: tenant.active,
        role: permission,
        storagePath,
        imageType: genericFormData.imageType,
      }),
    });

    const result = await response.json();

    navigate('/dashboard');
  };

  return (
    <div>
      <div className="flex items-center justify-center mt-5 text-2xl">
        <h1>Create Person</h1>
      </div>

      <DisplayBox className="flex flex-row justify-between">
        {/* Left Side: Form Fields */}
        <div className="flex flex-col p-6">
          <Dropdown
            options={personOptions}
            onSelect={setPerson}
            placeholder="Select Person Type"
          />

          {/* Basic Info Fields */}
          <div className="flex flex-col mt-6">
            {['name', 'email', 'phone'].map((field) => (
              <div key={field}>
                <p className="capitalize">{field}</p>
                <input
                  className={`bg-gray-700 p-4 rounded w-full border ${
                    errors[field] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
                  name={field}
                  placeholder={`Enter ${field}`}
                  value={genericFormData[field]}
                  onChange={handleChange}
                />
              </div>
            ))}

            {/* Tenant Fields */}
            {selectedPerson === 'Tenant' && (
              <div className="flex flex-col">
                <p>DBA</p>
                <input
                  className="bg-gray-700 p-4 rounded w-full"
                  type="text"
                  name="dba"
                  placeholder="Enter DBA"
                  value={tenant.dba}
                  onChange={handleChange}
                />

                <p>Is Active?</p>
                <input
                  type="checkbox"
                  name="active"
                  checked={tenant.active}
                  onChange={(e) =>
                    setTenant((prev) => ({ ...prev, active: e.target.checked }))
                  }
                />

                <p>Properties</p>
                <Dropdown
                  options={properties}
                  onSelect={(property) => {
                    if (!selectedProperties.some((p) => p.prop_id === property.prop_id)) {
                      setSelectedProperties((prev) => [...prev, property]);
                      setProperties((prev) =>
                        prev.filter((p) => p.prop_id !== property.prop_id)
                      );
                    }
                  }}
                  placeholder="Select Properties"
                  getOptionTitle={(o) => o.Property_Name}
                  getOptionId={(o) => o.prop_id}
                  clearAfterSelect
                />

                <p>Units</p>
                <Dropdown
                  options={units}
                  onSelect={(unit) => {
                    if (!selectedUnits.some((u) => u.unit_id === unit.unit_id)) {
                      setSelectedUnits((prev) => [...prev, unit]);
                      setUnits((prev) =>
                        prev.filter((u) => u.unit_id !== unit.unit_id)
                      );
                    }
                  }}
                  placeholder="Select Units"
                  getOptionTitle={(u) => u.address}
                  getOptionId={(u) => u.unit_id}
                  clearAfterSelect
                />
              </div>
            )}

            {/* App User Fields */}
            {selectedPerson === 'App User' && (
              <>
                <div
                  className={`bg-gray-700 mt-4 rounded w-full border ${
                    errors.PermissionLevel ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <Dropdown
                    options={permissionLevels}
                    onSelect={setPermission}
                    placeholder="Select Role"
                  />
                </div>

                <div className="bg-gray-700 mt-4 rounded w-full">
                  <Dropdown
                    options={properties}
                    onSelect={(property) => {
                      if (
                        !selectedProperties.some((p) => p.prop_id === property.prop_id)
                      ) {
                        setSelectedProperties((prev) => [...prev, property]);
                        setProperties((prev) =>
                          prev.filter((p) => p.prop_id !== property.prop_id)
                        );
                      }
                    }}
                    placeholder="Select Properties"
                    getOptionTitle={(o) => o.Property_Name}
                    getOptionId={(o) => o.prop_id}
                    clearAfterSelect
                  />
                </div>
              </>
            )}

            {/* Submit */}
            <div className="mt-4 flex items-center">
              <button
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={handleSubmit}
              >
                Submit
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Upload and Preview */}
        <div className="flex flex-col justify-left">
          <UploadImage
            onImageSelect={(image) =>
              setGeneric((prev) => ({
                ...prev,
                image,
                imageType: image.type,
              }))
            }
          />

          <div className="mt-16">
            {selectedProperties.length > 0 && (
              <div>
                <h2 className="text-2xl underline">Properties</h2>
                {selectedProperties.map((property) => (
                  <div key={property.prop_id} className="mb-1 bg-gray-700">
                    {property.Property_Name || 'Unnamed Property'}
                  </div>
                ))}
              </div>
            )}

            {selectedUnits.length > 0 && (
              <div>
                <h2 className="text-2xl underline">Units</h2>
                {selectedUnits.map((unit) => (
                  <div key={unit.unit_id} className="mb-1 bg-gray-700">
                    {unit.address || 'Unnamed Unit'}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DisplayBox>
    </div>
  );
};

export default CreatePerson;
