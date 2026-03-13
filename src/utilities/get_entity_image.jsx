import { getValueAsType } from "framer-motion";

// utilities/get_entity_image.jsx
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const get_entity_image = async (filePath, session) => {
  try {
    // Guard: null/undefined/empty/whitespace → don't call function
    if (typeof filePath !== 'string' || !filePath.trim()) return null;

    const url = `${supabaseUrl}/functions/v1/get_entity_photo?file_path=${encodeURIComponent(
      filePath
    )}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        // Both headers are useful with Supabase Edge Functions
        Authorization: `Bearer ${session?.access_token ?? ''}`,
        apikey: anonKey,
      },
    });

    if (!res.ok) {
      // Read body so you can see *why* the function refused it (bucket? path? method?)
      const body = await res.text().catch(() => '');
      console.error('Failed to get Signed URL', res.status, body);
      return null;
    }

    const data = await res.json().catch(() => ({}));
    return data?.signedUrl || data?.url || null;
  } catch (e) {
    console.error('get_entity_image error', e);
    return null;
  }
};
