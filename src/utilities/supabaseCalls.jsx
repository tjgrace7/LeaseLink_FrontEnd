import { supabase } from "../supabaseClient";
export const getTable = async (tableName, column_name, match_id) => {
    const {data, error} = await supabase.from(tableName).select("*").eq(column_name, match_id);
    if(error)
    {
        console.error("Error Fetching from", tableName)
        return null;
    }
    console.log("Data from", tableName, data)
    return data;
}
export const getTableIdList = async (tableName, column_name, IdList) => {
    const {data, error} = await supabase.from(tableName).select("*").in(column_name, IdList)
    if(error)
    {
        console.error("Error Fetching From", tableName)
        return null
    }
    return data
}

export async function fileExistsInStorage(filePath) {
  if (!filePath) return false;

  // path must be relative to the bucket
  const bucket = "lease-docs";
  const parts = filePath.split("/");
  const name = parts.pop();                   // "dqlease.pdf"
  const prefix = parts.join("/");             // "leaselink/tyler_grace/uploadsession_d7bb6b0a...”

  // If your keys used "uploadsession:xxx", sanitize to avoid ":" in object names:
  // (better: fix this at upload time)
  // const safePath = filePath.replace(/:/g, "_");

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(prefix, { search: name, limit: 1 });

  if (error) {
    console.warn("Storage list error:", error); // helps you see if it's a policy problem
    return false;
  }
  return !!data?.some(obj => obj.name === name);
}

/** Fetch all overrides for a tenant_id as { [field]: value } map */
export async function getTenantTermOverrides(tenant_id) {
  const { data, error } = await supabase
    .from("tenant_term_overrides")
    .select("field, value, modified_at")
    .eq("tenant_id", tenant_id);

  if (error) throw error;

  // prefer modified_at, then updated_at, then created_at
  const map = {};
  (data || []).forEach(({ field, value, modified_at}) => {
    map[field] = {
      value,
      modified_at: modified_at || null,
    };
  });
  return map;
}

/** Upsert many overrides at once (batch) */
export async function upsertTenantTermOverrides(tenant_id, editsMap, note, modified_by) {
  const rows = Object.entries(editsMap).map(([field, value]) => ({
    tenant_id,
    field,
    value,
    note: note || null,
    modified_by: modified_by ?? null,
    // let DB default/trigger set modified_at/updated_at
  }));

  const { error } = await supabase
    .from("tenant_term_overrides")
    .upsert(rows, { onConflict: "tenant_id,field" });

  if (error) throw error;
}
