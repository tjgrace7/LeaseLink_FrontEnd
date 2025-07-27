// src/pages/CreateEditPerson.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { FiX } from 'react-icons/fi';
import DisplayBox from '../components/DisplayBox';
import Dropdown from '../components/dropdown';
import UploadImage from '../components/upload_image';
import { fileToBase64 } from '../utilities/imageConverter';
import { get_entity_image } from '../utilities/get_entity_image';
import { getTable, getTableIdList } from '../utilities/supabaseCalls';

const CreateEditPerson = () => {
  const { session, userData } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const typeParam = searchParams.get('type');
  const typeAliasMap = { 'User Profile': 'App User' };
  const normalizedType = typeAliasMap[typeParam] || typeParam;
  const [editImage, setEditImage] = useState('');
  const isEditMode = !!id;

  const personOptions = ['App User', 'Tenant', 'Building Owner', 'Contact'];
  const permissionLevels = ['Company Admin', 'Property Manager'];

  const [selectedPerson, setPerson] = useState(normalizedType || '');
  const [genericFormData, setGeneric] = useState({
    name: '', email: '', phone: '', image: '', imageType: '', address: '', contactType: '', password: '', passwordconfirm: ''
  });


  const [tenant, setTenant] = useState({ dba: '', active: true });
  const [tenants, setTenants] = useState([]);
  const [selectedTenants, setSelectedTenant] = useState([]);
  const [permission, setPermission] = useState('');
  const [errors, setErrors] = useState({});
  const [properties, setProperties] = useState([]);
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedUnits, setSelectedUnits] = useState([]);
  const supabase_url = import.meta.env.VITE_SUPABASE_URL;

  const [previousImage, setPreviousImage] = useState('')
  const [initialData, setInitialData] = useState(null);
  const [initialUnits, setInitialUnits] = useState(null);
  const [initialProperties, setInitialProperties] = useState(null)
  const [initialTenants, setInitialTenants] = useState(null)
  const [initialPermission, setInitialPermission] = useState('')

  useEffect(() => {
    let objectUrl;
    if (genericFormData.image) {
      objectUrl = URL.createObjectURL(genericFormData.image);
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [genericFormData.image]);
  useEffect(() => {
    if (!session || !userData || !selectedPerson) return;

    const fetchInitialData = async () => {
      if (selectedPerson === 'Building Owner') return;

      const propertyData = await getTable('properties', 'pm_company', userData.company_id);
      if (!propertyData) return;
      setProperties(propertyData);

      if (selectedPerson === 'Tenant' && selectedProperties.length > 0) {
        const unitData = await getTable('Units', 'pmcompany_id', userData.company_id);
        if (!unitData) return;

        const usedUnits = await getTableIdList('Tenant_Unit', 'unit_id', unitData.map((u) => u.unit_id));
        const usedIds = new Set((usedUnits || []).map((u) => u.unit_id));

        const selectedPropIds = selectedProperties.map((p) => p.prop_id);

        const availableUnits = unitData.filter((u) =>
          selectedPropIds.includes(u.property_id) && !usedIds.has(u.unit_id))
        .sort((a, b) => {
          const addrCompare = a.address.localeCompare(b.address);
          if(addrCompare !== 0) return addrCompare

          return a.suite_number?.localeCompare?.(b.suite_number ?? '') ?? 0;
        });
        setUnits(availableUnits)
      }
        if (selectedPerson === 'Contact') {
          const tenantData = await getTable('tenant', 'property_management_id', userData.company_id);
          if (!tenantData) return;
          setTenants(tenantData);
        }
      };

      fetchInitialData();
    }, [selectedPerson, userData, selectedProperties]);

  useEffect(() => {
    if (!isEditMode || !typeParam) return;

    const tableMap = {
      'Tenant': 'tenant',
      'App User': 'User_Data',
      'Contact': 'Contact',
      'Building Owner': 'building_owner',
    };
    const table = tableMap[normalizedType];
    const column = (normalizedType === 'App User') ? 'user' : normalizedType === "Building Owner" ? 'owner' : table;

    if (!table) return;
    setPerson(normalizedType);

    const fetchPerson = async () => {
      const personData = await getTable(table, `${column.toLowerCase()}_id`, id);
      const data = personData?.[0];
      if (!data) return;

      let generic = {
        name: '', email: '', phone: '', image: '', imageType: '', address: '', contactType: '',
      };
      let imagepath;
      if (typeParam === 'Tenant') {
        generic.name = data.Tenant_Name || '';
        imagepath = data.photo_file_path || '';

      } else if (normalizedType === 'App User') {
        generic.name = data.Name || '';
        generic.email = session?.user?.email || '';
        generic.phone = session?.user?.phone || '';
        imagepath = data.image_file_path || '';
      } else if (typeParam === 'Contact') {
        generic.name = data.Contact_Name || '';
        generic.email = data.Email || '';
        generic.phone = data.Phone || '';
        generic.address = data.Address || '';
        generic.contactType = data.Contact_Type || '';
        imagepath = data.image_file_path || '';
      } else if (typeParam === 'Building Owner') {
        generic.name = data.owner_name || '';
        generic.email = data.Email || '';
        generic.phone = data.Phone || '';
        imagepath = data.image_file_path || '';
      }

      if (imagepath) {
        setEditImage(await get_entity_image(imagepath, session));
        setPreviousImage(imagepath)
      }
      setGeneric(generic);
      setInitialData({ ...generic, image: imagepath });
      if (typeParam === 'Tenant' || typeParam === 'App User') {
        const tableName = (typeParam === 'Tenant') ? 'Property_Tenant' : 'User_Property';
        const joinData = await getTable(tableName, 'tenant_id', id);
        const propIds = joinData.map((j) => j.property_id);
        const propertyData = await getTableIdList('properties', 'prop_id', propIds);
        setSelectedProperties(propertyData);
        setProperties((prev) => prev.filter((p) => !propertyData.map(pd => pd.prop_id).includes(p.prop_id)));
        setInitialProperties(propertyData)
      }
      // Continue as before...
      if (typeParam === 'Tenant') {
        setTenant({ dba: data.dba || '', active: data.active ?? true });
        const unitTenant = await getTable('Tenant_Unit', 'tenant_id', id);
        const uIds = unitTenant.map((u) => u.unit_id);
        const unitData = await getTableIdList('Units', 'unit_id', uIds);
        setSelectedUnits(unitData);
        setInitialUnits(unitData)
      }

      if (typeParam === 'Contact') {
        const tenantContacts = await getTable('Tenant_Contact', 'contact_id', id);
        const tenantIds = tenantContacts.map((t) => t.tenant_id);
        const relatedTenants = await getTableIdList('tenant', 'tenant_id', tenantIds);
        const selectedIds = new Set((relatedTenants || []).map((t) => t.tenant_id));
        setSelectedTenant(relatedTenants);
        setTenants((prev) => prev.filter((p) => !selectedIds.has(p.tenant_id)));
        setInitialTenants(relatedTenants)
      }

      if (typeParam === 'App User') {
        setPermission(data.role || '');
        setInitialPermission(data.role || '')
      }


    };

    fetchPerson();
  }, [id, typeParam]);

  const hasChanged = () => {
    if (!initialData) return true;
    const { image: initialImage, ...initialRest } = initialData;
    const { image: currentImage, ...currentRest } = genericFormData;

    const baseChanged = JSON.stringify(initialRest) !== JSON.stringify(currentRest);
    const imageChanged =
      typeof currentImage === 'string' &&
      (currentImage.startsWith("data:") || currentImage !== initialImage);

    return baseChanged || imageChanged;
  };

  const handleSubmit = async () => {
    if (isEditMode && !hasChanged()) {
      console.log("No changes detected — skipping update.");
      return;
    }

    const newErrors = {};
    if (!genericFormData.name) newErrors.name = true;
    if (!genericFormData.email && selectedPerson !== 'Tenant') newErrors.email = true;
    if (!genericFormData.phone && selectedPerson !== 'Tenant') newErrors.phone = true;
    if (selectedPerson === 'App User' && !isEditMode) {
      const { password, passwordconfirm } = genericFormData;

      if (!password || !passwordconfirm) {
        newErrors.password = true;
      } else if (password !== passwordconfirm) {
        newErrors.password = true;
      }
    }
    const company = getTable('Property_Management_Companies', 'company_id', userData.company_id)
    const company_name = company.company_name
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    const storagePath = genericFormData.image
      ? `${company_name}/${selectedPerson}/${genericFormData.name}`
      : isEditMode ? previousImage : '';
    console.log(storagePath)
    const imageBase64 = genericFormData.image
      ? await fileToBase64(genericFormData.image)
      : null;

    const tenantIds = selectedTenants.map((t) => t.tenant_id);
    let additionalPayload = {}
    if (!isEditMode || (isEditMode && genericFormData.password)) {
      additionalPayload.password = genericFormData.password;
    }
    const response = await fetch(
      `${supabase_url}/functions/v1/Create_Person`,
      {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityId: id,
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
          address: genericFormData.address,
          contactType: genericFormData.contactType,
          tenant_id: tenantIds,
          ...additionalPayload
        }),
      }
    );

    const result = await response.json();
    navigate('/dashboard');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setGeneric((prev) => ({ ...prev, [name]: value })

    );

    if (selectedPerson === 'Tenant') {
      setTenant((prev) => ({ ...prev, [name]: value }));
    }
  };

  const RemoveEntity = (entity, setFromList, setToList) => {
    setFromList(prev => prev.filter(item => item !== entity));
    setToList(prev => {
      if (!prev.includes(entity)) return [...prev, entity];
      return prev;
    });
  };

  return (
    <div>
      <div className="flex items-center justify-center mt-5 text-2xl">
        <h1>{isEditMode ? 'Edit Person' : 'Create Person'}</h1>
      </div>

      <DisplayBox className="flex flex-row justify-between">
        {/* Left Side: Form Fields */}
        <div className="flex flex-col p-6">
          {!isEditMode && (
            <Dropdown
              options={personOptions}
              value={selectedPerson || ""}
              onSelect={(value) => {
                setPerson(value);
                setSelectedProperties([]);
                setSelectedTenant([]);
                setSelectedUnits([]);
                setGeneric({
                  name: '',
                  email: '',
                  phone: '',
                  image: '',
                  imageType: '',
                  address: '',
                  contactType: '',
                });
                setTenant({ dba: '', active: true });
                setErrors({});
              }}
              placeholder="Select Person Type"
            />
          )}
          {isEditMode && (
            <div className='bg-gray-700 p-4 rounded w-full border'>
              {selectedPerson}
            </div>
          )}
          {/* Basic Info Fields */}
          <div className="flex flex-col mt-6">

            <div>
              <p className="capitalize">Full Name</p>
              <input
                className={`bg-gray-700 p-4 rounded w-full border ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                type="text"
                name="name"
                placeholder="Enter Name"
                value={genericFormData.name ?? ""}
                onChange={handleChange}
              />
              {errors.name && <p className="text-red-500 text-sm">Name is required</p>}
            </div>

            {selectedPerson !== "Tenant" && ['email', 'phone'].map((field) => (
              <div key={field}>
                <p className="capitalize">{field}</p>
                <input
                  className={`bg-gray-700 p-4 rounded w-full border ${errors[field] ? 'border-red-500' : 'border-gray-300'}`}
                  type={field === 'email' ? 'email' : 'tel'}
                  name={field}
                  placeholder={`Enter ${field}`}
                  value={genericFormData[field] ?? ""}
                  onChange={handleChange}
                />
                {errors[field] && <p className="text-red-500 text-sm">{field} is required</p>}
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
                  value={tenant.dba ?? ""}
                  onChange={handleChange}
                />
                <p>Is Active?</p>
                <input
                  type="checkbox"
                  name="active"
                  checked={tenant.active || false}
                  onChange={(e) => setTenant((prev) => ({ ...prev, active: e.target.checked }))}
                />

                <p>Properties</p>
                <Dropdown
                  options={properties}
                  onSelect={(property) => {
                    if (!selectedProperties.some((p) => p.prop_id === property.prop_id)) {
                      setSelectedProperties((prev) => [...prev, property]);
                      setProperties((prev) => prev.filter((p) => p.prop_id !== property.prop_id));
                    }
                  }}
                  placeholder="Select Properties"
                  getOptionTitle={(o) => o.Property_Name}
                  getOptionId={(o) => o.prop_id}
                  clearAfterSelect
                />

                {selectedProperties.length > 0 && (
                  <>
                    <p>Units</p>
                    <Dropdown
                      options={units}
                      onSelect={(unit) => {
                        if (!selectedUnits.some((u) => u.unit_id === unit.unit_id)) {
                          setSelectedUnits((prev) => [...prev, unit]);
                          setUnits((prev) => prev.filter((u) => u.unit_id !== unit.unit_id));
                        }
                      }}
                      placeholder="Select Units"
                      getOptionTitle={(u) => `${u.address} - Suite ${u.Suite}`}
                      getOptionId={(u) => u.unit_id}
                      clearAfterSelect
                    />
                  </>
                )}
              </div>
            )}

            {/* App User Fields */}
            {selectedPerson === 'App User' && (
              <>
                <div>
                  <p>Password</p>
                  <input
                    className={`bg-gray-700 p-4 rounded w-full border ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                    type="password"
                    name="password"
                    placeholder="Enter Password"
                    value={genericFormData.password ?? ""}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <p>Confirm Password</p>
                  <input
                    className={`bg-gray-700 p-4 rounded w-full border ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                    type="password"
                    name="passwordconfirm"
                    placeholder="Enter Password"
                    value={genericFormData.passwordconfirm ?? ""}
                    onChange={handleChange}
                  />
                </div>
                <div className={`bg-gray-700 mt-4 rounded w-full border ${errors.PermissionLevel ? 'border-red-500' : 'border-gray-300'}`}>
                  <Dropdown
                    options={permissionLevels}
                    onSelect={setPermission}
                    placeholder="Select Role"
                  />
                </div>
                {permission != 'Company Admin' && (
                  <div className="bg-gray-700 mt-4 rounded w-full">
                    <Dropdown
                      options={properties}
                      onSelect={(property) => {
                        if (!selectedProperties.some((p) => p.prop_id === property.prop_id)) {
                          setSelectedProperties((prev) => [...prev, property]);
                          setProperties((prev) => prev.filter((p) => p.prop_id !== property.prop_id));
                        }
                      }}
                      placeholder="Select Properties"
                      getOptionTitle={(o) => o.Property_Name}
                      getOptionId={(o) => o.prop_id}
                      clearAfterSelect
                    />
                  </div>
                )}
              </>
            )}

            {selectedPerson === "Contact" && (
              <>
                <div>
                  <p>Address</p>
                  <input
                    className={`bg-gray-700 p-4 rounded w-full border ${errors.address ? 'border-red-500' : 'border-gray-300'}`}
                    type='text'
                    name='address'
                    placeholder='Enter Address'
                    value={genericFormData.address}
                    onChange={handleChange}

                  />
                </div>
                <div>
                  <p>Contact Type</p>
                  <input
                    className={`bg-gray-700 p-4 rounded w-full border mb-4 ${errors.contactType ? 'border-red-500' : 'border-gray-300'}`}
                    type='text'
                    name='contactType'
                    placeholder='Enter Contact Type'
                    value={genericFormData.contactType}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <Dropdown
                    options={tenants}
                    onSelect={(tenant) => {
                      if (!selectedTenants.some(t => t.tenant_id === tenant.tenant_id)) {
                        setSelectedTenant((prev) => [...prev, tenant]);
                        setTenants((prev) => prev.filter((p) => p.tenant_id !== tenant.tenant_id));
                      }
                    }}
                    placeholder='Select Tenants'
                    getOptionTitle={(o) => o.Tenant_Name}
                    getOptionId={(o) => o.tenant_id}
                    clearAfterSelect
                  />

                </div>
              </>
            )}

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
            onImageSelect={(image) => {
              setGeneric((prev) => ({
                ...prev,
                image,
                imageType: image.type,
              }))
              setEditImage('')
            }
            }
            showPreview={false}
          />
          {genericFormData.image ? (
            <img
              src={URL.createObjectURL(genericFormData.image)}
              alt="Preview"
              className="w-32 h-32 object-cover mt-4 rounded"
            />
          ) : editImage ? (
            <img
              src={editImage}
              alt="Preview"
              className="w-32 h-32 object-cover mt-4 rounded"
            />
          ) : null}


          <div className="mt-16">
            {selectedProperties.length > 0 && (
              <div>
                <h2 className="text-2xl underline">Properties</h2>
                {selectedProperties.map((property) => (
                  <div key={property.prop_id} className="mb-1 bg-gray-700">
                    {property.Property_Name || 'Unnamed Property'}
                    <button onClick={() => RemoveEntity(property, setSelectedProperties, setProperties)}><FiX /></button>
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
                    <button onClick={() => RemoveEntity(unit, setSelectedUnits, setUnits)}><FiX /></button>
                  </div>
                ))}
              </div>
            )}

            {selectedTenants.length > 0 && (
              <div>
                <h2 className='text-2xl underline'>Tenants</h2>
                {selectedTenants.map((tenant) => (
                  <div key={tenant.tenant_id} className='mb-1 bg-gray-700'>
                    {tenant.Tenant_Name || "Unnamed Tenant"}
                    <button onClick={() => RemoveEntity(tenant, setSelectedTenant, setTenants)}><FiX /></button>
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

export default CreateEditPerson;
