// src/pages/Settings.jsx (refactor)
// Mobile-first, accessible, commented, and UI-polished

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';
import DisplayBox from '../components/DisplayBox';
import { useNavigate } from 'react-router-dom';
import { FiEdit, FiPlus } from 'react-icons/fi';
import { getTable } from '../utilities/supabaseCalls';

/**
 * Settings
 * ------------------------------------------------------------
 * Tabs: Company • Users • Roles • Subscription
 * - Mobile-first tabs (buttons) with role-gated visibility
 * - Minimal selects + consolidated data loading
 * - Loading and empty states
 */
const Settings = () => {
  const navigate = useNavigate();
  const { roleData, session, userData } = useAuth();

  // ——— Tab state — default to the first permitted tab
  const firstAllowedTab = useMemo(() => {
    if (!roleData) return '';
    if (roleData.Edit_Company) return 'Company';
    if (roleData.View_Other_Users) return 'Users';
    if (roleData.Edit_Roles) return 'Roles';
    if (roleData.Edit_Subscription) return 'Subscription';
    return '';
  }, [roleData]);

  const [tab, setTab] = useState('');
  useEffect(() => {
    if (firstAllowedTab) setTab(firstAllowedTab);
  }, [firstAllowedTab]);

  // ——— Company
  const [companyName, setCompanyName] = useState('');
  const [numTenants, setNumTenants] = useState('');

  // ——— Users & Roles
  const [users, setUsers] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [roles, setRoles] = useState([]);

  // ——— Loading/Error
  const [loading, setLoading] = useState({ company: false, users: false, roles: false });
  const [error, setError] = useState({ company: '', users: '', roles: '' });

  // ——— Guards
  const isReady = Boolean(session && userData?.company_id);

  // ——— Load company
  useEffect(() => {
    if (!isReady || !roleData?.Edit_Company) return;
    const loadCompany = async () => {
      setLoading((s) => ({ ...s, company: true }));
      setError((e) => ({ ...e, company: '' }));
      try {
        const res = await getTable('Property_Management_Companies', 'company_id', userData.company_id);
        if (!res || !res[0]) throw new Error('Company not found');
        setCompanyName(res[0].company_name || '');
        setNumTenants(res[0].numTenants ?? '');
      } catch (err) {
        console.error('Company load error', err);
        setError((e) => ({ ...e, company: err?.message || 'Failed to load company.' }));
      } finally {
        setLoading((s) => ({ ...s, company: false }));
      }
    };
    loadCompany();
  }, [isReady, roleData?.Edit_Company, userData?.company_id]);

  // ——— Load users
  useEffect(() => {
    if (!isReady || !roleData?.View_Other_Users) return;
    const loadUsers = async () => {
      setLoading((s) => ({ ...s, users: true }));
      setError((e) => ({ ...e, users: '' }));
      try {
        const res = await getTable('User_Data', 'company_id', userData.company_id);
        setUsers(res || []);
      } catch (err) {
        console.error('Users load error', err);
        setError((e) => ({ ...e, users: err?.message || 'Failed to load users.' }));
      } finally {
        setLoading((s) => ({ ...s, users: false }));
      }
    };
    loadUsers();
  }, [isReady, roleData?.View_Other_Users, userData?.company_id]);

  // ——— Resolve user role names
  useEffect(() => {
    if (!users.length) { setUserRoles([]); return; }
    let cancelled = false;
    const resolveRoles = async () => {
      try {
        const results = await Promise.all(
          users.map(async (u) => {
            if (!u.role_id) return { ...u, role: 'Unassigned' };
            const r = await getTable('Roles', 'id', u.role_id);
            return { ...u, role: r?.[0]?.Role_Name ?? 'Unknown' };
          })
        );
        if (!cancelled) setUserRoles(results);
      } catch (err) {
        console.error('User role resolve error', err);
      }
    };
    resolveRoles();
    return () => { cancelled = true; };
  }, [users]);

  // ——— Load roles list
  useEffect(() => {
    if (!isReady || !roleData?.Edit_Roles) return;
    const loadRoles = async () => {
      setLoading((s) => ({ ...s, roles: true }));
      setError((e) => ({ ...e, roles: '' }));
      try {
        const res = await getTable('Roles', 'company_id', userData.company_id);
        setRoles(res || []);
      } catch (err) {
        console.error('Roles load error', err);
        setError((e) => ({ ...e, roles: err?.message || 'Failed to load roles.' }));
      } finally {
        setLoading((s) => ({ ...s, roles: false }));
      }
    };
    loadRoles();
  }, [isReady, roleData?.Edit_Roles, userData?.company_id]);

  // ——— Tab button atom
  const TabButton = ({ isActive, onClick, children }) => (
    <button
      className={`px-3 py-2 rounded-xl border text-sm sm:text-base transition ${
        isActive ? 'bg-white/20 border-white/20' : 'bg-white/5 border-white/10 hover:bg-white/10'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );

  return (
    <div className="px-4 sm:px-6 md:px-8 py-6">
      {/* Tabs header */}
      <div className="flex flex-wrap gap-2 mb-4">
        {roleData?.Edit_Company && (
          <TabButton isActive={tab === 'Company'} onClick={() => setTab('Company')}>
            Company Settings
          </TabButton>
        )}
        {roleData?.View_Other_Users && (
          <TabButton isActive={tab === 'Users'} onClick={() => setTab('Users')}>
            Users
          </TabButton>
        )}
        {roleData?.Edit_Roles && (
          <TabButton isActive={tab === 'Roles'} onClick={() => setTab('Roles')}>
            Roles
          </TabButton>
        )}
        {roleData?.Edit_Subscription && (
          <TabButton isActive={tab === 'Subscription'} onClick={() => setTab('Subscription')}>
            Subscription
          </TabButton>
        )}
      </div>

      <DisplayBox className="p-4 sm:p-5 md:p-6">
        {/* Company */}
        {tab === 'Company' && (
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">Company</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold opacity-80">Company Name</h3>
                <p className="text-lg mt-1">{loading.company ? '—' : companyName}</p>
                {error.company && <p className="text-sm text-red-300 mt-1">{error.company}</p>}
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold opacity-80">Number of Tenants</h3>
                <p className="text-lg mt-1">{loading.company ? '—' : numTenants}</p>
              </div>
            </div>
          </div>
        )}

        {/* Users */}
        {tab === 'Users' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl sm:text-2xl font-semibold">Users</h2>
            </div>
            {loading.users ? (
              <div className="space-y-2">
                <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
                <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
                <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
              </div>
            ) : userRoles.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                <p>No users found.</p>
              </div>
            ) : (
              <ul className="divide-y divide-white/10 rounded-2xl overflow-hidden border border-white/10">
                {userRoles.map((user) => {
                  const profileType = 'User Profile';
                  return (
                    <li key={user.user_id}>
                      <div className="flex items-center justify-between px-4 py-3 space-x-2">
                        <div className="min-w-0">
                          <p className="text-base font-medium truncate">{user.Name}</p>
                          <p className="text-sm opacity-70 truncate">{user.role}</p>
                        </div>
                        <button
                          onClick={() => navigate(`/edit_person/edit?id=${user.user_id}&type=${profileType}`)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15"
                          title="Edit user"
                        >
                          <FiEdit size={18} />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {error.users && <p className="text-sm text-red-300 mt-2">{error.users}</p>}
          </div>
        )}

        {/* Roles */}
        {tab === 'Roles' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl sm:text-2xl font-semibold">Roles</h2>
              <button
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15"
                onClick={() => navigate('/roles')}
              >
                <FiPlus size={18} />
                <span>Create Role</span>
              </button>
            </div>
            {loading.roles ? (
              <div className="space-y-2">
                <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
                <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
              </div>
            ) : roles.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                <p>No roles yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-white/10 rounded-2xl overflow-hidden border border-white/10">
                {roles.map((role) => (
                  <li key={role.id}>
                    <div className="flex items-center justify-between px-4 py-3 space-x-2">
                      <p className="text-base font-medium">{role.Role_Name}</p>
                      {role.Role_Name !== 'Company Admin' && (
                        <button
                          onClick={() => navigate(`/roles/edit/${role.id}`)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15"
                          title="Edit role"
                        >
                          <FiEdit size={18} />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {error.roles && <p className="text-sm text-red-300 mt-2">{error.roles}</p>}
          </div>
        )}

        {/* Subscription */}
        {tab === 'Subscription' && (
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold mb-2">Subscription</h2>
            <p className="opacity-80">Coming soon! Currently in testing.</p>
          </div>
        )}
      </DisplayBox>
    </div>
  );
};

export default Settings;
