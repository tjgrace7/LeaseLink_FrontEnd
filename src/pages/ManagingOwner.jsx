// src/pages/ManagingOwner.jsx

import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { FiEdit } from 'react-icons/fi';
import { useState, useEffect } from 'react';

import { supabase } from "../supabaseClient";
import { get_entity_image } from "../utilities/get_entity_image";
import DisplayBox from "../components/DisplayBox";

/**
 * ManagingOwner
 * Displays managing owner's profile image, name, and associated properties.
 */
const ManagingOwner = () => {
  const { session } = useAuth();
  const { owner_id } = useParams();
  const navigate = useNavigate();

  const [ownerName, setOwnerName] = useState('');
  const [image, setImage] = useState('');
  const [properties, setProperties] = useState([]);

  /**
   * Fetch owner details and image
   */
  useEffect(() => {
    if (!session || !owner_id) return;

    const getOwner = async () => {
      const { data, error } = await supabase
        .from('building_owner')
        .select('*')
        .eq('owner_id', owner_id)
        .single();

      if (error) {
        console.error('No Owner Available', error);
        return;
      }

      setOwnerName(data.owner_name);

      const imageUrl = await get_entity_image(data.image_file_path, session);
      if (imageUrl) setImage(imageUrl);
    };

    getOwner();
  }, [session, owner_id]);

  /**
   * Fetch properties owned by this owner
   */
  useEffect(() => {
    if (!owner_id) return;

    const getProperties = async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', owner_id);

      if (error) {
        console.error('No Properties Found', error);
        return;
      }

      setProperties(data);
    };

    getProperties();
  }, [owner_id]);
  //add Edit Navigation
  return (
    <div className="p-20">
      {/* Profile Section */}
      <div className="w-full max-w-4xl bg-lease-gradient rounded-lg p-6 flex space-x-10 mb-20">
        {/* Column 1: Edit Icon */}
        <div className="flex flex-col items-start text-white hover:text-gray-200">
          <button onClick={() => navigate(`/edit_person/edit?id=${owner_id}&type=Building Owner`)}>
            <FiEdit size={24} />
          </button>
        </div>

        {/* Column 2: Owner Image + Name */}
        <div className="flex flex-col items-center justify-center text-center flex-1">
          {image && (
            <img
              src={image}
              alt="Profile"
              className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md mb-4"
            />
          )}
          <div className="text-xl font-semibold text-white">
            {ownerName || 'Unnamed Owner'}
          </div>
        </div>
      </div>

      {/* Property List */}
      <DisplayBox>
        <div>
          <h2 className="text-2xl flex items-center justify-center mb-4">Properties Owned</h2>
          <ul className="space-y-2">
            {properties.map((property) => (
              <li
                key={property.prop_id}
                className="border border-gray-500 text-white px-4 py-2 rounded-shadow"
              >
                <button onClick={() => navigate(`/property/${property.prop_id}`)}>
                  {property.Property_Name || 'Unnamed Property'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </DisplayBox>
    </div>
  );
};

export default ManagingOwner;
