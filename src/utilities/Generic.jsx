/**
 * Generic.jsx — shared utility functions used across multiple pages.
 *
 * Exports:
 *  ArchiveEntity    — soft-deletes an entity (and optional dependents) by
 *                     setting archived=true; cascades by entity type
 *  UnarchiveEntity  — reverses an archive operation; same cascade rules
 *  putWithProgress  — XHR PUT to a signed URL with upload-progress callback
 *                     (fetch API has no native upload progress)
 *  preLoadedChat    — seeds localStorage with entity context then navigates
 *                     to /chat so the session opens on that entity immediately
 *  LoadingSpinner   — simple full-area animated spinner component
 */
import { supabase } from "../supabaseClient";
import { useAuth } from "../components/AuthProvider";
import { useNavigate } from "react-router-dom";

/**
 * Archive an entity and (optionally) its dependents by flipping `archived: true`.
 * Adjust table/column names to match your schema.
 *
 * @param {"Property"|"Unit"|"Tenant"|"Owner"} entity
 * @param {string|number} entity_id
 * @returns {Promise<{ok:boolean, errors:string[]}>}
 */
export const ArchiveEntity = async (entity, entity_id, access_token) => {
  const errors = [];
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!entity_id) return { ok: false, errors: ["Missing entity_id"] };

  const basePatch = { archived: true };

  // ---------- helpers ----------
  const updateEq = async (table, whereCol, value, patch = basePatch) => {
    const { error } = await supabase.from(table).update(patch).eq(whereCol, value);
    if (error) {
      errors.push(`${table}.update eq(${whereCol}=${value}): ${error.message}`);
      return false;
    }
    return true;
  };

  const updateIn = async (table, whereCol, values, patch = basePatch) => {
    if (!values || values.length === 0) return true;
    const { error } = await supabase.from(table).update(patch).in(whereCol, values);
    if (error) {
      errors.push(`${table}.update in(${whereCol} IN [...]): ${error.message}`);
      return false;
    }
    return true;
  };

  const getIdsEq = async (
    table,
    whereCol,
    selectCol,
    value
  ) => {
    const { data, error } = await supabase.from(table).select(selectCol).eq(whereCol, value);
    if (error) {
      errors.push(`select ${table}.eq(${whereCol}=${value}): ${error.message}`);
      return [];
    }
    return data || [];
  };
  try {
    switch (entity) {
      case "Property": {
        // tenants linked via Property_Tenant (ok if none)

        const tenants = await getIdsEq("Property_Tenant", "property_id", "tenant_id", entity_id);

        const tenant_ids = tenants.map((t) => t.tenant_id);

        if (tenant_ids.length > 0) {
          await updateIn("tenant", "tenant_id", tenant_ids);
        }

        // archive the property and any units that point to it (ok if none)
        await Promise.all([
          updateEq("Units", "property_id", entity_id),
          updateEq("properties", "prop_id", entity_id),
        ]);
        break;
      }

      case "Unit": {
        // tenants linked to this unit (optional cascade)
        const tu = await getIdsEq("Tenant_Unit", "unit_id", "tenant_id", entity_id);
        const tenantIds = tu.map((r) => r.tenant_id);

        await Promise.all([
          updateIn("tenant", "tenant_id", tenantIds), // remove if you don't want to archive tenants with the unit
          updateEq("Units", "unit_id", entity_id),
        ]);
        break;
      }

      case "Tenant": {
        try {
          console.log("Removing Tenant")
          const res = await fetch(`${supabaseUrl}/functions/v1/remove_Tenant`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${access_token}`,
            },
            body: JSON.stringify({ tenant_id: entity_id }),
          });

          const text = await res.text();
          console.log("Status:", res.status, "Body:", text);
          console.log("Tenant Update")
          await Promise.all([
            updateEq("tenant", "tenant_id", entity_id),
          ]);
        }
        catch (e) {
          console.error("update eq failed", e)
        }

        break;
      }

      case "Owner": {
        await updateEq("building_owner", "owner_id", entity_id);

        // Optional: cascade to properties if owner_id is tracked on properties
        // const props = await getIdsEq("properties", "owner_id", "prop_id", entity_id);
        // const propIds = props.map((p) => p.prop_id);
        // await updateIn("properties", "prop_id", propIds);
        break;
      }
      case "User": {
        await updateEq('User_Data', 'user_id', entity_id)
        break;
      }

      default:
        return { ok: false, errors: [`Unknown entity type: ${entity}`] };
    }
  } catch (e) {
    errors.push(`Unhandled: ${e?.message || String(e)}`);
  }

  return { ok: errors.length === 0, errors };
};

/**
 * UnarchiveEntity — restores a previously archived entity by setting archived=false.
 * Mirrors the cascade rules of ArchiveEntity (tenants, units, properties).
 *
 * @param {"Property"|"Unit"|"Tenant"|"Owner"|"User"} entity
 * @param {string|number} entity_id
 * @returns {Promise<{ok:boolean, errors:string[]}>}
 */
export const UnarchiveEntity = async (entity, entity_id) => {
  const errors = [];
  const basePatch = { archived: false };

  const updateEq = async (table, whereCol, value) => {
    const { error } = await supabase.from(table).update(basePatch).eq(whereCol, value);
    if (error) errors.push(`${table}.update eq(${whereCol}=${value}): ${error.message}`);
  };
  const updateIn = async (table, whereCol, values) => {
    if (!values?.length) return;
    const { error } = await supabase.from(table).update(basePatch).in(whereCol, values);
    if (error) errors.push(`${table}.update in(${whereCol} in [...]): ${error.message}`);
  };
  const getIdsEq = async (table, whereCol, selectCol, value) => {
    const { data, error } = await supabase.from(table).select(selectCol).eq(whereCol, value);
    if (error) { errors.push(`select ${table}.eq(${whereCol}=${value}): ${error.message}`); return []; }
    return data || [];
  };

  try {
    switch (entity) {
      case "Property": {
        const tenants = await getIdsEq("Property_Tenant", "property_id", "tenant_id", entity_id);
        const tenant_ids = tenants.map((t) => t.tenant_id);
        await Promise.all([
          updateIn("tenant", "tenant_id", tenant_ids), // if you want to cascade restore tenants
          updateEq("Units", "property_id", entity_id),
          updateEq("properties", "prop_id", entity_id),
        ]);
        break;
      }
      case "Unit": {
        const tu = await getIdsEq("Tenant_Unit", "unit_id", "tenant_id", entity_id);
        const tenantIds = tu.map((r) => r.tenant_id);
        await Promise.all([
          updateIn("tenant", "tenant_id", tenantIds),   // cascade restore tenants with the unit (optional)
          updateEq("Units", "unit_id", entity_id),
        ]);
        break;
      }
      case "Tenant": {
        await updateEq("tenant", "tenant_id", entity_id);
        break;
      }
      case "Owner": {
        await updateEq("building_owner", "owner_id", entity_id);
        break;
      }
      case "User": {
        await updateEq('User_Data', 'user_id', entity_id)
        break;
      }
      default:
        return { ok: false, errors: [`Unknown entity type: ${entity}`] };
    }
  } catch (e) {
    errors.push(`Unhandled: ${e?.message || String(e)}`);
  }

  return { ok: errors.length === 0, errors };
};

/**
 * putWithProgress — uploads a file to a pre-signed URL via XHR PUT,
 * reporting upload progress through a callback.
 * The native fetch API does not expose upload progress, so XHR is used instead.
 *
 * @param {string}   signedUrl   — Pre-signed storage URL (e.g. from Supabase)
 * @param {File}     file        — The file object to upload
 * @param {string}   contentType — MIME type (e.g. "application/pdf")
 * @param {Function} onProgress  — Called with integer 0–100 as bytes are sent
 * @returns {Promise<void>}       — Resolves when the upload completes (2xx)
 */
export const putWithProgress = (signedUrl, file, contentType, onProgress = {}) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl, true);
    xhr.setRequestHeader("Content-Type", contentType || "application/octet-stream");
    if (onProgress) {
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && typeof onProgress === "function") {
          const pct = Math.round((evt.loaded / evt.total) * 100);
          onProgress(pct);
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else return reject(new Error(`Upload failed with status ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(file);
    }
  });

/**
 * preLoadedChat — pre-seeds localStorage with entity context so that
 * navigating to /chat immediately opens a session for the given entity,
 * bypassing the "select an entity first" prompt.
 *
 * @param {object} params
 * @param {string} params.entityId   — ID of the entity to pre-select
 * @param {string} params.entityType — "tenant" | "property" | "unit"
 * @param {string} params.entityName — Display name (stored for the chat header)
 * @param {Function} params.navigate — React Router navigate function
 */
export const preLoadedChat = ({entityId, entityType, entityName, navigate}) => {

  console.log(entityId, entityType, entityName)
  localStorage.setItem("chat_session_id", crypto.randomUUID());
  localStorage.setItem('entity_id', entityId);
  localStorage.setItem('entity_type', entityType.toLowerCase());
  localStorage.setItem('entity_selected', 'true')
  localStorage.setItem('isNewNavigation', 'true')
  localStorage.setItem('entity_name', entityName)
  navigate('/chat')
}

/** Full-area animated spinner used during long async operations (e.g. file processing). */
export const LoadingSpinner = () => {
  return (
    <div className="w-full h-full flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-500" />
    </div>
  );
}
