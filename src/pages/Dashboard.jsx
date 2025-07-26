import DisplayBox from '../components/DisplayBox'
import { useAuth } from '../components/AuthProvider'
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import EntityListBox from '../components/EntityListBox';
import LoadPreviousMessages from '../components/PreviousMessages';

const Dashboard = () => {
    const { session, userData } = useAuth();
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startISO = currentMonth.toISOString();
    const nowISO = now.toISOString();


    const [messageCount, setMessageCount] = useState(0);
    const [tenantCount, setTenantCount] = useState(0)
    const [properties, setProperties] = useState([]);
    const [companyId, setCompanyId] = useState("");
    const [docs, setDocs] = useState(0)
    const navigate = useNavigate();

    //Gets Entity Questions for counting how many 
    useEffect(() => {
        if (!session || !userData) return;

        setCompanyId(userData.company_id)
        const getMessages = async () => {
            const { data, error } = await supabase.from('entity_questions').select('*').gte('created_at', startISO).lte('created_at', nowISO)
            if (error) console.error("Message Load Error", error)
            else if (data) {
                const recentData = data.filter(item => item.role === "assistant");
                setMessageCount(recentData.length);
            }
        }
        getMessages();
        /**
* Fetch properties belonging to the user's company
*/
        const getProperties = async () => {
            const { data, error } = await supabase
                .from('properties')
                .select('*')
                .eq('pm_company', userData.company_id);

            if (error) {
                console.error('No Properties Returned', error.message, error.details);
            } else {
                setProperties(data);
            }
        };

        getProperties();
        const getTenants = async () => {
            const { data, error } = await supabase.from('tenant').select("*").eq("property_management_id", userData.company_id)
            if (error) console.error("Tenant Load Error", error)
            else if (data) {
                setTenantCount(data.length);
            }
        }
        getTenants();
        const getDocs = async () => {
            const { data, error } = await supabase.from('lease_documents').select("*").eq('company_id', userData.company_id)
            if (error) console.error("Doc Load Error")
            else if (data) {
                setDocs(data.length)
            }
        }
        getDocs();

    }, [session, userData])


    /**
     * Navigate to individual property page
     */
    const navigateEntity = (property_id, property_type) => {
        // TODO: Add PermissionGate for secured access
        const Type = localStorage.getItem('entity_type')
        navigate(`/${property_type}/${property_id}`);
    };
    return (
        <div className='mt-4'>
            <div className="text-white flex items-center justify-center text-2xl">
                <h1 className="text-white text-4xl font-sans">Dashboard</h1>
            </div>
            <div className='flex flex-row justify-between'>
                <DisplayBox className='w-1/5 m-4 ml-20 flex flex-col justify-center items-center'>
                    <div className='flex flex-col items-center justify-center'>
                        <h2><u>Monthly Answered Questions</u></h2>
                        <p className='text-4xl mt-6'>{messageCount}</p>
                    </div>
                </DisplayBox>
                <DisplayBox className='w-1/5 m-4 ml-20 flex flex-col justify-center items-center'>
                    <div className='flex flex-col items-center justify-center'>
                        <h2><u>Tenant Docs Extracted</u></h2>
                        <p className='text-4xl mt-6'>{docs}</p>
                    </div>
                </DisplayBox>
                <DisplayBox className='w-1/5 m-4 mr-20 flex flex-col justify-center items-center'>
                    <div className='flex flex-col items-center justify-center'>
                        <h2><u>Number of Current Tenants</u></h2>
                        <p className='text-4xl mt-6'>{tenantCount}</p>
                    </div>
                </DisplayBox>
                <DisplayBox className='w-1/5 m-4 mr-20 flex flex-col justify-center items-center'>
                    <div className='flex flex-col items-center justify-center'>
                        <h2><u>Number of Properties</u></h2>
                        <p className='text-4xl mt-6'>{properties.length}</p>
                    </div>
                </DisplayBox>
            </div>

            <div className="p-20">
                <EntityListBox
                    type="units_properties_tenants"
                    entities={properties}
                    selectEntity={navigateEntity}
                    getEntityLabel={(property) => property.Property_Name || 'Unnamed Property'}
                    getEntityId={(property) => property.prop_id}
                    getSQ={(property) => property.square_footage}
                    Label="Properties"
                    placeholder="..."
                    boxType='property'
                />
            </div>
            {companyId && (
                <div className='p-10'>
                    <LoadPreviousMessages
                        entityId={companyId}
                        session={session}
                        entityType="company"
                    />
                </div>
            )}
        </div>
    )
}
export default Dashboard;

