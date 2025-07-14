import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useNavigate } from 'react-router-dom';

import DisplayBox from '../components/DisplayBox';
import UploadImage from '../components/upload_image';
import Dropdown from '../components/dropdown';

import { supabase } from '../supabaseClient';
import { fileToBase64 } from '../utilities/imageConverter';

const CreateProperty = () => {
  const { session, userData } = useAuth();
  const navigate = useNavigate();
  const supabaseurl = import.meta.env.VITE_SUPABASE_URL;

  // Form state
  const [Property, setProperty] = useState({
    square_footage: '',
    name: '',
    image: '',
    imageType: ''
  });

  // Owner selection state
  const [Owners, setOwners] = useState([]);
  const [selectedOwner, setSelectedOwner] = useState(null);

  const [errors, setErrors] = useState({});

  // 🔄 Fetch building owners for the company
  useEffect(() => {
    if (!session || !userData) return;

    const getOwners = async () => {
      const { data, error } = await supabase
        .from('building_owner')
        .select('*')
        .eq('company_id', userData.company_id);

      if (error) {
        console.error('Building Owner Retrieval Error', error);
      } else {
        setOwners(data);
      }
    };

    getOwners();
  }, [session, userData]);

  // 🔠 Handle form field changes
  const handleChange = (event) => {
    const { name, value } = event.target;
    setProperty((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Validate and submit the form
  const Submit = async () => {
    const newErrors = {};
    if (!Property.name) newErrors.name = true;
    if (!Property.square_footage) newErrors.square_footage = true;
    if (!selectedOwner) newErrors.owner = true;

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const imageBase64 = Property.image ? await fileToBase64(Property.image) : null;

    const response = await fetch(`${supabaseurl}/functions/v1/CreateProperty`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        square_footage: Property.square_footage,
        owner_id: selectedOwner.owner_id,
        name: Property.name,
        image: imageBase64,
        user_id: session.user.id,
        company_id: userData.company_id,
        imageType: Property.imageType || 'application/octet-stream',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('CreateProperty error:', result);
      alert(result.error || 'Failed to create property.');
      return;
    }

    console.log('Property created:', result);
    navigate('/dashboard'); // Uncomment when ready
  };

  return (
    <div>
      <div className="flex items-center justify-center mt-5 text-2xl">
        <h1>Create Property</h1>
      </div>

      <DisplayBox className="flex flex-row justify-between">
        {/* Left side: form */}
        <div className="flex flex-col p-6 w-1/2">
          <div>
            <h2 className="text-xl">Property Name</h2>
            <input
              className={`bg-gray-700 p-4 rounded w-full border ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              type="text"
              name="name"
              placeholder="Enter Name"
              value={Property.name}
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
              placeholder="Enter Property Square Footage"
              value={Property.square_footage}
              onChange={handleChange}
            />
          </div>

          <div className="mt-4">
            <Dropdown
              options={Owners}
              onSelect={setSelectedOwner}
              placeholder="Select Owner"
              getOptionId={(option) => option.owner_id}
              getOptionTitle={(option) => option.owner_name}
            />
            {errors.owner && <p className="text-red-500 text-sm">Owner selection is required.</p>}
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
            setProperty((prev) => ({
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

export default CreateProperty;
