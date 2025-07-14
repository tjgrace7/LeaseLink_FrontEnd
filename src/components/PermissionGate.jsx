// src/components/PermissionGate.jsx

import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../components/AuthProvider';

/**
 * PermissionGate
 * Conditionally renders `children` based on whether the current user has access
 * to a specific property, unit, or tenant via their user permissions in Supabase.
 *
 * Props:
 * - type: one of 'property', 'unit', or 'tenants'
 * - id: the ID of the entity (property_id, unit_id, tenant_id)
 * - children: content to render if access is granted
 * - fallback: optional fallback to render if access is denied
 */
const PermissionGate = ({ type, id, children, fallback = null }) => {
  const { session, userData } = useAuth();

  const [allowed, setAllowed] = useState(false);   // Tracks whether user is allowed
  const [checking, setChecking] = useState(true);  // Prevents premature render during fetch

  useEffect(() => {
    if (!session || !userData?.id || !id || !type) return;

    const checkAccess = async () => {
      let table, column;

      // Map type to correct permission table and column
      switch (type) {
        case 'property':
          table = 'User_Property';
          column = 'property_id';
          break;
        case 'unit':
          table = 'User_Units';
          column = 'unit_id';
          break;
        case 'tenants':
          table = 'User_Tenant';
          column = 'tenant_id';
          break;
        default:
          console.error('Invalid permission type:', type);
          return;
      }

      // Query the relevant table to see if the user has access
      const { data, error } = await supabase
        .from(table)
        .select(column)
        .eq('user_id', userData.id)
        .eq(column, id)
        .maybeSingle();

      if (error) {
        console.error('Permission Check Error:', error);
        setAllowed(false);
      } else {
        setAllowed(!!data);
      }

      setChecking(false);
    };

    checkAccess();
  }, [session, userData, type, id]);

  // Don't render anything until check is complete
  if (checking) return null;

  // Render children if allowed, else render fallback
  return allowed ? children : fallback;
};

export default PermissionGate;
