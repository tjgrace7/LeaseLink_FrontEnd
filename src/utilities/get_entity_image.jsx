import {useAuth} from '../components/AuthProvider'

//Calls Supabase to get signed url for provided filepath
export const get_entity_image = async (filePath, session) => {


    const supabase_url = import.meta.env.VITE_SUPABASE_URL;
    
    //Calls Suapbase Edge Function get_entity_photo to get signed url from supabase with filepath
    if(filePath === "") return null;
        
    const res = await fetch(`${supabase_url}/functions/v1/get_entity_photo?file_path=${encodeURIComponent(filePath)}`,
        {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        }
    )
    if (!res.ok)
    {
        console.error('Failed to get Signed URL');
        return null
    }
    const photourl = await res.json()
    //returns only the signed url ready to be used
    return photourl.signedUrl;
}