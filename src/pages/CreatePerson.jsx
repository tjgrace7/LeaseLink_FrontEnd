// src/pages/CreateEditPerson.jsx
// ------------------------------------------------------------
// LeaseLink — Create/Edit Person Page (Refreshed, full page)
// - Softer, modern cards (no heavy borders)
// - Mobile-first grid
// - Clear sections + comments
// - Sticky submit on mobile
// - Same data flow & utilities
// ------------------------------------------------------------

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { FiX, FiTrash2, FiImage, FiChevronLeft } from "react-icons/fi";
import DisplayBox from "../components/DisplayBox";
import Dropdown from "../components/dropdown";
import UploadImage from "../components/upload_image";
import { fileToBase64 } from "../utilities/imageConverter";
import { get_entity_image } from "../utilities/get_entity_image";
import { getTable, getTableIdList } from "../utilities/supabaseCalls";
import { GTMCreate } from "../components/gtag";
import { supabase } from "../supabaseClient";
import { Label, Input, Field, SectionCard, Chip } from "../components/FormComponents";

// Label helpers for inconsistent field casing
const unitLabel = (u) => {
  const suite = u.Suite ?? u.suite ?? u.suite_number ?? u.SUITE ?? "";
  const addr = u.address ?? u.Address ?? u.property_address ?? "Unit";
  return `${addr}${suite ? ` — Suite ${suite}` : ""}`;
};
const propertyLabel = (p) => p.Property_Name ?? p.property_name ?? "Property";
const tenantLabel = (t) => t.Tenant_Name ?? t.tenant_name ?? "Tenant";

