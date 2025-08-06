import { useAuth } from "../components/AuthProvider"
import DisplayBox from "../components/DisplayBox";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiEdit } from 'react-icons/fi';
import { getTable } from "../utilities/supabaseCalls";
import { supabase } from '../supabaseClient'

const Settings = () => {
    const { roleData, session, userData } = useAuth();
    const [tab, setTab] = useState('')
    const navigate = useNavigate()


    const [companyName, setCompanyName] = useState('')
    const [numTenants, setNumTenants] = useState('')

    const [users, setUsers] = useState([])
    const [userRoles, setUserRoles] = useState([])
    const [Roles, setRoles] = useState([])
    useEffect(() => {
        if (!roleData) return
        if (roleData.Edit_Company) setTab('Company')
        else if (roleData.View_Other_Users) setTab('Users')
        else if (roleData.Edit_Roles) setTab('Roles')
        else if (roleData.Edit_Subscription) setTab('Edit_Subscription')
        else navigate('/dashboard')
    }, [roleData])

    useEffect(() => {
        if (!session || !userData) return

        const getCompany = async () => {
            const response = await getTable('Property_Management_Companies', 'company_id', userData.company_id)
            if (!response) console.error("Error Fetching Response")
            setCompanyName(response[0].company_name)
            setNumTenants(response[0].numTenants)

        }
        getCompany();
        const getUsers = async () => {
            const response = await getTable('User_Data', 'company_id', userData.company_id)
            if (!response) console.response("Error Fetchng Response")
            setUsers(response)
        }
        getUsers()
        const getRoles = async () => {
            const response = await getTable("Roles", 'company_id', userData.company_id)
            if (!response) console.error("Error Fetching Roles")
            setRoles(response)
        }
        getRoles()
    }, [session, userData])
    useEffect(() => {
        if (!users.length) return

        const getUserRoles = async () => {
            const results = await Promise.all(
                users.map(async (user) => {
                    const role = await getTable('Roles', 'id', user.role_id);
                    return {
                        ...user,
                        role: role[0]?.Role_Name ?? 'Unknown',
                    };
                })
            );

            setUserRoles(results);
        }
        getUserRoles();
    }, [users])
    return (
        <div className="m-4 flex flex-col">
            <div className="flex items-center justify-between w-1/2 mb-4">
                {roleData && roleData.Edit_Company && (
                    <button className={`underline rounded-sm ${tab === 'Company' ? 'bg-lease-gradient' : ''}`} onClick={() => setTab('Company')}>Company Settings</button>
                )}
                {roleData && roleData.View_Other_Users && (
                    <button className={`underline rounded-sm ${tab === 'Users' ? 'bg-lease-gradient' : ''}`} onClick={() => setTab('Users')}>Users</button>
                )}
                {roleData && roleData.Edit_Roles && (
                    <button className={`underline rounded-sm ${tab === 'Roles' ? 'bg-lease-gradient' : ''}`} onClick={() => setTab('Roles')}>Roles</button>
                )}
                {roleData && roleData.Edit_Subscription && (
                    <button className={`underline rounded-sm ${tab === 'Subscription' ? 'bg-lease-gradient' : ''}`} onClick={() => setTab('Subscription')}>Subscription</button>
                )}
            </div>
            <DisplayBox>

                {tab === 'Company' && (
                    <div>
                        <div>
                            <h2 className="underline tx-lg">Company Name</h2>
                            <p className="tx-md">{companyName}</p>
                        </div>
                        <div className="mt-4">
                            <h2 className="underline tx-lg">Number of Tenants</h2>
                            <p className="tx-md">{numTenants}</p>
                        </div>
                    </div>
                )}
                {tab === 'Users' && (
                    <div>
                        <h1 className="underline text-2xl">Users</h1>
                        <ul>
                            {userRoles.map((user) => {
                                const profile = 'User Profile';

                                return (
                                    <li key={user.user_id} className="flex items-center justify-between mt-5">
                                        <button
                                            key={user.user_id}
                                            onClick={() => navigate(`/edit_person/edit?id=${user.user_id}&type=${profile}`)}
                                        >
                                            <FiEdit size={24} />
                                        </button>
                                        <p className="text-lg">{user.Name}</p>
                                        <p className="text-md">{user.role}</p>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
                {tab === 'Roles' && (
                    <div>
                        <div className="flex justify-between items-center">
                            <h1 className="underline text-2xl">Roles</h1>
                            <button className="bg-gray-700" onClick={() => navigate('/roles')}>
                                Create Role
                            </button>
                        </div>
                        <ul>
                            {Roles.map((role) => {
                                console.log(role)
                                return (
                                    <li key={role.id} className="mt-5 flex items-center justify-between">
                                        {role.Role_Name != 'Company Admin' && (
                                        <button
                                            key={role.id}
                                            onClick={() => navigate(`/roles/edit/${role.id}`)}
                                        >
                                            <FiEdit size={24} />
                                        </button>
                                        )}
                                        <p className="text-lg">{role.Role_Name}</p>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                )}
                {tab === 'Subscription' && (
                    <div>
                        <h1 className="underline text-2xl">Subscription</h1>
                        <p>Coming Soon! Currently in Testing!</p>
                    </div>
                )}
            </DisplayBox>
        </div>
    );
}
export default Settings