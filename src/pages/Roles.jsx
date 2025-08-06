import { useState, useEffect } from "react";
import { useAuth } from "../components/AuthProvider";
import { useNavigate, useParams } from "react-router-dom";
import { getTable } from "../utilities/supabaseCalls";

const Roles = () => {
    const { roleId: roleIdFromURL } = useParams(); // 👈 optionally passed via route param
    const [pageTitle, setPageTitle] = useState(roleIdFromURL ? 'Edit Role' : 'Create Role');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const navigate = useNavigate();
    const { userData, session } = useAuth();

    const [roleName, setRoleName] = useState('');
    const [roleId, setRoleId] = useState(roleIdFromURL || '');

    const [groupVisibility, setGroupVisibility] = useState({
        users: true, properties: true, tenants: true, contacts: true,
        units: true, owners: true, leases: true, questions: true,
        roles: true, settings: true
    });

    const [permissions, setPermissions] = useState({
        createUsers: false, editUsers: false, viewUsers: false, deleteUsers: false,
        createProperties: false, editProperties: false, viewProperties: false, deleteProperties: false,
        createTenants: true, editTenants: true, viewAllTenants: false, deleteTenants: false,
        createContact: true, editContact: true, viewContacts: false, deleteContact: false,
        createUnit: true, editUnit: true, viewUnits: false, deleteUnits: false,
        createOwner: true, editOwner: true, viewOwners: false, deleteOwner: false,
        uploadLeases: true, viewAllLeases: false, deleteLeases: false,
        askQuestions: true, viewOldQuestions: false,
        createEditRoles: false, viewRoles: false,
        accessSettings: false, editCompany: false, editSubscription: false
    });

    const permissionGroups = [   {
            key: 'users',
            label: 'User Permissions',
            items: [
                ['createUsers', 'Create Users'],
                ['editUsers', 'Edit Users'],
                ['viewUsers', 'View Users'],
                ['deleteUsers', 'Delete Users']
            ]
        },
        {
            key: 'properties',
            label: 'Property Permissions',
            items: [
                ['createProperties', 'Create Properties'],
                ['editProperties', 'Edit Properties'],
                ['viewProperties', 'View All Properties'],
                ['deleteProperties', 'Delete Properties']
            ]
        },
        {
            key: 'tenants',
            label: 'Tenant Permissions',
            items: [
                ['createTenants', 'Create Tenants'],
                ['editTenants', 'Edit Tenants'],
                ['viewAllTenants', 'View All Tenants'],
                ['deleteTenants', 'Delete Tenants']
            ]
        },
        {
            key: 'contacts',
            label: 'Contact Permissions',
            items: [
                ['createContact', 'Create Contacts'],
                ['editContact', 'Edit Contacts'],
                ['viewContacts', 'View All Contacts'],
                ['deleteContact', 'Delete Contacts']
            ]
        },
        {
            key: 'units',
            label: 'Unit Permissions',
            items: [
                ['createUnit', 'Create Units'],
                ['editUnit', 'Edit Units'],
                ['viewUnits', 'View All Units'],
                ['deleteUnits', 'Delete Units']
            ]
        },
        {
            key: 'owners',
            label: 'Owner Permissions',
            items: [
                ['createOwner', 'Create Owners'],
                ['editOwner', 'Edit Owners'],
                ['viewOwners', 'View All Owners'],
                ['deleteOwner', 'Delete Owners']
            ]
        },
        {
            key: 'leases',
            label: 'Lease Permissions',
            items: [
                ['uploadLeases', 'Upload Leases'],
                ['viewAllLeases', 'View All Leases'],
                ['deleteLeases', 'Delete Leases']
            ]
        },
        {
            key: 'questions',
            label: 'Question Permissions',
            items: [
                ['askQuestions', 'Ask Questions'],
                ['viewOldQuestions', 'View Old Questions']
            ]
        },
        {
            key: 'roles',
            label: 'Role Permissions',
            items: [
                ['createRoles', 'Creat/Edit Roles'],
                ['viewRoles', 'View Roles']
            ]
        },
        {
            key: 'settings',
            label: 'Settings Permissions',
            items: [
                ['accessSettings', 'Access Settings'],
                ['editCompany', 'Edit Company'],
                ['editSubscription', 'Edit Subscription']
            ]
        } ];

    // ✅ Generate new ID if none exists
    useEffect(() => {
        if (roleIdFromURL) setRoleId(roleIdFromURL)
        else setRoleId(crypto.randomUUID());
    }, [roleId]);

    // ✅ Fetch role data if editing
    useEffect(() => {
        if (!roleIdFromURL) return;

        const fetchRole = async () => {
            try {
                const result = await getTable('Roles', 'id', roleIdFromURL)
                if (result) {
                    const r = result[0]
                    console.log(r)
                    setRoleName(r.Role_Name);
                    setPermissions({
                        createUsers: r.Create_Users,
                        editUsers: r.Edit_Users,
                        viewUsers: r.View_Other_Users,
                        deleteUsers: r.Can_Delete_Users,

                        createProperties: r.Create_Properties,
                        editProperties: r.Edit_Properties,
                        viewProperties: r.View_All_Properties,
                        deleteProperties: r.Can_Delete_Properties,

                        createTenants: r.Create_Tenants,
                        editTenants: r.Edit_Tenants,
                        viewAllTenants: r.View_All_Tenants,
                        deleteTenants: r.Can_Delete_Tenants,

                        createContact: r.Create_Contact,
                        editContact: r.Edit_Contact,
                        viewContacts: r.View_All_Contacts,
                        deleteContact: r.Can_Delete_Contact,

                        createUnit: r.Create_Unit,
                        editUnit: r.Edit_Units,
                        viewUnits: r.View_All_Units,
                        deleteUnits: r.Can_Delete_Units,

                        createOwner: r.Create_Owner,
                        editOwner: r.Edit_Owner,
                        viewOwners: r.View_All_Owner,
                        deleteOwner: r.Can_Delete_Owners,

                        askQuestions: r.Ask_Questions,
                        viewOldQuestions: r.View_Previous_Questions,

                        uploadLeases: r.Create_Lease_Documents,
                        viewAllLeases: r.View_Lease_Docs,
                        deleteLeases: r.Delete_Leases,

                        createEditRoles: r.Create_Roles || r.Edit_Roles,
                        viewRoles: r.View_All_Roles,

                        accessSettings: r.Access_Settings,
                        editCompany: r.Edit_Company,
                        editSubscription: r.Edit_Subscription
                    });
                }
            } catch (error) {
                console.error("Error loading role data", error);
            }
        };

        fetchRole();
    }, [roleIdFromURL, session]);

    const Submit = async () => {
        if (!roleName) return;

        try {
            const response = await fetch(`${supabaseUrl}/functions/v1/createEditRoles`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    roleId,
                    roleName,
                    permissions
                })
            });
            console.log(response)
            navigate('/dashboard'); // ✅ redirect on success if needed
        } catch (e) {
            console.error("Error Creating/Updating Role", e);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl underline mb-6">{pageTitle}</h1>
            <p className="text-lg">Create Role Name</p>
            <input
                className="text-black"
                type="text"
                value={roleName}
                placeholder="Enter_Role_Name"
                onChange={(e) => setRoleName(e.target.value)}
            />
            {permissionGroups.map(({ key, label, items }) => (
                <div key={key} className="mt-6">
                    <label className="text-xl font-bold flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={groupVisibility[key]}
                            onChange={(e) => setGroupVisibility(prev => ({ ...prev, [key]: e.target.checked }))}
                        />
                        <p className="underline">{label}</p>
                    </label>

                    {groupVisibility[key] && (
                        <div className="ml-6 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {items.map(([fieldKey, label]) => (
                                <label key={fieldKey} className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={permissions[fieldKey]}
                                        onChange={(e) =>
                                            setPermissions(prev => ({ ...prev, [fieldKey]: e.target.checked }))
                                        }
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            ))}
            <button className='mt-5 bg-white text-black' onClick={Submit}>Submit</button>
        </div>
    );
};

export default Roles;