import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useNavigate } from 'react-router-dom';

import DisplayBox from '../components/DisplayBox';
import Dropdown from '../components/dropdown';
import { supabase } from '../supabaseClient';
import Spinner from '../components/Spinner'

const UploadLeases = () => {
    const { session, userData } = useAuth();
    const navigate = useNavigate();

    // 🔄 Local state
    const [tenants, setTenants] = useState([]);
    const [selectedTenant, setSelectedTenant] = useState(null);
    const [fileList, setFileList] = useState([]);
    const [units, setUnits] = useState([]);
    const [properties, setProperties] = useState([]);
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [selectedProperty, setSelectedProperty] = useState(null);

    const [submittingFiles, setSubmitFiles] = useState(false)

    const supabaseurl = import.meta.env.VITE_SUPABASE_URL;

    // 🔄 Fetch tenants on load
    useEffect(() => {
        if (!session || !userData) return;

        const getTenants = async () => {
            const { data, error } = await supabase
                .from('tenant')
                .select('*')
                .eq('property_management_id', userData.company_id);

            if (error) console.error('Tenant Fetch Error', error);
            else setTenants(data);
        };

        getTenants();
    }, [session, userData]);

    // 📂 Capture file selection
    const handleFileChange = (event) => {
        setFileList(Array.from(event.target.files));
    };

    // 🔁 When a tenant is selected, fetch linked units + properties
    const tenantSelected = async (tenant) => {
        setSelectedTenant(tenant);

        const { data: unitData, error: unitError } = await supabase
            .from('Units')
            .select('*')
            .eq('tenant_id', tenant.tenant_id);

        if (unitError) console.error("Error Fetching Units", unitError);
        else {
            setUnits(unitData);
            if (unitData.length === 1) setSelectedUnit(unitData[0]);
        }

        const { data: propertyData, error: propertyError } = await supabase
            .from('Property_Tenant')
            .select('*')
            .eq('tenant_id', tenant.tenant_id);

        if (propertyError) console.error("Error Fetching Properties", propertyError);
        else {
            console.log(propertyData)
            setProperties(propertyData);
            if (propertyData.length === 1) setSelectedProperty(propertyData[0]);
        }
    };

    // 📤 Upload each file one at a time (recommended over Promise.all for now)
    const Submit = async () => {
        if (!selectedTenant || !selectedProperty || !selectedUnit || fileList.length === 0) {
            alert('Please select a tenant, property, unit, and at least one file.');
            return;
        }
        setSubmitFiles(true)
        for (const file of fileList) {
            try {
                // 🎟️ Step 1: Get signed upload URL
                
                const res = await fetch(`${supabaseurl}/functions/v1/generate_upload_url`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        company_id: userData.company_id,
                        tenant_id: selectedTenant.tenant_id,
                        property_id: selectedProperty.property_id,
                        unit_id: selectedUnit.unit_id,
                        filename: file.name,
                        contentType: file.type,
                        user_id: session.user.id
                    })
                });

                const { signed_url, lease_file_path, bucket } = await res.json();
                if (!signed_url) throw new Error("Failed to get signed URL");
                
                // ☁️ Step 2: Upload to Supabase Storage
                const uploadRes = await fetch(signed_url, {
                    method: "PUT",
                    headers: { "Content-Type": file.type },
                    body: file
                });

                if (!uploadRes.ok) {
                    const errText = await uploadRes.text();
                    throw new Error("Upload failed: " + errText);
                }

                // 🚀 Step 3: Trigger processing function
                const processRes = await fetch(`${supabaseurl}/functions/v1/new_upload`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: lease_file_path,
                        bucket
                    }),
                });

                if (!processRes.ok) {
                    const err = await processRes.text();
                    throw new Error("Processing failed: " + err);
                }
                
                console.log(`✅ File processed: ${file.name}`);
            } catch (err) {
                console.error(`❌ Error uploading ${file.name}:`, err);
                alert(`Error uploading file: ${file.name}\n${err.message}`);
                setSubmitFiles(false)
                return;
                
            }
        }
        setSubmitFiles(false)
        alert("🎉 All files uploaded and processing triggered.");
        navigate("/dashboard");
    };
    if(submittingFiles)
    {
        return ( <div className='flex items-center justify-center'><Spinner/></div>)
    }
    return (
        <div>
            <div className="flex items-center justify-center">
                <h1 className="text-2xl">Upload Leases</h1>
            </div>

            <DisplayBox className="flex flex-col mb-10">
                <Dropdown
                    options={tenants}
                    onSelect={tenantSelected}
                    placeholder="Select Tenant"
                    getOptionId={(t) => t.tenant_id}
                    getOptionTitle={(t) => t.Tenant_Name}
                />

                {selectedTenant && (
                    <>
                        {properties.length > 1 && (
                            <Dropdown
                                options={properties}
                                onSelect={setSelectedProperty}
                                placeholder="Select Property"
                                getOptionId={(p) => p.prop_id}
                                getOptionTitle={(p) => p.Property_Name}
                            />
                        )}

                        {units.length > 1 && (
                            <Dropdown
                            className='mt-10'
                                options={units}
                                onSelect={setSelectedUnit}
                                placeholder="Select Unit"
                                getOptionId={(u) => u.unit_id}
                                getOptionTitle={(u) => u.address}
                            />
                        )}

                        <div className="bg-gray-700 mt-4 p-4 space-y-2 rounded w-fit">
                            <label className="block mb-2 font-semibold">Upload Lease Files</label>
                            <input
                                type="file"
                                multiple
                                onChange={handleFileChange}
                                className="block text-white"
                            />
                            {fileList.length > 0 && (
                                <div className="mt-4">
                                    <h3 className="font-semibold">Selected Files</h3>
                                    <ul className="list-disc ml-5">
                                        {fileList.map((file, i) => (
                                            <li key={i}>{file.name}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="mt-6">
                            <button
                                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                onClick={Submit}
                            >
                                Submit
                            </button>
                        </div>
                    </>
                )}
            </DisplayBox>
        </div>
    );
};

export default UploadLeases;
