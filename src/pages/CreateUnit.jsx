// src/pages/CreateUnitProperty.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useNavigate, useSearchParams } from 'react-router-dom';

import DisplayBox from '../components/DisplayBox';
import UploadImage from '../components/upload_image';
import Dropdown from '../components/dropdown';

import { get_entity_image } from '../utilities/get_entity_image';
import { fileToBase64 } from '../utilities/imageConverter';
import { getTable } from '../utilities/supabaseCalls';


const CreateUnitProperty = () => {
  const { session, userData, roleData } = useAuth();
  const navigate = useNavigate();
  const supabaseurl = import.meta.env.VITE_SUPABASE_URL;
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const type = searchParams.get('type');
  const isEditMode = !!id;

  const [entityOptions, setEntityOptions] = useState([])
  const [selectedEntity, selectEntity] = useState(type || null);
  const [Name, setName] = useState("")
  const [namePlaceholder, setNamePlaceholder] = useState("")
  const [dropdownPlaceholder, setPlaceholder] = useState("")
  const [clearSelection, setClearSelection] = useState(false)
  const [Entity, setEntity] = useState({
    square_footage: '',
    label: '',
    image: '',
    imageType: '',
    suite: '',
    city: '',
    state: "",
    zip: '',
  });
  const [initialData, setInitialData] = useState({})
  const [Parent, setParent] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [errors, setErrors] = useState({});
  const [editImage, setEditImage] = useState('')

  useEffect(() => {
    if(!roleData) return
    const options = [
      ...(roleData.Create_Properties ? ["Property"] : []),
      ...(roleData.Create_Unit ? ["Unit"] : [])
    ]
    setEntityOptions(options)

  }, [roleData])

  useEffect(() => {
    if (!session || !userData || !selectedEntity) return;

    const loadData = async () => {
      let data
      if (selectedEntity === 'Unit') {
        data = await getTable('properties', 'pm_company', userData.company_id)
        if (!data) return;
        setParent(data);
        setName("Unit Address");
        setNamePlaceholder("Enter Address");
        setPlaceholder("Select Property");
      }

      if (selectedEntity === 'Property') {
        data = await getTable('building_owner', 'company_id', userData.company_id)
        if (!data) return;
        setParent(data);
        setName("Property Name");
        setNamePlaceholder("Enter Property Name");
        setPlaceholder("Select Owner");
      }

      if (isEditMode) {
        const table = selectedEntity === 'Unit' ? 'Units' : 'properties';
        const column = selectedEntity === 'Unit' ? 'unit_id' : 'prop_id';
        const result = await getTable(table, column, id);
        if (!result?.[0]) return;
        const item = result[0];
        const image = await get_entity_image(item.photo_file_path, session);
        setEditImage(image);
        const payload = {
          label: selectedEntity === 'Unit' ? item.address : item.Property_Name,
          square_footage: item.square_footage || '',
          image: '',
          imageType: '',
          suite: item.Suite || '',
          city: item.City || '',
          state: item.State || '',
          zip: item.Zip_Code || ''
        }
        setEntity(payload);
        setInitialData({ ...payload, image });

        const parentKey = selectedEntity === 'Unit' ? 'property_id' : 'owner_id';
        const pKey2 = selectedEntity === 'Unit' ? 'prop_id' : 'owner_id';
        const selected = (data || []).find((p) => p[pKey2] === item[parentKey]);
        setSelectedParent(selected);
      }
    };

    loadData();
  }, [session, userData, selectedEntity, isEditMode]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setEntity((prev) => ({ ...prev, [name]: value }));
  };

  const hasChanged = async () => {
    const { image: initialImage, ...initialRest } = initialData;
    const { image: currentImage, ...currentRest } = Entity;

    const baseChanged = JSON.stringify(initialRest) !== JSON.stringify(currentRest);
    const imageChanged = currentImage?.startsWith("data:") || (currentImage && currentImage !== initialImage);

    return baseChanged || imageChanged;
  };

  const Submit = async () => {
    if (isEditMode && !(await hasChanged())) {
      console.log("No changes detected — skipping update.");
      return;
    }

    const newErrors = {};
    if (!Entity.label) newErrors.label = true;
    if (!selectedParent) newErrors.parent = true;
    if (selectedEntity === 'Property') {
      if (!Entity.city) newErrors.city = true;
      if (!Entity.state) newErrors.state = true;
      if (!Entity.zip) newErrors.zip = true;
    }
    if (selectedEntity === "Unit") {
      console.log(Entity.suite)
      if (!Entity.suite) {
        newErrors.suite = true;

      }
      if (!Entity.square_footage) {
        newErrors.square_footage = true;
        
      }
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const imageBase64 = Entity.image ? await fileToBase64(Entity.image) : null;
    let payload;
    let endpoint;
    if (selectedEntity === "Unit") {
      payload = {
        unitId: id,
        square_footage: Entity.square_footage,
        property_id: selectedParent.prop_id,
        address: Entity.label,
        suite: Entity.suite,
        image: imageBase64,
        imageType: Entity.imageType,
        user_id: session.user.id,
        company_id: userData.company_id,
      };
      endpoint = 'CreateUnit';
    }

    if (selectedEntity === "Property") {
      payload = {
        propertyId: id,
        square_footage: Entity.square_footage,
        name: Entity.label,
        owner_id: selectedParent.owner_id,
        image: imageBase64,
        imageType: Entity.imageType,
        user_id: session.user.id,
        company_id: userData.company_id,
        city: Entity.city,
        state: Entity.state,
        zip: Entity.zip
      };
      endpoint = 'CreateProperty';
    }

    const response = await fetch(`${supabaseurl}/functions/v1/${endpoint}`, {
      method: isEditMode ? 'PUT' : 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error(endpoint + ' error:', result);
      alert(result.error || `Failed to ${isEditMode ? 'update' : 'create'} entity.`);
      return;
    }

    navigate('/dashboard');
  };
  return (
    <div>
      <div className="flex items-center justify-center mt-5 text-2xl">
        <h1>{isEditMode ? 'Edit' : 'Create'} Property/Unit</h1>
      </div>

      <DisplayBox className="flex flex-row justify-between">
        <div className="flex flex-col p-6 w-1/2">
          {!isEditMode && (
            <Dropdown options={entityOptions}
              onSelect={(entity) => {
                selectEntity(entity);
                setEntity({ square_footage: '', label: '', image: '', imageType: '', suite: '' });
                setSelectedParent(null);
                setErrors({});
                setClearSelection(true);
              }}
              placeholder='Unit or Property' />
          )}

          {selectedEntity && (
            <>
              {selectedEntity === "Unit" && (
                <div className='mt-4'>
                  <h2 className='text-xl'>Unit Suite</h2>
                  <input
                    className={`bg-gray-700 p-4 rounded w-full border ${errors.suite ? 'border-red-500' : 'border-gray-300'}`}
                    type="number"
                    name="suite"
                    placeholder='Enter Suite Name'
                    value={Entity.suite}
                    onChange={handleChange} />
                </div>
              )}
              <div className='mt-4'>
                <h2 className="text-xl">{Name}</h2>
                <input
                  className={`bg-gray-700 p-4 rounded w-full border ${errors.label ? 'border-red-500' : 'border-gray-300'}`}
                  type="text"
                  name="label"
                  placeholder={namePlaceholder}
                  value={Entity.label}
                  onChange={handleChange}
                />
              </div>
              {selectedEntity === "Unit" && (
                <div>
                  <h2 className="text-xl mt-4">Square Footage</h2>
                  <input
                    className={`bg-gray-700 p-4 rounded w-full border ${errors.square_footage ? 'border-red-500' : 'border-gray-300'}`}
                    type="number"
                    name="square_footage"
                    placeholder="Enter Unit Square Footage"
                    value={Entity.square_footage}
                    onChange={handleChange}
                  />
                </div>
              )}
              {selectedEntity === "Property" && (

                <div>
                  <div>
                    <h2 className="text-xl mt-4">City</h2>
                    <input
                      className={`bg-gray-700 p-4 rounded w-full border ${errors.city ? 'border-red-500' : 'border-gray-300'}`}
                      type="text"
                      name="city"
                      placeholder="Enter Unit Square Footage"
                      value={Entity.city}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <h2 className="text-xl mt-4">State</h2>
                    <input
                      className={`bg-gray-700 p-4 rounded w-full border ${errors.state ? 'border-red-500' : 'border-gray-300'}`}
                      type="text"
                      name="state"
                      placeholder="Enter Unit Square Footage"
                      value={Entity.state}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <h2 className="text-xl mt-4">Zip Code</h2>
                    <input
                      className={`bg-gray-700 p-4 rounded w-full border ${errors.zip ? 'border-red-500' : 'border-gray-300'}`}
                      type="text"
                      name="zip"
                      placeholder="Enter Unit Square Footage"
                      value={Entity.zip}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              )}
              <div className="mt-4">
                <Dropdown
                  options={Parent}
                  value={selectedParent}
                  onSelect={setSelectedParent}
                  placeholder={dropdownPlaceholder}
                  getOptionId={(option) => option.prop_id || option.owner_id}
                  getOptionTitle={(option) => option.Property_Name || option.owner_name}
                  clearSelection={clearSelection}
                />


                {errors.parent && (
                  <p className="text-red-500 text-sm">Selection is required.</p>
                )}
              </div>
              <div className="mt-6">
                <button
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={Submit}
                >
                  Submit
                </button>
              </div>
            </>
          )}
        </div>

        <UploadImage
          onImageSelect={(file) =>
            setEntity((prev) => ({
              ...prev,
              image: file,
              imageType: file.type,
            }))
          }
          showPreview={false}
        />
        {(Entity.image || editImage) && (
          <img
            src={editImage || URL.createObjectURL(Entity.image)}
            alt="Preview"
            className="w-32 h-32 object-cover mt-4 rounded"
          />
        )}
      </DisplayBox>
    </div>
  );
};

export default CreateUnitProperty;