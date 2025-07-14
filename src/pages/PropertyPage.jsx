// src/pages/PropertyPage.jsx

import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { supabase } from '../supabaseClient';
import { useAuth } from '../components/AuthProvider';

import EntityListBox from '../components/EntityListBox';
import Profile from '../components/Profile';
import LoadPreviousMessages from '../components/PreviousMessages';

/**
 * PropertyPage
 * Displays a property profile, associated units, managing owner, and chat history.
 */
const PropertyPage = () => {
  const { property_id } = useParams();
  const navigate = useNavigate();
  const { session, userData } = useAuth();

  const [property, setProperty] = useState(null);
  const [units, setUnits] = useState(null);

  /**
   * Fetch property data by ID
   */
  useEffect(() => {
    if (!session || !property_id) return;

    const fetchProperty = async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('prop_id', property_id)
        .single();

      if (error) {
        console.error('Error Fetching Property', error);
      } else {
        setProperty(data);
      }
    };

    fetchProperty();
  }, [session, property_id]);

  /**
   * Fetch units linked to this property
   */
  useEffect(() => {
    if (!userData || !property) return;

    const getUnits = async () => {
      const { data, error } = await supabase
        .from('Units')
        .select('*')
        .eq('property_id', property.prop_id);

      if (error) {
        console.error('No Units at Property', error.message, error.details);
      } else {
        setUnits(data);
      }
    };

    getUnits();
  }, [userData, property]);

  /**
   * Navigate to unit page when selected
   */
  const selectUnit = (unit_id) => {
    // TODO: Add PermissionGate check
    navigate(`/unit/${unit_id}`);
  };

  if (!property) {
    return <div className="text-white">Loading Property...</div>;
  }

  return (
    <div className="p-20">
      {/* Property Profile + Managing Owner */}
      <Profile
        entity={property}
        session={session}
        getFilePath={(p) => p.photo_file_path}
        getLabel={(p) => p.Property_Name}
        getRelatedEntity={async (property) => {
          const { data, error } = await supabase
            .from('building_owner')
            .select('*')
            .eq('owner_id', property.owner_id)
            .single();

          if (error) {
            console.error('Error Fetching Owner:', error);
          }

          return data;
        }}
        getRelatedLabel={(o) => o.owner_name}
        getRelatedFilePath={(o) => o.image_file_path}
        getRelatedEntityId={(o) => o.owner_id}
        RelatedTitle="Managing Owner"
        className="w-2/5"
      />

      {/* Units associated with this property */}
      <EntityListBox
        type="units"
        entities={units}
        selectEntity={selectUnit}
        getEntityLabel={(unit) => unit.address || 'Unnamed Unit'}
        getEntityId={(unit) => unit.unit_id}
        Label="Units"
      />

      {/* Previous chat history for this property */}
      <LoadPreviousMessages
        entityId={property_id}
        session={session}
        entityType="property"
        className="mt-6"
      />
    </div>
  );
};

export default PropertyPage;
