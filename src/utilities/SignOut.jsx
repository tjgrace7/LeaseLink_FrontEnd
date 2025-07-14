import { supabase } from '../supabaseClient';
//Logs out of Supabase
export const signOut = async () => {
    console.log("Supabase Sign Out")
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error.message);
  } else {
    console.log('Signed out successfully');
  }
};
