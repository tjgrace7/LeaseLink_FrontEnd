import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useNavigate } from 'react-router-dom';

import DisplayBox from '../components/DisplayBox';
import UploadImage from '../components/upload_image';
import Dropdown from '../components/dropdown';

import { supabase } from '../supabaseClient';
import { fileToBase64 } from '../utilities/imageConverter';

const CreateUnitProperty = () => {
  const { session, userData } = useAuth();
  const navigate = useNavigate();
  const supabaseurl = import.meta.env.VITE_SUPABASE_URL;
  const [selectedEntity, selectEntity] = useState(null);
  const [Name, setName] = useState("")
  const [namePlaceholder, setNamePlaceholder] = useState("")
  const [dropdownPlaceholder, setPlaceholder] = useState("")
  const [clearSelection, setClearSelection] = useState(false)
  // Form state
  const [Entity, setEntity] = useState({
    square_footage: '',
    label: '',
    image: '',
    imageType: '',
    suite: ''
  });

  const [Parent, setParent] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [errors, setErrors] = useState({});

  // 🔄 Fetch properties for the current user's company
  useEffect(() => {
    if (!session || !userData) return;
    if (selectedEntity === 'Unit') {
      const fetchProperties = async () => {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('pm_company', userData.company_id);

        if (error) {
          console.error('Properties Retrieval Error', error);
        } else {
          setParent(data);
        }
      };
      fetchProperties();
      setName("Unit Address")
      setNamePlaceholder("Enter Address")
      setPlaceholder("Select Property")
    }
    if (selectedEntity === 'Property') {
      console.log("Property")
      const getOwners = async () => {
        const { data, error } = await supabase
          .from('building_owner')
          .select('*')
          .eq('company_id', userData.company_id);

        if (error) {
          console.error('Building Owner Retrieval Error', error);
        } else {

          setParent(data);
        }
      };

      getOwners();
      setName("Property Name")
      setNamePlaceholder("Enter Property Name")
      setPlaceholder("Select Owner")
      setClearSelection(false)
    }
  }, [session, userData, selectedEntity]);

  // 🔠 Handle form field changes
  const handleChange = (event) => {
    const { name, value } = event.target;
    setEntity((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Validate and submit form
  const Submit = async () => {
    const newErrors = {};

    if (!Entity.label) newErrors.label = true;
    if (!Entity.square_footage) newErrors.square_footage = true;
    if (!selectedParent) newErrors.parent = true
    if (selectedEntity === "Unit" && !Entity.suite) newErrors.suite = true;
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const imageBase64 = Entity.image ? await fileToBase64(Entity.image) : null;
    let payload;
    let endpoint;

    if (selectedEntity === "Unit") {
      payload = {
        square_footage: Entity.square_footage,
        property_id: selectedParent.prop_id,
        address: Entity.label,
        image: imageBase64,
        user_id: session.user.id,
        company_id: userData.company_id,
        imageType: Entity.imageType || 'application/octet-stream',
        suite: Entity.suite

      }
      endpoint = "CreateUnit"
    }
    if (selectedEntity === "Property") {
      payload = {
        square_footage: Entity.square_footage,
        owner_id: selectedParent.owner_id,
        name: Entity.label,
        image: imageBase64,
        user_id: session.user.id,
        company_id: userData.company_id,
        imageType: Entity.imageType || 'application/octet-stream',
      }
      endpoint = "CreateProperty"
    }
    console.log(payload)

    const response = await fetch(`${supabaseurl}/functions/v1/${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('CreateProperty error:', result);
      alert(result.error || 'Failed to create property.');
      return;
    }

    console.log('Entity Created', result);
    navigate('/dashboard');
  };

  return (
    <div>
      <div className="flex items-center justify-center mt-5 text-2xl">
        <h1>Create Property/Unit</h1>
      </div>

      <DisplayBox className="flex flex-row justify-between">

        {/* Left side: form */}
        <div className="flex flex-col p-6 w-1/2">
          <Dropdown options={["Property", "Unit"]}
            onSelect={(entity) => {
              selectEntity(entity)
              setEntity({
                square_footage: '',
                label: '',
                image: '',
                imageType: '',
                suite: ''
              })
              setSelectedParent([])
              setErrors([])
              setClearSelection(true)
            
            }}
            placeholder='Unit or Property' />
          {selectedEntity && (
            <>
              {selectedEntity === "Unit" && (
                <div className='mt-4'>
                  <h2 className='text-xl'>Unit Suite</h2>
                  <input
                    className={`bg-gray-700 p-4 rounded w-full border ${errors.suite ? 'border-red-500' : 'border-gray-300'
                      }`}
                    type="text"
                    name="suite"
                    placeholder='Enter Suite Name'
                    value={Entity.suite}
                    onChange={handleChange} />
                </div>
              )}
              <div className='mt-4'>
                <h2 className="text-xl">{Name}</h2>
                <input
                  className={`bg-gray-700 p-4 rounded w-full border ${errors.label ? 'border-red-500' : 'border-gray-300'
                    }`}
                  type="text"
                  name="label"
                  placeholder={namePlaceholder}
                  value={Entity.label}
                  onChange={handleChange}
                />
              </div>

              <div>
                <h2 className="text-xl mt-4">Square Footage</h2>
                <input
                  className={`bg-gray-700 p-4 rounded w-full border ${errors.square_footage ? 'border-red-500' : 'border-gray-300'
                    }`}
                  type="text"
                  name="square_footage"
                  placeholder="Enter Unit Square Footage"
                  value={Entity.square_footage}
                  onChange={handleChange}
                />
              </div>

              <div className="mt-4">
                <Dropdown
                  options={Parent}
                  onSelect={setSelectedParent}
                  placeholder={dropdownPlaceholder}
                  getOptionId={(option) => option.prop_id || option.owner_id} // ✅ Fixed
                  getOptionTitle={(option) => option.Property_Name || option.owner_name}
                  clearSelection={clearSelection}
                />
                {errors.parent && (
                  <p className="text-red-500 text-sm">Property selection is required.</p>
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

        {/* Right side: image uploader */}
        <UploadImage
          onImageSelect={(file) =>
            setEntity((prev) => ({
              ...prev,
              image: file,
              imageType: file.type,
            }))
          }
        />
      </DisplayBox>
    </div>
  );
};

export default CreateUnitProperty;
