// src/pages/Properties.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { supabase } from '../supabaseClient';
import { useAuth } from '../components/AuthProvider';
import EntityListBox from '../components/EntityListBox';

/**
 * Properties
 * Displays a list of properties for the current user's company.
 */
const Properties = () => {
  const { session, userData } = useAuth();
  const navigate = useNavigate();

  const [properties, setProperties] = useState([]);

  /**
   * Fetch properties belonging to the user's company
   */
  useEffect(() => {
    if (!userData) return;

    const getProperties = async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('pm_company', userData.company_id);

      if (error) {
        console.error('No Properties Returned', error.message, error.details);
      } else {
        setProperties(data);
      }
    };

    getProperties();
  }, [userData]);

  /**
   * Navigate to individual property page
   */
  const selectProperty = (property_id) => {
    // TODO: Add PermissionGate for secured access
    navigate(`/property/${property_id}`);
  };

  if (!userData) {
    return <div className="text-white text-center">Loading Properties...</div>;
  }

  return (
    <div className="p-20">
      <EntityListBox
        type="properties"
        entities={properties}
        selectEntity={selectProperty}
        getEntityLabel={(property) => property.Property_Name || 'Unnamed Property'}
        getEntityId={(property) => property.prop_id}
        Label="Properties"
      />
    </div>
  );
};

export default Properties;
