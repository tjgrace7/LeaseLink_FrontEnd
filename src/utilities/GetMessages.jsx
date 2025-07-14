

//When an entity is selected from the Search Bar. This function calls supabase edge function entity-session-organizer to get all previous chat sessions for that entity
export const getPreviousChats = async (entityId, session, setChats) => {
    const supabase_url = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabase_url}/functions/v1/entity-session-organizer?entity_id=${entityId}`,
        {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        })

    const data = await response.json();
    if (data === null) {
        setChats("No Previous Chats Available");
    }
    else {
        setChats(data.sessions)
    }
}
export const getMessages = async (sessionId) => {
    //Gets directly from supabase table. The messages for the session in order of creation. Newest at bottom
    //TODO set up RLS security for table
    const { data, error } = await supabase.from('entity_questions').select("*").eq('session_id', sessionId).order('created_at', { ascending: true });
    if (error) {
        console.error('Failed to fetch messages', await supabase_messages.text());
        return [];
    }

    return data


}