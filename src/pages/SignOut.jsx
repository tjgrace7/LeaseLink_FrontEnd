import { GTMSignOut } from '../components/gtag';
import {supabase} from '../supabaseClient'

//Signs out of Supabase
export const signOut = async () => {
    const {error} = await supabase.auth.signOut();
    if (error) {
        console.error("Error Signing Out:", error.message);
    } else {
        console.log('Signed Out Successfully')
        GTMSignOut()
    }
}