// supabaseClient.js
// Initializes and exports the shared Supabase client instance.
// Both URL and anon key are pulled from Vite environment variables so they
// are never hard-coded in source.
//TODO Make Blanket Utility File
import {createClient} from '@supabase/supabase-js'

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // Single shared client — import this wherever Supabase access is needed.
    export const supabase = createClient(supabaseUrl, supabaseAnonKey)
