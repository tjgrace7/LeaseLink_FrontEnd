// src/components/AuthProvider.jsx
// Global authentication context for the LeaseLink app.
//
// Provides:
//   session          - The active Supabase session (undefined while loading, null if unauthenticated).
//   userData         - Row from User_Data table for the authenticated user.
//   roleData         - Row from Roles table corresponding to the user's role_id.
//   loadingUserData  - True while userData is being fetched.
//   baseAccess       - Boolean; company has Base_Function feature enabled.
//   emailAccess      - Boolean; company has Email_Function feature enabled.
//   propertyChat     - Boolean; company has propertyChat feature enabled.
//   extraction       - Boolean; company has Extraction_Check feature enabled.
//   setFrontEndCompany   - (companyId) => void — Admin-only: switches the active company context
//                          (persisted in localStorage as "activeCompanyId").
//   clearFrontEndCompany - () => void — Resets active company back to the user's own company.
//
// Usage: wrap your app in <AuthProvider> and access via the useAuth() hook.

import { createContext, useEffect, useState, useContext } from 'react';
import { supabase } from '../supabaseClient';

// Create the authentication context
const AuthContext = createContext();
const log = (...args) => console.log('[Auth]', ...args);
/**
 * AuthProvider wraps your app and provides session and user data context
 */
export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(undefined);      // Supabase session
  const [userData, setUserData] = useState(null);         // Custom user data from 'User_Data' table
  const [roleData, setRoleData] = useState(null)
  const [loadingUserData, setLoadingUserData] = useState(true); // Loading state for user data
  const [effectiveCompanyId, setEffectiveCompanyId] = useState('')
  const [emailAccess, setEmailAccess] = useState(false)
  const [baseAccess, setBaseAccess] = useState(false)
  const [propertyChat, setPropertyChat] = useState(false)
  const [extraction, setExtraction] = useState(false)

  // Fetch session and listen for changes on component mount
  useEffect(() => {
    if (!userData) return
    log(effectiveCompanyId)

  }, [effectiveCompanyId, userData])
  useEffect(() => {
    const getInitialSession = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      setSession(session);

      if (session?.user) {
        await fetchUserData(session.user.id);
      }
    };

    getInitialSession();

    // Listen for auth state changes (login, logout, etc.)
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (!session) setUserData(null);
    });

    // Clean up listener on unmount
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // When session updates (e.g. after login), fetch extended user data
  useEffect(() => {
    if (session?.user) {
      fetchUserData(session.user.id);
    }
  }, [session]);

  /**
   * Fetch additional user data from Supabase table `User_Data`
   */
  const fetchUserData = async (authId) => {
    setLoadingUserData(true);
    try {
      const { data, error } = await supabase
        .from('User_Data')
        .select('*')
        .eq('auth_id', authId)
        .single();

      if (error) {
        console.error('Error loading extended user data:', error);
        return;
      }
      if (localStorage.getItem('activeCompanyId') === null) {
        localStorage.setItem('activeCompanyId', data.company_id)
      }
      const { data: roleData, error: roleError } = await supabase.from('Roles').select('*').eq('id', data.role_id).single()
      if (roleError) {
        console.error("Error Fetching User Role", roleError)
        return;
      }
      setRoleData(roleData)
      setUserData(data);
      const {data: companyData, error: companyError} = await supabase.from("Property_Management_Companies").select("Base_Function, Email_Function, propertyChat, Extraction_Check").eq('company_id', data.company_id).single()
      if (companyError)
      {
        console.error("Error Fetching Company Data", companyError)
        return;
      }
      console.log("Extraction Check", companyData.Extraction_Check)
      setEmailAccess(companyData.Email_Function)
      setBaseAccess(companyData.Base_Function)
      setPropertyChat(companyData.propertyChat)
      setExtraction(companyData.Extraction_Check)
      
    } catch (err) {
      console.error('FetchUserData Error:', err);
    } finally {
      setLoadingUserData(false);
    }
  };
  // Allows Admin users to impersonate another company's context for support/testing.
  // No-ops for non-admin roles. Updates both React state and localStorage so all
  // downstream calls that read "activeCompanyId" will use the new company.
  const setFrontEndCompany = async (companyId) => {
    if (roleData.Role_Name != "Admin") return
    setEffectiveCompanyId(companyId)
    localStorage.setItem('activeCompanyId', companyId)

  }
  // Resets the active company back to the authenticated user's own company_id.
  const clearFrontEndCompany = () => {
    setEffectiveCompanyId(null)
    localStorage.setItem('activeCompanyId', userData.company_id)
  }

  return (
    <AuthContext.Provider value={{ session, userData, loadingUserData, roleData, setFrontEndCompany, clearFrontEndCompany, baseAccess, emailAccess, propertyChat, extraction }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to access auth context in any component
export const useAuth = () => useContext(AuthContext);
