import Profile from "../components/Profile";
import { useAuth } from "../components/AuthProvider";
import { supabase } from "../supabaseClient";
import Spinner from '../components/Spinner';
import DisplayBox from '../components/DisplayBox';
import { useEffect, useState } from "react";

const UserProfile = () => {
    
    const {session, userData} = useAuth();
    const [company, setCompany] = useState(null);

    useEffect(() => {
        if(!userData) return
        const getCompany = async() => {
            const {data, error} = await supabase.from('Property_Management_Companies').select("*").eq("company_id", userData.company_id)
            if(error){
                console.error("Error Fetching Companies", error)
                return
            }
            setCompany(data[0]);
        }
        getCompany();
    }, [userData])
      if (!userData) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
        <Spinner />
      </div>
    );
  }
    return (
    <div className="flex justify-center items-center mt-6 flex-col">
  {/* Shared width container */}
  <div className="w-1/2 space-y-6">
    <Profile
      entity={userData}
      session={session}
      getFilePath={(user) => user.image_file_path}
      getLabel={(user) =>  user.Name}
      Title="User Profile"
      getEntityId={(u) => u.user_id}
    />

    <DisplayBox className="space-y-4 overflow-y-auto flex flex-col justify-center items-center">
      <h2 className="underline text-4xl">User Info</h2>
      {company != null && (
      <p>{`Company Name: ${company.company_name}`}</p>
      )}
      <p>{`Permission Level: ${userData.permission_level}`}</p>
      <p>{`Phone: ${session?.user?.phone || "No Phone Avaiable"}`}</p>
      <p>{`Email: ${session?.user?.email}`}</p>
    </DisplayBox>
  </div>
</div>

    )
}
export default UserProfile;