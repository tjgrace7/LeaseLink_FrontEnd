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