// ----------------------------
// Component
// ----------------------------
const CreateEditPerson = () => {
  const { session, userData, roleData } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Params
  const id = searchParams.get("id");
  const typeParam = searchParams.get("type");
  const typeAliasMap = { "User Profile": "App User" };
  const normalizedType = typeAliasMap[typeParam] || typeParam;
  const isEditMode = !!id;

  // State
  const [personOptions, setPersonOptions] = useState([]);
  const permissionLevels = ["Company Admin", "Property Manager"];

  const [selectedPerson, setPerson] = useState(normalizedType || "");
  const [genericFormData, setGeneric] = useState({
    name: "",
    email: "",
    phone: "",
    image: "",
    imageType: "",
    address: "",
    contactType: "",
    password: "",
    passwordconfirm: "",
  });

  const [tenant, setTenant] = useState({ dba: "", active: true });

  const [tenants, setTenants] = useState([]);
  const [selectedTenants, setSelectedTenant] = useState([]);

  const [permission, setPermission] = useState("");
  const [errors, setErrors] = useState({});

  const [properties, setProperties] = useState([]);
  const [selectedProperties, setSelectedProperties] = useState([]);

  const [units, setUnits] = useState([]);
  const [selectedUnits, setSelectedUnits] = useState([]);

  const [previousImage, setPreviousImage] = useState("");
  const [editImage, setEditImage] = useState("");

  // Snapshots to detect changes on edit
  const [initialData, setInitialData] = useState(null);
  const [initialUnits, setInitialUnits] = useState(null);
  const [initialProperties, setInitialProperties] = useState(null);
  const [initialTenants, setInitialTenants] = useState(null);
  const [initialPermission, setInitialPermission] = useState("");
  const [unitOccupied, setUnitOccupied] = useState(false)

  const [submitting, setSubmitting] = useState(false);
  const supabase_url = import.meta.env.VITE_SUPABASE_URL;
  const company_id = localStorage.getItem('activeCompanyId')


  // --------------------------------------
  // Allowed person types by role
  // --------------------------------------
  useEffect(() => {
    if (!roleData) return;
    const createOptions = [
      ...(roleData.Create_Users ? ["App User"] : []),
      ...(roleData.Create_Tenants ? ["Tenant"] : []),
      ...(roleData.Create_Contact ? ["Contact"] : []),
      ...(roleData.Create_Owner ? ["Building Owner"] : []),
    ];
    setPersonOptions(createOptions);
  }, [roleData]);

  // --------------------------------------
  // Revoke blob URLs created for previews
  // --------------------------------------
  useEffect(() => {
    let objectUrl;
    if (genericFormData.image instanceof File) {
      objectUrl = URL.createObjectURL(genericFormData.image);
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [genericFormData.image]);

  // --------------------------------------
  // Fetch list data based on selection
  // --------------------------------------
  useEffect(() => {
    if (!session || !userData || !selectedPerson) return;

    const fetchInitialData = async () => {
      try {
        if (selectedPerson === "Building Owner") return; // No extra lists needed

        // Properties (common)

        const { data: propertyData, error: propertyError } = await supabase.from("properties").select("*").eq("pm_company", company_id).eq("archived", false)
        if (propertyError) {
          console.error("Error Fetching Properties")
        }
        if (!propertyData) return;

        setProperties(propertyData);

        // Units (only for Tenant & after properties are selected)
        if (selectedPerson === "Tenant" && selectedProperties.length > 0) {
          const { data: unitData, error: unitError } = await supabase.from("Units").select("*").eq("pmcompany_id", company_id).eq("archived", false)
          if (unitError) {
            console.log("Unit Error:", unitError)
            return;
          }

          // Units already linked to tenants

          const {data:usedUnits, error: usedUnitsError} = await supabase.from("Tenant_Unit").select("*").in("unit_id", unitData.map((u) => u.unit_id)).eq("Is_Current", true)
          if(usedUnitsError)
          {
            console.error("Used Units Error:", usedUnitsError)
            return;
          }
          const usedIds = new Set((usedUnits || []).map((u) => u.unit_id));

          const selectedPropIds = selectedProperties.map((p) => p.prop_id);
          const availableUnits = unitData
            .filter((u) => selectedPropIds.includes(u.property_id) && !usedIds.has(u.unit_id))
            .sort((a, b) => {
              const addrCompare = (a.address ?? "").localeCompare(b.address ?? "");
              if (addrCompare !== 0) return addrCompare;
              const as = a.Suite ?? a.suite ?? a.suite_number ?? "";
              const bs = b.Suite ?? b.suite ?? b.suite_number ?? "";
              return String(as).localeCompare(String(bs));
            });

          setUnits(availableUnits);
        }

        // Tenants list for Contact linking
        if (selectedPerson === "Contact") {
          const tenantData = await getTable(
            "tenant",
            "property_management_id",
            company_id
          );
          if (!tenantData) return;
          setTenants(tenantData);
        }
      } catch (err) {
        console.error("Fetch init data error:", err);
      }
    };

    fetchInitialData();
  }, [selectedPerson, userData, selectedProperties, session]);

  // --------------------------------------
  // Prefill when editing
  // --------------------------------------
  useEffect(() => {
    if (!isEditMode || !typeParam) return;

    const tableMap = {
      Tenant: "tenant",
      "App User": "User_Data",
      Contact: "Contact",
      "Building Owner": "building_owner",
    };

    const table = tableMap[normalizedType];
    const column = normalizedType === "App User" ? "user" : normalizedType === "Building Owner" ? "owner" : table;
    if (!table) return;

    setPerson(normalizedType);

    const fetchPerson = async () => {
      try {
        const personData = await getTable(table, `${column.toLowerCase()}_id`, id);
        const data = personData?.[0];
        if (!data) return;

        // Special handling for User_Data (email/phone from Auth)
        let email, role, phone;
        if (table === "User_Data") {
          const info = await getUserEmailPhone(id);
          email = info.email;
          phone = info.phone;
          role = await getTable("Roles", "id", data.role_id);
        }

        const generic = {
          name:
            normalizedType === "Tenant"
              ? data.Tenant_Name || ""
              : normalizedType === "App User"
                ? data.Name || ""
                : normalizedType === "Contact"
                  ? data.Contact_Name || ""
                  : normalizedType === "Building Owner"
                    ? data.owner_name || ""
                    : "",
          email:
            normalizedType === "App User" || normalizedType === "Contact" || normalizedType === "Building Owner"
              ? email || data.Email || ""
              : "",
          phone:
            normalizedType === "App User" || normalizedType === "Contact" || normalizedType === "Building Owner"
              ? phone || data.Phone || ""
              : "",
          image: "",
          imageType: "",
          address: normalizedType === "Contact" ? data.Address || "" : "",
          contactType: normalizedType === "Contact" ? data.Contact_Type || "" : "",
          password: "",
          passwordconfirm: "",
        };

        // Preview existing image
        const imagepath =
          normalizedType === "Tenant"
            ? data.photo_file_path || ""
            : data.image_file_path || "";

        if (imagepath) {
          setEditImage(await get_entity_image(imagepath, session));
          setPreviousImage(imagepath);
        }

        setGeneric(generic);
        setInitialData({ ...generic, image: imagepath });

        // Related selections
        if (normalizedType === "Tenant") {
          setTenant({ dba: data.dba || "", active: data.active ?? true });

          const pt = await getTable("Property_Tenant", "tenant_id", id);
          const propIds = pt.map((j) => j.property_id);
          const propertyData = await getTableIdList("properties", "prop_id", propIds);

          setSelectedProperties(propertyData);
          setProperties((prev) => prev.filter((p) => !propertyData.map((pd) => pd.prop_id).includes(p.prop_id)));
          setInitialProperties(propertyData);

          const tUnits = await getTable("Tenant_Unit", "tenant_id", id);
          const uIds = tUnits.map((u) => u.unit_id);
          const unitData = await getTableIdList("Units", "unit_id", uIds);
          setSelectedUnits(unitData);
          setInitialUnits(unitData);
        }

        if (normalizedType === "Contact") {
          const tenantContacts = await getTable("Tenant_Contact", "contact_id", id);
          const tenantIds = tenantContacts.map((t) => t.tenant_id);
          const relatedTenants = await getTableIdList("tenant", "tenant_id", tenantIds);
          const selectedIds = new Set((relatedTenants || []).map((t) => t.tenant_id));
          setSelectedTenant(relatedTenants);
          setTenants((prev) => prev.filter((p) => !selectedIds.has(p.tenant_id)));
          setInitialTenants(relatedTenants);
        }

        if (normalizedType === "App User") {
          setPermission(role?.[0]?.Role_Name || data.role || "");
          setInitialPermission(role?.[0]?.Role_Name || data.role || "");

          // NOTE: Original used 'tenant_id' for User_Property lookup; keeping to avoid breaking
          const up = await getTable("User_Property", "tenant_id", id);
          const propIds = up.map((j) => j.property_id);
          const propertyData = await getTableIdList("properties", "prop_id", propIds);
          setSelectedProperties(propertyData);
          setProperties((prev) => prev.filter((p) => !propertyData.map((pd) => pd.prop_id).includes(p.prop_id)));
          setInitialProperties(propertyData);
        }
      } catch (err) {
        console.error("Fetch person error:", err);
      }
    };

    fetchPerson();
  }, [id, typeParam, isEditMode, normalizedType, session]);

  // Helpers
  const getUserEmailPhone = async (targetUserId) => {
    const query = targetUserId ? `?target_user_id=${targetUserId}` : "";
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get_user_email_phone${query}`,
      { method: "GET", headers: { Authorization: `Bearer ${session?.access_token}` } }
    );
    const data = await res.json();
    if (!res.ok) {
      console.error("Edge Function error:", data);
      throw new Error(data.error || "Unknown error");
    }
    return data; // { email, phone }
  };

  const hasChanged = useCallback(() => {
    if (!initialData) return true; // no baseline -> treat as changed
    const { image: initialImage, ...initialRest } = initialData;
    const { image: currentImage, ...currentRest } = genericFormData;

    const baseChanged = JSON.stringify(initialRest) !== JSON.stringify(currentRest);
    const imageChanged =
      typeof currentImage === "string"
        ? currentImage.startsWith("data:") || currentImage !== initialImage
        : !!currentImage; // file selected

    const selCompare =
      JSON.stringify(selectedProperties) !== JSON.stringify(initialProperties) ||
      JSON.stringify(selectedUnits) !== JSON.stringify(initialUnits) ||
      JSON.stringify(selectedTenants) !== JSON.stringify(initialTenants) ||
      permission !== initialPermission;

    return baseChanged || imageChanged || selCompare;
  }, [initialData, genericFormData, selectedProperties, selectedUnits, selectedTenants, initialProperties, initialUnits, initialTenants, permission, initialPermission]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (selectedPerson === "Tenant" && (name === "active" || name === "dba")) {
      setTenant((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
      return;
    }
    setGeneric((prev) => ({ ...prev, [name]: value }));
  };

  const removeEntity = (entity, setFromList, setToList, idKey = "prop_id") => {
    setFromList((prev) => prev.filter((item) => item[idKey] !== entity[idKey]));
    setToList((prev) => (prev.some((p) => p[idKey] === entity[idKey]) ? prev : [...prev, entity]));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (isEditMode && !hasChanged()) {
      console.log("No changes detected — skipping update.");
      return;
    }

    const newErrors = {};
    if (!genericFormData.name) newErrors.name = true;
    if (selectedPerson !== "Tenant") {
      if (!genericFormData.email) newErrors.email = true;
      if (!genericFormData.phone) newErrors.phone = true;
    }
    if (selectedPerson === "App User" && !isEditMode) {
      const { password, passwordconfirm } = genericFormData;
      if (!password || !passwordconfirm || password !== passwordconfirm) newErrors.password = true;
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    try {
      const company = await getTable(
        "Property_Management_Companies",
        "company_id",
        company_id
      );
      const company_name = company?.[0]?.company_name ?? "company";

      const storagePath = genericFormData.image
        ? `${company_name}/${selectedPerson}/${genericFormData.name}`
        : isEditMode
          ? previousImage
          : "";

      const imageBase64 = genericFormData.image ? await fileToBase64(genericFormData.image) : null;
      const tenantIds = selectedTenants.map((t) => t.tenant_id);
      const additionalPayload = {};
      if (!isEditMode || (isEditMode && genericFormData.password)) {
        additionalPayload.password = genericFormData.password;
      }

      const res = await fetch(`${supabase_url}/functions/v1/Create_Person`, {
        method: isEditMode ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: id,
          personType: selectedPerson,
          name: genericFormData.name,
          email: genericFormData.email,
          phone: genericFormData.phone,
          user_id: session.user.id,
          company_id: company_id,
          image: imageBase64,
          properties: selectedProperties,
          units: selectedUnits,
          dba: tenant.dba,
          active: tenant.active,
          role: permission,
          storagePath,
          imageType: genericFormData.imageType,
          address: genericFormData.address,
          contactType: genericFormData.contactType,
          tenant_id: tenantIds,
          ...additionalPayload,
        }),
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("Create_Person error:", result);
        if (result?.error?.include("Cannot assign tenant to occupied units")) {
          setUnitOccupied(true)
        }
        else {

          alert(result?.error || "Something went wrong. Check console.");
          setSubmitting(false);
        }
        return;
      }
      const confirmEmail = `<html lang="en" style="margin:0;padding:0;">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Welcome to LeaseLink</title>
  <style>
    /* Just in case some clients keep <style> */
    @media (prefers-color-scheme: dark) {
      .bg { background:#0b1220 !important; }
      .card { background:#111827 !important; color:#e5e7eb !important; }
      .muted { color:#9ca3af !important; }
      .btn { background:#10b981 !important; color:#0b1220 !important; }
      .link { color:#34d399 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#0b1220;" class="bg">
  <!-- Preheader (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    Welcome to LeaseLink — you’ll receive a separate email to create your password.
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b1220;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;">
          <tr>
            <td align="left" style="padding:0 0 16px 0;">
              <!-- Logo (optional) -->
              <a href="https://www.leaselink.ai" target="_blank" style="text-decoration:none;">
                <img src="https://www.leaselink.ai/logo.png" alt="LeaseLink" width="140" height="auto" style="border:0;display:block;">
              </a>
            </td>
          </tr>

          <tr>
            <td class="card" style="background:#0f172a;border-radius:14px;padding:28px 24px;color:#e5e7eb;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">
              <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;font-weight:700;">
                Welcome to LeaseLink, ${genericFormData.name}!
              </h1>
              <p class="muted" style="margin:0 0 16px 0;color:#cbd5e1;font-size:14px;line-height:1.6;">
                Your Lease Link account has been created. To keep things secure, we don’t send passwords by email.
              </p>

              <h3 style="margin:20px 0 8px 0;font-size:16px;line-height:1.4;">What happens next</h3>
              <ol style="margin:0 0 16px 20px;padding:0;color:#e5e7eb;font-size:14px;line-height:1.6;">
                <li>You’ll receive a <strong>separate email</strong> shortly with the subject:
                  <em>“Reset your LeaseLink password”</em>.
                </li>
                <li>Open that email and click the button to create your password.</li>
                <li>After setting your password, sign in at <a href="https://www.leaselink.ai" class="link" style="color:#34d399;text-decoration:none;">app.leaselink.ai</a>.
                </li>
              </ol>

              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:20px 0 8px 0;">
                <tr>
                  <td>
                    <a href="https://www.leaselink.ai" target="_blank"
                       class="btn"
                       style="display:inline-block;background:#10b981;color:#062a22;text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:600;font-size:14px;">
                      Go to LeaseLink
                    </a>
                  </td>
                </tr>
              </table>

              <p class="muted" style="margin:16px 0 0 0;color:#9ca3af;font-size:12px;line-height:1.6;">
                Can’t find the password email? Check your spam or “Updates/Promotions” tabs, and add
                <span style="white-space:nowrap;">no-reply@leaselink.ai</span> to your contacts.
              </p>

              <hr style="border:none;border-top:1px solid #1f2937;margin:20px 0;">

              <h3 style="margin:0 0 8px 0;font-size:16px;">Getting started</h3>
              <ul style="margin:0 0 16px 20px;padding:0;font-size:14px;line-height:1.6;">
                <li>Upload leases, amendments, and exhibits as PDFs.</li>
                <li>Ask natural-language questions; answers include citations to the source document.</li>
                <li>Invite teammates from Settings → Team.</li>
              </ul>

              <p class="muted" style="margin:0;color:#9ca3af;font-size:12px;">
                Need help? Reply to this email or contact us at
                <a href="mailto:support@leaselink.ai" class="link" style="color:#34d399;text-decoration:none;">support@leaselink.ai</a>.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 4px 0 4px;text-align:center;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#9ca3af;font-size:12px;">
              © {{year}} LeaseLink • 123 Example St, Suite 100, Anytown, USA
              <br>
              <a href="{{manage_preferences_url}}" class="link" style="color:#34d399;text-decoration:none;">Manage notifications</a>
              &nbsp;•&nbsp;
              <a href="{{privacy_url}}" class="link" style="color:#34d399;text-decoration:none;">Privacy</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
      if (selectedPerson === "App User") {
        const emailres = await fetch(`${supabase_url}/functions/v1/internal-Emails`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": 'application/json' },
          body: JSON.stringify({
            emailbody: confirmEmail,
            emailsubject: 'Welcome to Lease Link',
            emailto: genericFormData.email,
            user_id: session.user.id,
            newUserEmail: true
          })
        })
        if (!emailres.ok) {
          console.error("Email Error:", result);
          alert(result?.error || "Something went wrong. Check console.");
          setSubmitting(false);
          return;
        }
      }
      GTMCreate('Create Person', selectedPerson, genericFormData.name)

      navigate("/dashboard");
    } catch (err) {
      console.error("Submit error:", err);
      alert("Failed to save. See console for details.");
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------
  // Render
  // ----------------------------
  return (
    <div className="mx-auto w-full max-w-6xl px-4 md:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white">
          <FiChevronLeft /> Back
        </button>
        <h1 className="text-xl md:text-2xl font-semibold">{isEditMode ? "Edit Person" : "Create Person"}</h1>
      </div>

      <DisplayBox className="p-0 md:p-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Type selector */}
            {!isEditMode ? (
              <SectionCard title="Person Type">
                <Dropdown
                  options={personOptions}
                  value={selectedPerson || ""}
                  onSelect={(value) => {
                    setPerson(value);
                    setSelectedProperties([]);
                    setSelectedTenant([]);
                    setSelectedUnits([]);
                    setGeneric({
                      name: "",
                      email: "",
                      phone: "",
                      image: "",
                      imageType: "",
                      address: "",
                      contactType: "",
                      password: "",
                      passwordconfirm: "",
                    });
                    setTenant({ dba: "", active: true });
                    setErrors({});
                  }}
                  placeholder="Select Person Type"
                />
              </SectionCard>
            ) : (
              <SectionCard title="Person Type">
                <div className="bg-gray-900/40 rounded-xl px-4 py-3 text-sm">{selectedPerson}</div>
              </SectionCard>
            )}
            {selectedPerson && (
              <div>
                {/* Basic Info */}
                <SectionCard title="Basic Information">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Full Name" htmlFor="name" error={errors.name}>
                      <Input id="name" name="name" placeholder="Enter name" value={genericFormData.name} onChange={handleChange} />
                    </Field>

                    {selectedPerson !== "Tenant" && (
                      <Field label="Email" htmlFor="email" error={errors.email}>
                        <Input id="email" type="email" name="email" placeholder="name@company.com" value={genericFormData.email} onChange={handleChange} />
                      </Field>
                    )}

                    {selectedPerson !== "Tenant" && (
                      <Field label="Phone" htmlFor="phone" error={errors.phone}>
                        <Input id="phone" type="tel" name="phone" placeholder="(555) 555-5555" value={genericFormData.phone} onChange={handleChange} />
                      </Field>
                    )}
                  </div>
                </SectionCard>
              </div>
            )}
            {/* Tenant-only */}
            {selectedPerson === "Tenant" && (
              <SectionCard title="Tenant Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="DBA" htmlFor="dba">
                    <Input id="dba" name="dba" placeholder="Doing Business As" value={tenant.dba} onChange={handleChange} />
                  </Field>

                  <div className="flex items-center gap-3 pt-6">
                    <input id="active" name="active" type="checkbox" className="size-4 rounded border-gray-600" checked={!!tenant.active} onChange={handleChange} />
                    <Label htmlFor="active" className="mb-0">Active Tenant</Label>
                  </div>
                </div>

                {/* Properties for tenant */}
                <div className="mt-4">
                  <Label>Properties</Label>
                  <Dropdown
                    options={properties}
                    onSelect={(property) => {
                      if (!selectedProperties.some((p) => p.prop_id === property.prop_id)) {
                        setSelectedProperties((prev) => [...prev, property]);
                        setProperties((prev) => prev.filter((p) => p.prop_id !== property.prop_id));
                      }
                    }}
                    placeholder="Select properties"
                    getOptionTitle={propertyLabel}
                    getOptionId={(o) => o.prop_id}
                    clearAfterSelect
                  />

                  {selectedProperties.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedProperties.map((property) => (
                        <Chip key={property.prop_id} onRemove={() => removeEntity(property, setSelectedProperties, setProperties, "prop_id")}>
                          {propertyLabel(property)}
                        </Chip>
                      ))}
                    </div>
                  )}
                </div>

                {/* Units after selecting properties */}
                {selectedProperties.length > 0 && (

                  <div className="mt-6 mb-6">
                    {console.log(units)}
                    <Label>Units</Label>
                    <Dropdown
                      usePortal
                      options={units}
                      onSelect={(unit) => {
                        if (!selectedUnits.some((u) => u.unit_id === unit.unit_id)) {
                          setSelectedUnits((prev) => [...prev, unit]);
                          setUnits((prev) => prev.filter((u) => u.unit_id !== unit.unit_id));
                        }
                      }}
                      placeholder="Select units"
                      getOptionTitle={unitLabel}
                      getOptionId={(u) => u.unit_id}
                      clearAfterSelect
                      menuClassName="max-h-[60vh] overflow-y-auto overscroll-contain py-1 touch-pan-y"
                    />

                    {selectedUnits.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {selectedUnits.map((unit) => (
                          <Chip key={unit.unit_id} onRemove={() => removeEntity(unit, setSelectedUnits, setUnits, "unit_id")}>{unitLabel(unit)}</Chip>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </SectionCard>
            )}

            {/* App User-only */}
            {selectedPerson === "App User" && (
              <SectionCard title="User Settings">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Password" htmlFor="password" error={errors.password} helper={isEditMode ? "Leave blank to keep current password" : undefined}>
                    <Input id="password" type="password" name="password" placeholder={isEditMode ? "•••••• (unchanged)" : "Enter password"} value={genericFormData.password} onChange={handleChange} />
                  </Field>
                  <Field label="Confirm Password" htmlFor="passwordconfirm" error={errors.password}>
                    <Input id="passwordconfirm" type="password" name="passwordconfirm" placeholder="Confirm password" value={genericFormData.passwordconfirm} onChange={handleChange} />
                  </Field>
                </div>

                {roleData?.Edit_Users && (
                  <div className="grid grid-cols-1 gap-4 mt-2">
                    <Field label="Role" htmlFor="role">
                      <div className="bg-gray-900/40 rounded-xl ring-1 ring-gray-800">
                        <Dropdown options={permissionLevels} onSelect={setPermission} placeholder={permission || "Select role"} />
                      </div>
                    </Field>

                    {permission !== "Company Admin" && (
                      <Field label="Property Access">
                        <Dropdown
                          options={properties}
                          onSelect={(property) => {
                            if (!selectedProperties.some((p) => p.prop_id === property.prop_id)) {
                              setSelectedProperties((prev) => [...prev, property]);
                              setProperties((prev) => prev.filter((p) => p.prop_id !== property.prop_id));
                            }
                          }}
                          placeholder="Select properties"
                          getOptionTitle={propertyLabel}
                          getOptionId={(o) => o.prop_id}
                          clearAfterSelect
                        />

                        {selectedProperties.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {selectedProperties.map((property) => (
                              <Chip key={property.prop_id} onRemove={() => removeEntity(property, setSelectedProperties, setProperties, "prop_id")}>
                                {propertyLabel(property)}
                              </Chip>
                            ))}
                          </div>
                        )}
                      </Field>
                    )}
                  </div>
                )}
              </SectionCard>
            )}

            {/* Contact-only */}
            {selectedPerson === "Contact" && (
              <SectionCard title="Contact Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Address" htmlFor="address" error={errors.address}>
                    <Input id="address" type="text" name="address" placeholder="123 Main St, City, ST" value={genericFormData.address} onChange={handleChange} />
                  </Field>
                  <Field label="Contact Type" htmlFor="contactType" error={errors.contactType}>
                    <Input id="contactType" type="text" name="contactType" placeholder="e.g., Accounts Payable" value={genericFormData.contactType} onChange={handleChange} />
                  </Field>
                </div>

                <div className="mt-4">
                  <Label>Related Tenants</Label>
                  <Dropdown
                    options={tenants}
                    onSelect={(t) => {
                      if (!selectedTenants.some((x) => x.tenant_id === t.tenant_id)) {
                        setSelectedTenant((prev) => [...prev, t]);
                        setTenants((prev) => prev.filter((p) => p.tenant_id !== t.tenant_id));
                      }
                    }}
                    placeholder="Select tenants"
                    getOptionTitle={tenantLabel}
                    getOptionId={(o) => o.tenant_id}
                    clearAfterSelect
                  />

                  {selectedTenants.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedTenants.map((t) => (
                        <Chip key={t.tenant_id} onRemove={() => removeEntity(t, setSelectedTenant, setTenants, "tenant_id")}>{tenantLabel(t)}</Chip>
                      ))}
                    </div>
                  )}
                </div>
              </SectionCard>
            )}
            {selectedPerson && (
              <>
                {/* Submit CTA */}
                < div className="sticky bottom-3 z-10">
                  <div className=" ml-4 mb-4 w-fit rounded-2xl bg-gray-900/70 backdrop-blur px-3 py-2 shadow-sm">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submitting ? "Saving…" : "Submit"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right: Image + summaries */}
          <div className="space-y-6 lg:sticky lg:top-6 h-fit">
            <SectionCard
              title="Profile Image"
              right={
                (genericFormData.image || editImage) && (
                  <button
                    type="button"
                    className="text-xs text-gray-400 hover:text-red-400"
                    onClick={() => {
                      setGeneric((p) => ({ ...p, image: "", imageType: "" }));
                      setEditImage("");
                    }}
                  >
                    <FiTrash2 className="inline-block mr-1" /> Clear
                  </button>
                )
              }
            >
              <div className="grid grid-cols-1 gap-3">
                <UploadImage
                  onImageSelect={(image) => {
                    setGeneric((prev) => ({ ...prev, image, imageType: image.type }));
                    setEditImage("");
                  }}
                  showPreview={false}
                />

                {/* Live preview */}
                {genericFormData.image instanceof File ? (
                  <img src={URL.createObjectURL(genericFormData.image)} alt="Selected preview" className="w-32 h-32 object-cover rounded-xl ring-1 ring-gray-800" />
                ) : editImage ? (
                  <img src={editImage} alt="Existing preview" className="w-32 h-32 object-cover rounded-xl ring-1 ring-gray-800" />
                ) : (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <FiImage /> No image selected
                  </div>
                )}
              </div>
            </SectionCard>

            {(selectedProperties.length > 0 || selectedUnits.length > 0 || selectedTenants.length > 0) && (
              <SectionCard title="Selections Overview">
                {selectedProperties.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-2">Properties</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProperties.map((property) => (
                        <Chip key={property.prop_id} onRemove={() => removeEntity(property, setSelectedProperties, setProperties, "prop_id")}>{propertyLabel(property)}</Chip>
                      ))}
                    </div>
                  </div>
                )}

                {selectedUnits.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-2">Units</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedUnits.map((unit) => (
                        <Chip key={unit.unit_id} onRemove={() => removeEntity(unit, setSelectedUnits, setUnits, "unit_id")}>{unitLabel(unit)}</Chip>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTenants.length > 0 && (
                  <div>
                    <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-2">Tenants</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedTenants.map((t) => (
                        <Chip key={t.tenant_id} onRemove={() => removeEntity(t, setSelectedTenant, setTenants, "tenant_id")}>{tenantLabel(t)}</Chip>
                      ))}
                    </div>
                  </div>
                )}
              </SectionCard>
            )}
          </div>
        </div>
      </DisplayBox >
      {unitOccupied && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 text-center animate-fadeIn scale-95">
            <div className="flex flex-col items-center space-y-4">

              {/* Icon */}
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-10 h-10 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3m0 4h.01M4.93 4.93l14.14 14.14M12 3C7.03 3 3 7.03 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-4.97-4.03-9-9-9z"
                  />
                </svg>
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-gray-800">
                Unit Already Occupied
              </h2>

              {/* Message */}
              <p className="text-gray-600">
                This unit already has a tenant assigned. Please select another unit
                or remove the current tenant first.
              </p>

              {/* Buttons */}
              <div className="pt-4 flex justify-center space-x-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium transition"
                >
                  Close
                </button>

                <button
                  onClick={goToUnitPage}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow transition"
                >
                  View Unit
                </button>
              </div>
            </div>
          </div>
        </div>

      )}
    </div >
  );
};

export default CreateEditPerson;
