// src/pages/ManagingOwner.jsx (refactor with updated heading placement)
// Mobile-first, accessible, commented, and UI-polished

import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { FiEdit } from 'react-icons/fi';
import { useState, useEffect, useMemo, useCallback } from 'react';

import { supabase } from '../supabaseClient';
import { get_entity_image } from '../utilities/get_entity_image';
import DisplayBox from '../components/DisplayBox';

/**
 * ManagingOwner
 * ------------------------------------------------------------
 * Displays an owner's profile (avatar + name) and their properties.
 * Improvements:
 *  - Mobile-first responsive layout with sensible spacing.
 *  - Minimal column selects + ordered lists for consistent UX.
 *  - Loading/empty states + basic error surfacing in console.
 *  - Stable callbacks/memos to avoid unnecessary re-renders.
 *  - Conditional edit button by role permission.
 */
const ManagingOwner = () => {
  const { session, roleData } = useAuth();
  const { owner_id } = useParams();
  const navigate = useNavigate();

  // ——— Local state
  const [ownerName, setOwnerName] = useState('');
  const [image, setImage] = useState('');
  const [properties, setProperties] = useState([]);

  const [loading, setLoading] = useState({ owner: false, properties: false });
  const [error, setError] = useState({ owner: '', properties: '' });

  // ——— Derived permissions (memoized)
  const canEdit = useMemo(() => Boolean(roleData?.Edit_Owner), [roleData]);

  // ——— Navigation helpers (stable references)
  const goEdit = useCallback(() => {
    navigate(`/edit_person/edit?id=${owner_id}&type=Building Owner`);
  }, [navigate, owner_id]);

  const goProperty = useCallback((propId) => {
    navigate(`/property/${propId}`);
  }, [navigate]);

  // ——— Fetch owner details + image
  useEffect(() => {
    if (!session || !owner_id) return;

    const getOwner = async () => {
      setLoading((s) => ({ ...s, owner: true }));
      setError((e) => ({ ...e, owner: '' }));
      try {
        const { data, error } = await supabase
          .from('building_owner')
          .select('owner_name, image_file_path')
          .eq('owner_id', owner_id)
          .single();

        if (error) throw error;
        setOwnerName(data?.owner_name || '');

        // Resolve signed image URL if available
        if (data?.image_file_path) {
          const imageUrl = await get_entity_image(data.image_file_path, session);
          if (imageUrl) setImage(imageUrl);
        } else {
          setImage('');
        }
      } catch (err) {
        console.error('Owner load error', err);
        setError((e) => ({ ...e, owner: err?.message || 'Failed to load owner.' }));
      } finally {
        setLoading((s) => ({ ...s, owner: false }));
      }
    };

    getOwner();
  }, [session, owner_id]);

  // ——— Fetch properties owned by this owner
  useEffect(() => {
    if (!owner_id) return;

    const getProperties = async () => {
      setLoading((s) => ({ ...s, properties: true }));
      setError((e) => ({ ...e, properties: '' }));
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('prop_id, Property_Name')
          .eq('owner_id', owner_id)
          .order('Property_Name', { ascending: true });

        if (error) throw error;
        setProperties(data || []);
      } catch (err) {
        console.error('Properties load error', err);
        setError((e) => ({ ...e, properties: err?.message || 'Failed to load properties.' }));
      } finally {
        setLoading((s) => ({ ...s, properties: false }));
      }
    };

    getProperties();
  }, [owner_id]);

  // ——— Small UI atoms
  const Avatar = ({ src, name }) => {
    // Fallback initials if no image
    const initials = (name || '')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return src ? (
      <img
        src={src}
        alt={name || 'Owner avatar'}
        className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-white shadow-md"
      />
    ) : (
      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-md grid place-items-center bg-white/10 text-white text-2xl font-semibold">
        {initials || '?'}
      </div>
    );
  };

  const Empty = ({ title = 'No data', hint }) => (
    <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
      <p className="text-base font-medium">{title}</p>
      {hint && <p className="text-sm opacity-70 mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="px-4 sm:px-6 md:px-10 lg:px-16 xl:px-20 py-6 sm:py-8">
      {/* Header / Profile Card */}
      <div className="w-full max-w-5xl mx-auto bg-lease-gradient rounded-2xl p-5 sm:p-6 md:p-8 flex flex-col sm:flex-row gap-5 sm:gap-8 items-center mb-8">
        {/* Edit button (left on desktop, top-right on mobile) */}
        <div className="w-full sm:w-auto self-stretch sm:self-auto sm:order-1 order-2 flex sm:flex-col items-end sm:items-start">
          {canEdit && (
            <button
              onClick={goEdit}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 transition border border-white/15 text-white"
              title="Edit owner"
            >
              <FiEdit size={18} />
              <span className="text-sm font-medium">Edit</span>
            </button>
          )}
        </div>

        {/* Avatar + Name */}
        <div className="flex-1 sm:order-2 order-1 flex flex-col items-center text-center gap-4">
          {/* Loading skeleton for avatar */}
          {loading.owner ? (
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white/20 animate-pulse" />
          ) : (
            <Avatar src={image} name={ownerName} />
          )}

          <div className="text-white">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold">
              {ownerName || (loading.owner ? 'Loading…' : 'Unnamed Owner')}
            </h1>
            {error.owner && (
              <p className="text-red-200 text-sm mt-1" role="alert">{error.owner}</p>
            )}
          </div>
        </div>
      </div>

      {/* Properties List */}
      <div className="w-full max-w-5xl mx-auto">
        <DisplayBox className="p-4 sm:p-5 md:p-6 flex-col">
          {/* Section title ABOVE the list */}
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-4">
            Properties Owned
          </h2>

          {/* Loading state */}
          {loading.properties ? (
            <div className="space-y-3">
              <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
              <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
              <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
            </div>
          ) : properties.length === 0 ? (
            <Empty title="No properties found" hint="When you add properties for this owner, they will show up here." />
          ) : (
            <ul className="divide-y divide-white/10 rounded-2xl overflow-hidden border border-white/10 w-1/2">
              {properties.map((property) => (
                <li key={property.prop_id}>
                  <button
                    onClick={() => goProperty(property.prop_id)}
                    className="w-full text-left px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-white/10 transition flex items-center justify-between"
                  >
                    <span className="text-base sm:text-lg text-white/90">
                      {property.Property_Name || 'Unnamed Property'}
                    </span>
                    <span className="text-sm opacity-60">View</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error.properties && (
            <p className="text-red-300 text-sm mt-3" role="alert">{error.properties}</p>
          )}
        </DisplayBox>
      </div>
    </div>
  );
};

export default ManagingOwner;