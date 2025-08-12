// src/pages/UserProfile.jsx

import { useEffect, useState, useCallback } from "react";
import Profile from "../components/Profile";
import { useAuth } from "../components/AuthProvider";
import { supabase } from "../supabaseClient";
import Spinner from "../components/Spinner";
import DisplayBox from "../components/DisplayBox";

/**
 * UserProfile
 * - Shows the signed-in user's profile card
 * - Displays company info and basic user/contact details
 *
 * Notes:
 * - Uses single() when fetching company to avoid [0] access patterns
 * - Defensive rendering for optional values (phone/email/etc.)
 * - Mobile-first responsive container + accessible headings
 */
const UserProfile = () => {
  const { session, userData } = useAuth();

  const [company, setCompany] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);

  // Fetch the user's company once userData is available
  useEffect(() => {
    if (!userData?.company_id) {
      setCompany(null);
      setLoadingCompany(false);
      return;
    }

    let cancelled = false;

    const getCompany = async () => {
      setLoadingCompany(true);
      try {
        const { data, error } = await supabase
          .from("Property_Management_Companies")
          .select("*")
          .eq("company_id", userData.company_id)
          .single();

        if (error) throw error;
        if (!cancelled) setCompany(data || null);
      } catch (err) {
        console.error("Error fetching company", err);
        if (!cancelled) setCompany(null);
      } finally {
        if (!cancelled) setLoadingCompany(false);
      }
    };

    getCompany();
    return () => {
      cancelled = true;
    };
  }, [userData?.company_id]);

  // Basic helpers for safe display
  const getPhone = useCallback(() => {
    // Supabase phone may live in user.user_metadata for some setups
    return session?.user?.phone || session?.user?.user_metadata?.phone || "No phone available";
  }, [session]);

  const getEmail = useCallback(() => {
    return session?.user?.email || session?.user?.user_metadata?.email || "No email available";
  }, [session]);

  // Initial loading state until we know who the user is
  if (!userData) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold">Your Profile</h1>
      </div>

      {/* Profile Card */}
      <div className="mb-6">
        <Profile
          entity={userData}
          session={session}
          getFilePath={(user) => user?.image_file_path}
          getLabel={(user) => user?.Name || user?.name || "User"}
          Title="User Profile"
          getEntityId={(u) => u?.user_id}
          edit_Entity={true}
        />
      </div>

      {/* Info Panel */}
      <DisplayBox className="space-y-4">
        <h2 className="underline text-xl sm:text-2xl">User Info</h2>

        {/* Company section */}
        <div className="text-sm sm:text-base">
          <p className="mb-1">
            <span className="font-medium">Company Name:</span>{" "}
            {loadingCompany ? "Loading…" : company?.company_name || "No company found"}
          </p>
        </div>

        {/* Permission / Role (kept your field; adjust if you move fully to Roles UI) */}
        <div className="text-sm sm:text-base">
          <p className="mb-1">
            <span className="font-medium">Permission Level:</span>{" "}
            {userData?.permission_level ?? "—"}
          </p>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm sm:text-base">
          <p>
            <span className="font-medium">Phone:</span> {getPhone()}
          </p>
          <p className="break-words">
            <span className="font-medium">Email:</span> {getEmail()}
          </p>
        </div>
      </DisplayBox>
    </div>
  );
};

export default UserProfile;
