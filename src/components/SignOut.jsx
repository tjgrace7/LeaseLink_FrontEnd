// src/components/LogoutButton.jsx

import React from 'react';
import { signOut } from '../utilities/SignOut';
import { useNavigate } from 'react-router-dom';
import { GTMSignOut } from './gtag';

/**
 * LogoutButton
 * Handles user sign-out by clearing localStorage,
 * calling the Supabase signOut utility, and redirecting to login.
 */
const LogoutButton = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    console.log('Sign Out Called');

    // Clear localStorage for clean session
    localStorage.clear();

    // Call custom signOut utility (likely from Supabase)
    const result = await signOut();

    if (result?.error) {
      console.error('Error Signing Out:', result.error.message);
    } else {
      console.log('Signout successful');
      GTMSignOut()
      navigate('/login');
    }
  };

  return (
    <button onClick={handleLogout}>
      Sign Out
    </button>
  );
};

export default LogoutButton;
