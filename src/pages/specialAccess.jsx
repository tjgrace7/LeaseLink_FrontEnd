import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import DisplayBox from "../components/DisplayBox";
import { nav } from "framer-motion/client";
import { Label, Input, Field, SectionCard, Chip } from "../components/FormComponents"
import Dropdown from "../components/dropdown";
import { useAuth } from "../components/AuthProvider";
import { supabase } from "../supabaseClient";
import { getTable } from "../utilities/supabaseCalls";
import { GTMUpload } from "../components/gtag";
import { putWithProgress } from "./UploadLeases";

const specialAccess = () => {
    const navigate = useNavigate();
    const { userData, session } = useAuth()
    const [currentH1, setH1] = useState("")
    const [Stage, setStage] = useState("Entity Create")
    const [errors, setErrors] = useState({});
    const [buttonText, setButtonText] = useState("Next")
    const [submitting, setSubmitting] = useState(false)

    const supabaseurl = import.meta.env.VITE_SUPABASE_URL;
    const [Entity, setEntity] = useState({
        square_footage: "",
        label: "", // Address (Unit) or Property Name (Property)
        image: "",
        imageType: "",
        suite: "",
        city: "",
        state: "",
        zip: "",
        tenantName: "",
        DBA: ""

    });
    const [file, setFile] = useState({
        name: "",
        type: ''
    })

    const [tenant_id, setTenantId] = useState("")
    const [property_id, setPropertyId] = useState("")
    const [unit_id, setUnitId] = useState("")
    useEffect(() => {
        if (!userData) return;
        const getEntities = async () => {
            console.log(userData.company_id)
            const { data: properties, error: propError } = await supabase.from("properties").select('*').eq('prop_id', userData.company_id)
            console.log(properties)
            if (propError) {
                console.error("Error Fetching Properties")
                return
            }

            if (properties.length < 1) {

                setStage('Entity Create')
                console.log("Stage Set")

            } else {
                const { data: units, error: unitError } = await supabase.from("Units").select("*").eq("pmcompany_id", userData.company_id);
                if (unitError) {
                    console.error("Error Fetching Units")
                    return
                }
                if (units.length < 1) {
                    navigate('/create_building')
                }
                else {
                    const { data: tenants, error: tenantError } = await supabase.from("Units").select("*").eq('property_management_id', userData.company_id).eq('archived', false)
                    if (tenantError) {
                        console.error("Error Fetching Tenants")
                        return;
                    }
                    if (tenants.length < 1) {
                        navigate('/create_person')
                    }
                    else navigate('/chat')
                }
            }
        }
        getEntities()
    }, [userData])

    SubmitEntities = async () => {
        const newErrors = {}
        if (!Entity.label) newErrors.label = true
        if (!Entity.square_footage) newErrors.square_footage = true
        if (!Entity.address) newErrors.address = true
        if (!Entity.suite) newErrors.suite = true
        if (!Entity.city) newErrors.city = true
        if (!Entity.state) newErrors.state = true
        if (!Entity.zip) newErrors.zip = true
        if (!Entity.tenantName) newErrors.tenantName = true
        if (!Entity.DBA) newErrors.DBA = true

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        setSubmitting(true)

        const propertyPayload = {
            name: Entity.label,
            city: Entity.city,
            state: Entity.state,
            zip: Entity.zip,
            user_id: session.user.id,
            company_id: userData.company_id

        }
        console.log(propertyPayload)
        const response = await fetch(`${supabaseurl}/functions/v1/CreateProperty`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(propertyPayload),
        });

        const result = await response.json();
        if (!response.ok) {
            console.error(" error:", result);
            alert(result.error || `Failed to create Property.`);
            setSubmitting(false);
            return;
        }
        console.log(Entity.square_footage, result.property_id, Entity.suite, Entity.address, session.user.id, userData.company_id)
        const unitPayload = {
            square_footage: Entity.square_footage,
            property_id: result.property_id,
            suite: Entity.suite,
            address: Entity.address,
            user_id: session.user.id,
            company_id: userData.company_id,
        }
        const unitResponse = await fetch(`${supabaseurl}/functions/v1/CreateUnit`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(unitPayload),
        });
        const unitResult = await unitResponse.json();
        if (!unitResponse.ok) {
            console.error(" error:", result);
            alert(unitResult.error || `Failed to create Unit.`);
            setSubmitting(false);
            return;
        }
        console.log(unitResult)
        setPropertyId(result.property_id)
        setUnitId(unitResult.unit_id)
        const propertyData = await getTable('properties', 'prop_id', result.property_id)
        const unitData = await getTable('Units', 'unit_id', unitResult.unit_id)
        const tenantPayload = {
            personType: "Tenant",
            name: Entity.tenantName,
            dba: Entity.DBA,
            active: true,
            properties: propertyData,
            units: unitData,
            company_id: userData.company_id,

        }

        const res = await fetch(`${supabaseurl}/functions/v1/Create_Person`, {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
            body: JSON.stringify(tenantPayload)
        });
        const tenantResult = await res.json()
        if (!res.ok) {
            console.error(" error:", result);
            alert(tenantResult.error || `Failed to create Tenant.`);
            setSubmitting(false);
            return;
        }

        setTenantId(tenantResult.id)
        setButtonText("Chat")
        setStage("Upload")
    }
    const Uploading = async () => {
        const groupId = crypto.randomUUID()
        const res = await fetch(`${supabaseurl}/functions/v1/generate_upload_url`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                company_id: userData.company_id,
                tenant_id: tenant_id,
                property_id: property_id,
                unit_id: unit_id,
                filename: file.name,
                contentType: file.type || "application/octet-stream",
                user_id: session.user.id,
                group_id: groupId,
                quene: false
            }),
        });
        if (!res.ok) {
            const errText = await res.text().catch(() => "");
            throw new Error(`Failed to get signed URL (${res.status}): ${errText}`);
        }
        GTMUpload()
        const { signed_url, lease_file_path, bucket, job_id, error: fxError } = await res.json();
        if (fxError) throw new Error(fxError);
        if (!signed_url || !lease_file_path || !bucket) {
            throw new Error("Edge function did not return expected fields.");
        }

        // Step 2: Upload with progress
        setStatus(id, { step: "Uploading", message: "Uploading to storage…", progress: 0 });
        await putWithProgress(
            signed_url,
            file,
            file.type || "application/octet-stream",
            (pct) => setStatus(id, { progress: pct })
        );
        setStatus(id, { step: "Processing", message: "Starting file processing…" });

        setStatus(id, { step: "Done", message: "Finished!", progress: 100, done: true });
    }
    const buttonClick = async () => {
        console.log(Stage)
        if (Stage === "Entity Create") {
            SubmitEntities();
        }
        else if (Stage === "Upload") {
            Uploading()
        }

    }



    const handleChange = (e) => {
        const { name, value } = e.target;
        setEntity((prev) => ({ ...prev, [name]: value }));
    };
    return (
        <div className="mx-auto w-full max-w-6xl px-4 md:px-6 lg:px-8 py-6">
            <h1>{currentH1}</h1>
            <div className="flex items-center gap-3 mb-6">

                <DisplayBox className="p-4 md:p-4 flex justify-center">

                    {/* Left: Form (2 cols on desktop) */}
                    {Stage === "Entity Create" && (
                        <div>
                            <SectionCard title='Property' >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">


                                    <Field label="Property Name" htmlFor="label" error={errors.label}>
                                        <Input
                                            id="label"
                                            name="label"
                                            placeholder={(Stage === "Property/Unit" ? "Enter property name" : "Enter Tenant Name")}
                                            value={Entity.label}
                                            onChange={handleChange}
                                        />
                                    </Field>
                                    <Field label="City" htmlFor="city" error={errors.city}>
                                        <Input
                                            id="city"
                                            name="city"
                                            placeholder="Enter city"
                                            value={Entity.city}
                                            onChange={handleChange}
                                        />
                                    </Field>
                                    <Field label="State" htmlFor="state" error={errors.state}>
                                        <Input
                                            id="state"
                                            name="state"
                                            placeholder="Enter state (e.g., IN)"
                                            value={Entity.state}
                                            onChange={handleChange}
                                        />
                                    </Field>
                                    <Field label="Zip Code" htmlFor="zip" error={errors.zip}>
                                        <Input
                                            id="zip"
                                            name="zip"
                                            placeholder="Enter ZIP"
                                            value={Entity.zip}
                                            onChange={handleChange}
                                        />
                                    </Field>

                                </div>
                            </SectionCard>
                            <SectionCard title='unit'>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">


                                    <Field label="Unit Address" htmlFor='address' error={errors.address}>
                                        <Input
                                            id="address"
                                            name='address'
                                            placeholder='Enter Unit Address'
                                            value={Entity.address}
                                            onChange={handleChange}
                                        />
                                    </Field>
                                    <Field label="Suite" htmlFor='suite' error={errors.suite}>
                                        <Input
                                            id='suite'
                                            name='suite'
                                            placeholder='Enter Suite (e.g. 12A)'
                                            value={Entity.suite}
                                            onChange={handleChange}
                                        />
                                    </Field>
                                    <Field label='Square Footage' htmlFor='squarefoot' error={errors.square_footage}>
                                        <Input
                                            id='squarefoot'
                                            name='square_footage'
                                            placeholder="Suite's Square Footage"
                                            value={Entity.square_footage}
                                            onChange={handleChange}
                                        />
                                    </Field>
                                </div>
                            </SectionCard>
                            <SectionCard title='Tenant'>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                                    <Field label="Tenant Name" htmlFor='tenantName' error={errors.tenantName}>
                                        <Input
                                            id='tenantName'
                                            name='tenantName'
                                            placeholder='Enter Tenant Name'
                                            value={Entity.tenantName}
                                            onChange={handleChange}
                                        />
                                    </Field>
                                    <Field label='Tenant DBA' htmlFor='dba' error={errors.dba}>
                                        <Input
                                            id='DBA'
                                            name='DBA'
                                            placeholder="Enter Tenant DBA Name"
                                            value={Entity.DBA}
                                            onChange={handleChange} />
                                    </Field>
                                </div>
                            </SectionCard>
                            <div className="flex items-left">
                                <button
                                    onClick={buttonClick}
                                    disabled={submitting}
                                    type="button"
                                    className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed p-4">
                                    {buttonText}
                                </button>
                            </div>
                        </div>
                    )}

                    {Stage === "Upload" && (
                        <div>

                        </div>
                    )}


                </DisplayBox>
            </div >
        </div >
    )
}

export default specialAccess;