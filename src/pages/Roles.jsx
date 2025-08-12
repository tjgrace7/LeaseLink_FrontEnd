// src/pages/Roles.jsx (refactor)
// Mobile-first, accessible, commented, and UI-polished

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { getTable } from '../utilities/supabaseCalls';

/**
 * Roles
 * ------------------------------------------------------------
 * Create or edit a Role with grouped permissions.
 * - Mobile-first layout with clear grouping and toggles
 * - Fixes initial ID generation & inconsistent keys
 * - Loading/disabled states + simple validation
 */
const Roles = () => {
  const { roleId: roleIdFromURL } = useParams(); // optional route param for edit mode
  const navigate = useNavigate();
  const { session } = useAuth();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  // ——— Mode & title
  const isEditMode = Boolean(roleIdFromURL);
  const pageTitle = isEditMode ? 'Edit Role' : 'Create Role';

  // ——— Core form state
  const [roleName, setRoleName] = useState('');
  // Generate a UUID only once when not provided by URL
  const [roleId] = useState(() => roleIdFromURL || crypto.randomUUID());

  // Visibility toggles for each permission group (UI only)
  const [groupVisibility, setGroupVisibility] = useState({
    users: true,
    properties: true,
    tenants: true,
    contacts: true,
    units: true,
    owners: true,
    leases: true,
    questions: true,
    roles: true,
    settings: true,
  });

  // IMPORTANT: Keep keys in sync with permissionGroups below
  const [permissions, setPermissions] = useState({
    // Users
    createUsers: false,
    editUsers: false,
    viewUsers: false,
    deleteUsers: false,
    // Properties
    createProperties: false,
    editProperties: false,
    viewProperties: false,
    deleteProperties: false,
    // Tenants
    createTenants: true,
    editTenants: true,
    viewAllTenants: false,
    deleteTenants: false,
    // Contacts
    createContact: true,
    editContact: true,
    viewContacts: false,
    deleteContact: false,
    // Units
    createUnit: true,
    editUnit: true,
    viewUnits: false,
    deleteUnits: false,
    // Owners
    createOwner: true,
    editOwner: true,
    viewOwners: false,
    deleteOwner: false,
    // Leases
    uploadLeases: true,
    viewAllLeases: false,
    deleteLeases: false,
    // Questions
    askQuestions: true,
    viewOldQuestions: false,
    // Roles
    createEditRoles: false, // ← unified key for create/edit
    viewRoles: false,
    // Settings
    accessSettings: false,
    editCompany: false,
    editSubscription: false,
  });

  // Definition of groups shown in the UI
  const permissionGroups = useMemo(() => [
    {
      key: 'users',
      label: 'User Permissions',
      items: [
        ['createUsers', 'Create Users'],
        ['editUsers', 'Edit Users'],
        ['viewUsers', 'View Users'],
        ['deleteUsers', 'Delete Users'],
      ],
    },
    {
      key: 'properties',
      label: 'Property Permissions',
      items: [
        ['createProperties', 'Create Properties'],
        ['editProperties', 'Edit Properties'],
        ['viewProperties', 'View All Properties'],
        ['deleteProperties', 'Delete Properties'],
      ],
    },
    {
      key: 'tenants',
      label: 'Tenant Permissions',
      items: [
        ['createTenants', 'Create Tenants'],
        ['editTenants', 'Edit Tenants'],
        ['viewAllTenants', 'View All Tenants'],
        ['deleteTenants', 'Delete Tenants'],
      ],
    },
    {
      key: 'contacts',
      label: 'Contact Permissions',
      items: [
        ['createContact', 'Create Contacts'],
        ['editContact', 'Edit Contacts'],
        ['viewContacts', 'View All Contacts'],
        ['deleteContact', 'Delete Contacts'],
      ],
    },
    {
      key: 'units',
      label: 'Unit Permissions',
      items: [
        ['createUnit', 'Create Units'],
        ['editUnit', 'Edit Units'],
        ['viewUnits', 'View All Units'],
        ['deleteUnits', 'Delete Units'],
      ],
    },
    {
      key: 'owners',
      label: 'Owner Permissions',
      items: [
        ['createOwner', 'Create Owners'],
        ['editOwner', 'Edit Owners'],
        ['viewOwners', 'View All Owners'],
        ['deleteOwner', 'Delete Owners'],
      ],
    },
    {
      key: 'leases',
      label: 'Lease Permissions',
      items: [
        ['uploadLeases', 'Upload Leases'],
        ['viewAllLeases', 'View All Leases'],
        ['deleteLeases', 'Delete Leases'],
      ],
    },
    {
      key: 'questions',
      label: 'Question Permissions',
      items: [
        ['askQuestions', 'Ask Questions'],
        ['viewOldQuestions', 'View Old Questions'],
      ],
    },
    {
      key: 'roles',
      label: 'Role Permissions',
      items: [
        ['createEditRoles', 'Create/Edit Roles'], // ← fixed key & label typo
        ['viewRoles', 'View Roles'],
      ],
    },
    {
      key: 'settings',
      label: 'Settings Permissions',
      items: [
        ['accessSettings', 'Access Settings'],
        ['editCompany', 'Edit Company'],
        ['editSubscription', 'Edit Subscription'],
      ],
    },
  ], []);

  // ——— Load an existing role when editing
  useEffect(() => {
    if (!isEditMode) return;

    const fetchRole = async () => {
      try {
        const result = await getTable('Roles', 'id', roleIdFromURL);
        if (!result || result.length === 0) return;
        const r = result[0];

        setRoleName(r.Role_Name || '');
        setPermissions((prev) => ({
          ...prev,
          // Users
          createUsers: !!r.Create_Users,
          editUsers: !!r.Edit_Users,
          viewUsers: !!r.View_Other_Users,
          deleteUsers: !!r.Can_Delete_Users,
          // Properties
          createProperties: !!r.Create_Properties,
          editProperties: !!r.Edit_Properties,
          viewProperties: !!r.View_All_Properties,
          deleteProperties: !!r.Can_Delete_Properties,
          // Tenants
          createTenants: !!r.Create_Tenants,
          editTenants: !!r.Edit_Tenants,
          viewAllTenants: !!r.View_All_Tenants,
          deleteTenants: !!r.Can_Delete_Tenants,
          // Contacts
          createContact: !!r.Create_Contact,
          editContact: !!r.Edit_Contact,
          viewContacts: !!r.View_All_Contacts,
          deleteContact: !!r.Can_Delete_Contact,
          // Units
          createUnit: !!r.Create_Unit,
          editUnit: !!r.Edit_Units,
          viewUnits: !!r.View_All_Units,
          deleteUnits: !!r.Can_Delete_Units,
          // Owners
          createOwner: !!r.Create_Owner,
          editOwner: !!r.Edit_Owner,
          viewOwners: !!r.View_All_Owner,
          deleteOwner: !!r.Can_Delete_Owners,
          // Questions
          askQuestions: !!r.Ask_Questions,
          viewOldQuestions: !!r.View_Previous_Questions,
          // Leases
          uploadLeases: !!r.Create_Lease_Documents,
          viewAllLeases: !!r.View_Lease_Docs,
          deleteLeases: !!r.Delete_Leases,
          // Roles (combine)
          createEditRoles: !!(r.Create_Roles || r.Edit_Roles),
          viewRoles: !!r.View_All_Roles,
          // Settings
          accessSettings: !!r.Access_Settings,
          editCompany: !!r.Edit_Company,
          editSubscription: !!r.Edit_Subscription,
        }));
      } catch (error) {
        console.error('Error loading role data', error);
      }
    };

    fetchRole();
  }, [isEditMode, roleIdFromURL, session]);

  // ——— Validation (very simple)
  const canSubmit = useMemo(() => roleName.trim().length > 0 && !!session?.access_token, [roleName, session]);

  // ——— Submit handler
  const [submitting, setSubmitting] = useState(false);
  const onSubmit = useCallback(async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/createEditRoles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ roleId, roleName, permissions }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed: ${res.status}`);
      }

      navigate('/dashboard');
    } catch (e) {
      console.error('Error Creating/Updating Role', e);
      alert('Failed to save role. Check console for details.');
    } finally {
      setSubmitting(false);
    }
  }, [supabaseUrl, session, roleId, roleName, permissions, canSubmit, submitting, navigate]);

  return (
    <div className="px-4 sm:px-6 md:px-8 py-6">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold">{pageTitle}</h1>
        <p className="mt-1 text-sm opacity-80">Define what this role can see and do inside LeaseLink.</p>
      </header>

      {/* Role name */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 md:p-6">
        <label className="block text-sm font-medium mb-2">Role Name</label>
        <input
          className="w-full rounded-xl border border-white/10 bg-white/90 text-black px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/30"
          type="text"
          value={roleName}
          placeholder="e.g., Company Admin"
          onChange={(e) => setRoleName(e.target.value)}
        />
      </section>

      {/* Permission groups */}
      <section className="mt-6 space-y-6">
        {permissionGroups.map(({ key, label, items }) => (
          <div key={key} className="rounded-2xl border border-white/10 bg-white/5">
            <div className="flex items-center justify-between p-4 sm:p-5">
              <label className="inline-flex items-center gap-3">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={groupVisibility[key]}
                  onChange={(e) =>
                    setGroupVisibility((prev) => ({ ...prev, [key]: e.target.checked }))
                  }
                />
                <span className="text-lg font-semibold underline">{label}</span>
              </label>
            </div>

            {groupVisibility[key] && (
              <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {items.map(([fieldKey, itemLabel]) => (
                    <label key={fieldKey} className="flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={!!permissions[fieldKey]}
                        onChange={(e) =>
                          setPermissions((prev) => ({ ...prev, [fieldKey]: e.target.checked }))
                        }
                      />
                      <span>{itemLabel}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Actions */}
      <div className="mt-8 flex gap-3">
        <button
          className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/90 px-4 py-2 text-black font-medium disabled:opacity-60"
          onClick={onSubmit}
          disabled={!canSubmit || submitting}
          title={!canSubmit ? 'Enter a role name to enable' : 'Save role'}
        >
          {submitting ? 'Saving…' : 'Save Role'}
        </button>
        <button
          className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-2 font-medium hover:bg-white/15"
          onClick={() => navigate(-1)}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default Roles;