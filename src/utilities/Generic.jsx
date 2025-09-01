import { supabase } from "../supabaseClient";

/**
 * Archive an entity and (optionally) its dependents by flipping `archived: true`.
 * Adjust table/column names to match your schema.
 *
 * @param {"Property"|"Unit"|"Tenant"|"Owner"} entity
 * @param {string|number} entity_id
 * @returns {Promise<{ok:boolean, errors:string[]}>}
 */
export const ArchiveEntity = async (entity, entity_id) => {
  const errors = [];
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
        await updateEq("tenant", "tenant_id", entity_id);
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