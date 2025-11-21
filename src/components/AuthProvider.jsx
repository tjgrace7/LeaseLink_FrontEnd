// src/components/AuthProvider.jsx

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
      const {data: companyData, error: companyError} = await supabase.from("Property_Management_Companies").select("Base_Function, Email_Function").eq('company_id', data.company_id).single()
      if (companyError)
      {
        console.error("Error Fetching Company Data", companyError)
        return;
      }
      setEmailAccess(companyData.Email_Function)
      setBaseAccess(companyData.Base_Function)
    } catch (err) {
      console.error('FetchUserData Error:', err);
    } finally {
      setLoadingUserData(false);
    }
  };
  const setFrontEndCompany = async (companyId) => {
    if (roleData.Role_Name != "Admin") return
    setEffectiveCompanyId(companyId)
    localStorage.setItem('activeCompanyId', companyId)

  }
  const clearFrontEndCompany = () => {
    setEffectiveCompanyId(null)
    localStorage.setItem('activeCompanyId', userData.company_id)
  }

  return (
    <AuthContext.Provider value={{ session, userData, loadingUserData, roleData, setFrontEndCompany, clearFrontEndCompany, baseAccess, emailAccess }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to access auth context in any component
export const useAuth = () => useContext(AuthContext);
