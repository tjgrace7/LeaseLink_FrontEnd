import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useNavigate } from 'react-router-dom';

import DisplayBox from '../components/DisplayBox';
import UploadImage from '../components/upload_image';
import Dropdown from '../components/dropdown';

import { supabase } from '../supabaseClient';
import { fileToBase64 } from '../utilities/imageConverter';

const CreateUnit = () => {
  const { session, userData } = useAuth();
  const navigate = useNavigate();
  const supabaseurl = import.meta.env.VITE_SUPABASE_URL;

  // Form state
  const [Unit, setUnit] = useState({
    square_footage: '',
    address: '',
    image: '',
    imageType: '',
  });

  const [Properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [errors, setErrors] = useState({});

  // 🔄 Fetch properties for the current user's company
  useEffect(() => {
    if (!session || !userData) return;
    const fetchProperties = async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('pm_company', userData.company_id);

      if (error) {
        console.error('Properties Retrieval Error', error);
      } else {
        console.log(data)
        setProperties(data);
      }
    };

    fetchProperties();
  }, [session, userData]);

  // 🔠 Handle form field changes
  const handleChange = (event) => {
    const { name, value } = event.target;
    setUnit((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Validate and submit form
  const Submit = async () => {
    const newErrors = {};
    if (!Unit.name) newErrors.name = true;
    if (!Unit.square_footage) newErrors.square_footage = true;
    if (!selectedProperty) newErrors.property = true;

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const imageBase64 = Unit.image ? await fileToBase64(Unit.image) : null;

    console.log(Unit.address, selectedProperty.prop_id, Unit.square_footage)
    const response = await fetch(`${supabaseurl}/functions/v1/CreateUnit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        square_footage: Unit.square_footage,
        property_id: selectedProperty.prop_id,
        address: Unit.address,
        image: imageBase64,
        user_id: session.user.id,
        company_id: userData.company_id,
        imageType: Unit.imageType || 'application/octet-stream',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('CreateUnit error:', result);
      alert(result.error || 'Failed to create unit.');
      return;
    }

    console.log('Unit created:', result);
    navigate('/dashboard');
  };

  return (
    <div>
      <div className="flex items-center justify-center mt-5 text-2xl">
        <h1>Create Unit</h1>
      </div>

      <DisplayBox className="flex flex-row justify-between">
        {/* Left side: form */}
        <div className="flex flex-col p-6 w-1/2">
          <div>
            <h2 className="text-xl">Unit Address</h2>
            <input
              className={`bg-gray-700 p-4 rounded w-full border ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              type="text"
              name="address"
              placeholder="Enter Address"
              value={Unit.address}
              onChange={handleChange}
            />
          </div>

          <div>
            <h2 className="text-xl mt-4">Square Footage</h2>
            <input
              className={`bg-gray-700 p-4 rounded w-full border ${
                errors.square_footage ? 'border-red-500' : 'border-gray-300'
              }`}
              type="text"
              name="square_footage"
              placeholder="Enter Unit Square Footage"
              value={Unit.square_footage}
              onChange={handleChange}
            />
          </div>

          <div className="mt-4">
            <Dropdown
              options={Properties}
              onSelect={setSelectedProperty}
              placeholder="Select Property"
              getOptionId={(option) => option.prop_id} // ✅ Fixed
              getOptionTitle={(option) => option.Property_Name || option.address}
            />
            {errors.property && (
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
        </div>

        {/* Right side: image uploader */}
        <UploadImage
          onImageSelect={(file) =>
            setUnit((prev) => ({
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

export default CreateUnit;
