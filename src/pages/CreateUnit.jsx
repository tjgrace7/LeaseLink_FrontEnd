// src/pages/CreateUnitProperty.jsx
// ------------------------------------------------------------
// LeaseLink — Create/Edit Property or Unit (Refreshed)
// Goals
// 1) Clean, modern UI with softer cards (no heavy borders)
// 2) Mobile-first responsive grid + sticky submit on mobile
// 3) Clear comments + defensive data handling
// 4) Preserve existing data flow, utilities, and endpoints
// ------------------------------------------------------------

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../components/AuthProvider";
import { useNavigate, useSearchParams } from "react-router-dom";

import DisplayBox from "../components/DisplayBox";
import UploadImage from "../components/upload_image";
import Dropdown from "../components/dropdown";

import { get_entity_image } from "../utilities/get_entity_image";
import { fileToBase64 } from "../utilities/imageConverter";
import { getTable } from "../utilities/supabaseCalls";
import { FiChevronLeft, FiTrash2, FiImage, FiX } from "react-icons/fi";
import DropdownPortal from "../components/portal";
import { GTMCreate } from "../components/gtag";
import {Label, Input, Field, SectionCard, Chip} from "../components/FormComponents"


const CreateUnitProperty = () => {
  const { session, userData, roleData } = useAuth();
  const navigate = useNavigate();
  const supabaseurl = import.meta.env.VITE_SUPABASE_URL;
  const [searchParams] = useSearchParams();

  const id = searchParams.get("id");
  const type = searchParams.get("type"); // "Property" | "Unit"
  const isEditMode = !!id;

  // Selection + form state
  const [entityOptions, setEntityOptions] = useState([]);
  const [selectedEntity, selectEntity] = useState(type || null);

  const [nameLabel, setNameLabel] = useState("");
  const [namePlaceholder, setNamePlaceholder] = useState("");
  const [parentPlaceholder, setParentPlaceholder] = useState("");
  const [clearSelection, setClearSelection] = useState(false);

  const [Entity, setEntity] = useState({
    square_footage: "",
    label: "", // Address (Unit) or Property Name (Property)
    image: "",
    imageType: "",
    suite: "",
    city: "",
    state: "",
    zip: "",
    commonarea: 0,
  });

  const [initialData, setInitialData] = useState({});
  const [Parent, setParent] = useState([]); // Properties for Unit, Owners for Property
  const [selectedParent, setSelectedParent] = useState(null);
  const [errors, setErrors] = useState({});
  const [editImage, setEditImage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const company_id = localStorage.getItem('activeCompanyId');

  // Show available entity types based on role
  useEffect(() => {
    if (!roleData) return;
    const options = [
      ...(roleData.Create_Properties ? ["Property"] : []),
      ...(roleData.Create_Unit ? ["Unit"] : []),
    ];
    setEntityOptions(options);
  }, [roleData]);

  // Load lists and prefill when selection changes
  useEffect(() => {
    if (!session || !userData || !selectedEntity) return;

    const loadData = async () => {
      try {
        // Configure per-entity labels/placeholders
        if (selectedEntity === "Unit") {
          const props = await getTable("properties", "pm_company", company_id);
          if (!props) return;
          console.log("Fetched properties for parent dropdown:", props);
          setParent(props);
          setNameLabel("Unit Address");
          setNamePlaceholder("Enter address");
          setParentPlaceholder("Select Property");
        }

        if (selectedEntity === "Property") {
          const owners = await getTable("building_owner", "company_id", company_id);
          if (!owners) return;
          setParent(owners);
          setNameLabel("Property Name");
          setNamePlaceholder("Enter property name");
          setParentPlaceholder("Select Owner");
        }

        // Edit mode: fetch existing record
        if (isEditMode) {
          const table = selectedEntity === "Unit" ? "Units" : "properties";
          const column = selectedEntity === "Unit" ? "unit_id" : "prop_id";
          const result = await getTable(table, column, id);
          if (!result?.[0]) return;
          const item = result[0];

          const image = await get_entity_image(item.photo_file_path, session);
          setEditImage(image);

          const payload = {
            label: selectedEntity === "Unit" ? item.address : item.Property_Name,
            square_footage: item.square_footage || "",
            image: "",
            imageType: "",
            suite: item.Suite || "",
            city: item.City || "",
            state: item.State || "",
            zip: item.Zip_Code || "",
            common_area: item.interior_common_area || 0,
          };
          setEntity(payload);
          setInitialData({ ...payload, image });

          // Select correct parent
          const parentKey = selectedEntity === "Unit" ? "property_id" : "owner_id";
          const pKey2 = selectedEntity === "Unit" ? "prop_id" : "owner_id";
          const selected = (selectedEntity === "Unit" ? await getTable("properties", "pm_company", company_id) : await getTable("building_owner", "company_id", company_id)) || [];
          setParent(selected);
          const parentMatch = selected.find((p) => p[pKey2] === item[parentKey]);
          setSelectedParent(parentMatch || null);
        }
      } catch (err) {
        console.error("CreateUnitProperty loadData error:", err);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, userData, selectedEntity, isEditMode, id]);

  // Generic change handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setEntity((prev) => ({ ...prev, [name]: value }));
  };

  // Simple change detection to skip wasted UPDATEs
const hasChanged = useCallback(() => {
  const { image: initialImage, ...initialRest } = initialData;
  const { image: currentImage, ...currentRest } = Entity;

  const baseChanged =
    JSON.stringify(initialRest) !== JSON.stringify(currentRest);

  // image can be:
  // - File (newly chosen)  => definitely changed
  // - string (URL/dataURL) => compare to initial string if present
  // - empty/undefined      => not changed
  let imageChanged = false;
  if (currentImage instanceof File) {
    imageChanged = true;
  } else if (typeof currentImage === "string") {
    imageChanged =
      typeof initialImage !== "string" || currentImage !== initialImage;
  }

  return baseChanged || imageChanged;
}, [Entity, initialData]);


  // Submit handler
  const Submit = async () => {
    if (submitting) return;
    if (isEditMode && !(await hasChanged())) {
      console.log("No changes detected — skipping update.");
      return;
    }

    const newErrors = {};
    if (!Entity.label) newErrors.label = true;
    if (!selectedParent) newErrors.parent = true;

    if (selectedEntity === "Property") {
      if (!Entity.city) newErrors.city = true;
      if (!Entity.state) newErrors.state = true;
      if (!Entity.zip) newErrors.zip = true;
    }

    if (selectedEntity === "Unit") {
      if (!Entity.suite) newErrors.suite = true; // suite can be alphanumeric, leave as text
      if (!Entity.square_footage) newErrors.square_footage = true;
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    try {
      const imageBase64 = Entity.image ? await fileToBase64(Entity.image) : null;

      let payload;
      let endpoint;

      if (selectedEntity === "Unit") {
        payload = {
          unitId: id,
          square_footage: Entity.square_footage,
          property_id: selectedParent.prop_id,
          address: Entity.label,
          suite: Entity.suite,
          image: imageBase64,
          imageType: Entity.imageType,
          user_id: session.user.id,
          company_id: company_id,
        };
        endpoint = "CreateUnit";
      }

      if (selectedEntity === "Property") {
        payload = {
          propertyId: id,
          square_footage: Entity.square_footage,
          name: Entity.label,
          owner_id: selectedParent.owner_id,
          image: imageBase64,
          imageType: Entity.imageType,
          user_id: session.user.id,
          company_id: company_id,
          city: Entity.city,
          state: Entity.state,
          zip: Entity.zip,
        };
        endpoint = "CreateProperty";
      }

      const response = await fetch(`${supabaseurl}/functions/v1/${endpoint}`, {
        method: isEditMode ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        console.error(endpoint + " error:", result);
        alert(result.error || `Failed to ${isEditMode ? "update" : "create"} entity.`);
        setSubmitting(false);
        return;
      }
      GTMCreate('Create Building', selectedEntity, Entity.label)
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
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white"
        >
          <FiChevronLeft /> Back
        </button>
        <h1 className="text-xl md:text-2xl font-semibold">
          {isEditMode ? "Edit" : "Create"} Property/Unit
        </h1>
      </div>

      <DisplayBox className="p-0 md:p-0">
        {/* Responsive grid: form left, preview right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Form (2 cols on desktop) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Entity selector when creating */}
            {!isEditMode && (
              <SectionCard title="Entity Type">
                <Dropdown
                  usePortal
                  options={entityOptions}                 // ["Property", "Unit"]
                  value={selectedEntity || ""}            // string value
                  onSelect={(entity) => {
                    selectEntity(entity);
                    setEntity({
                      square_footage: "",
                      label: "",
                      image: "",
                      imageType: "",
                      suite: "",
                      city: "",
                      state: "",
                      zip: "",
                    });
                    setSelectedParent(null);
                    setErrors({});
                    setClearSelection(true);
                  }}
                  placeholder="Unit or Property"
                  clearSelection={false}
                />
              </SectionCard>
            )}
            {/* Basic details */}
            {selectedEntity && (
              <SectionCard title="Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedEntity === "Unit" && (
                    <Field label="Unit Suite" htmlFor="suite" error={errors.suite}>
                      <Input
                        id="suite"
                        name="suite"
                        placeholder="Enter suite (e.g., 12A)"
                        value={Entity.suite}
                        onChange={handleChange}
                      />
                    </Field>
                  )}

                  <Field label={nameLabel || (selectedEntity === "Unit" ? "Unit Address" : "Property Name")} htmlFor="label" error={errors.label}>
                    <Input
                      id="label"
                      name="label"
                      placeholder={namePlaceholder || (selectedEntity === "Unit" ? "Enter address" : "Enter property name")}
                      value={Entity.label}
                      onChange={handleChange}
                    />
                  </Field>

                  {selectedEntity === "Unit" && (
                    <Field label="Square Footage" htmlFor="square_footage" error={errors.square_footage}>
                      <Input
                        id="square_footage"
                        name="square_footage"
                        type="number"
                        inputMode="numeric"
                        placeholder="Enter unit square footage"
                        value={Entity.square_footage}
                        onChange={handleChange}
                      />
                    </Field>
                  )}

                  {selectedEntity === "Property" && (
                    <>
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
                      <Field label="Interior Common Area Square Footage" htmlFor="common_area" >
                        <Input
                          id="common_area"
                          name="common_area"
                          placeholder="Enter interior common area square footage"
                          value={Entity.common_area}
                          onChange={handleChange}
                        />
                      </Field>
                    </>
                  )}
                </div>

                {/* Parent selector */}
                <div className="mt-4">
                  <Label>{selectedEntity === "Unit" ? "Property" : "Owner"}</Label>
                  <Dropdown
                    usePortal
                    options={Parent}                           // objects (properties or owners)
                    value={selectedParent}                     // object value
                    onSelect={setSelectedParent}
                    placeholder={parentPlaceholder || (selectedEntity === "Unit" ? "Select Property" : "Select Owner")}
                    getOptionId={(o) => o.prop_id || o.owner_id}
                    getOptionTitle={(o) => o.Property_Name || o.owner_name}
                    clearSelection={clearSelection}
                  />
                  {errors.parent && (
                    <p className="text-xs text-red-400 mt-1">Selection is required.</p>
                  )}


                  {/* Show selected parent as a chip */}
                  {selectedParent && (
                    <div className="mt-3">
                      <Chip onRemove={() => setSelectedParent(null)}>
                        {selectedParent.Property_Name || selectedParent.owner_name}
                      </Chip>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Sticky submit */}
            {selectedEntity && (
              <div className="sticky bottom-3 z-10">
                <div className="w-fit rounded-2xl bg-gray-900/70 backdrop-blur px-3 py-2 shadow-sm ml-4 mb-4">
                  <button
                    type="button"
                    onClick={Submit}
                    disabled={submitting}
                    className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Saving…" : "Submit"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Image uploader + preview */}
          <div className="space-y-6 lg:sticky lg:top-6 h-fit">
            <SectionCard
              title="Image"
              right={
                (Entity.image || editImage) && (
                  <button
                    type="button"
                    className="text-xs text-gray-400 hover:text-red-400"
                    onClick={() => {
                      setEntity((p) => ({ ...p, image: "", imageType: "" }));
                      // keep editImage cleared only for UX predictability
                      // so that a user can reselect later without confusion
                      // but here we clear it to reflect the action
                      // comment out next line if you prefer persistent existing preview
                      // setEditImage("");
                    }}
                  >
                    <FiTrash2 className="inline-block mr-1" /> Clear
                  </button>
                )
              }
            >
              <div className="grid grid-cols-1 gap-3">
                <UploadImage
                  onImageSelect={(file) =>
                    setEntity((prev) => ({ ...prev, image: file, imageType: file.type }))
                  }
                  showPreview={false}
                />

                {(Entity.image || editImage) ? (
                  <img
                    src={Entity.image ? URL.createObjectURL(Entity.image) : editImage}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-xl ring-1 ring-gray-800"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <FiImage /> No image selected
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      </DisplayBox>
    </div>
  );
};

export default CreateUnitProperty;
