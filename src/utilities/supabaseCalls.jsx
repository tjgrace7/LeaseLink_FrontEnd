import { supabase } from "../supabaseClient";
export const getTable = async (tableName, column_name, match_id) => {
    const {data, error} = await supabase.from(tableName).select("*").eq(column_name, match_id);
    if(error)
    {
        console.error("Error Fetching from", tableName)
        return null;
    }
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