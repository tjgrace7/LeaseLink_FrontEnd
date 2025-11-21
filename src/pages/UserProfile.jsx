// src/pages/UserProfile.jsx
import { useEffect, useState, useCallback } from "react";
import Profile from "../components/Profile";
import { useAuth } from "../components/AuthProvider";
import { supabase } from "../supabaseClient";
import Spinner from "../components/Spinner";
import DisplayBox from "../components/DisplayBox";

const UserProfile = () => {
  const { session, userData } = useAuth();

  const [company, setCompany] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [emailPopUp, setPopUp] = useState(false)
  //TODO Change to actual backend URL before launching
  const backendURL = 'https://leaselink.onrender.com'

  // ---------- Fetch company once userData is available ----------
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

  // ---------- Safe display helpers ----------
  const getPhone = useCallback(() => {
    return (
      session?.user?.phone ||
      session?.user?.user_metadata?.phone ||
      "No phone available"
    );
  }, [session]);

  const getEmail = useCallback(() => {
    return (
      session?.user?.email ||
      session?.user?.user_metadata?.email ||
      "No email available"
    );
  }, [session]);

  // ---------- Initial loading (no user yet) ----------
  if (!userData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <Spinner />
      </div>
    );
  }
const formatPhone = (raw = "") => {
  const digits = raw.replace(/\D/g, ""); // keep numbers only
  if (digits.length === 10) {
    // (XXX) XXX-XXXX
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    // +1 (XXX) XXX-XXXX
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw; // fallback if formatting not possible
};

  // ---------- Small skeleton block ----------
  const SkeletonLine = ({ className = "" }) => (
    <span className={`block h-4 w-40 animate-pulse rounded bg-white/10 ${className}`} />
  );

  // ---------- BADGE ----------
  const RoleBadge = ({ label }) => (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/80">
      {label || "—"}
    </span>
  );
  const integrateEmail = async (provider) => {
    //Redirect to backend starter route

    const uid = session.user?.id ?? "";
    console.log("User Id", uid)
    window.location.href = `${backendURL}/api/integrations/email/start?provider=${provider}&uid=${encodeURIComponent(uid)}`
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 pb-6 pt-4 sm:pt-6">
      {/* Decorative header band */}
      <div className="mb-4 rounded-2xl bg-gradient-to-r from-[#2a2c36] to-[#1e2230] p-4 ring-1 ring-white/10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold sm:text-xl">Your Profile</h1>
            <p className="mt-0.5 text-xs text-white/60">
              Manage your personal details and company information
            </p>
          </div>
          <div className="mt-1 sm:mt-0">
            <RoleBadge label={userData?.permission_level} />
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <div className="mb-5">
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
      <DisplayBox className="space-y-4 p-4 sm:p-5 flex flex-col items-center p-4">
        {/* Section header */}


          <h2 className="text-base font-semibold sm:text-lg">Account Info</h2>
          {/* Optional: hook up to your edit page if desired */}
          {/* <button
            type="button"
            onClick={() => {/* navigate("/settings") */ /*}}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-white/80 ring-1 ring-inset ring-white/10 hover:bg-white/10"
          >
            Edit
          </button> */}

        <div className="flex justify-between">
          {/* Company */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 sm:p-4">
            <h3 className="mb-2 text-sm font-medium text-white/80">
              Company
            </h3>
            <p className="text-sm">
              <span className="font-medium">Company Name: </span>
              {loadingCompany ? (
                <SkeletonLine className="inline-block align-middle h-3 w-28 ml-2" />
              ) : (
                <span className="break-words">
                  {company?.company_name || "No company found"}
                </span>
              )}
            </p>
          </div>

          {/* Contact grid */}
          <div className="grid grid-cols-1 gap-3 pl-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
              <h3 className="mb-1 text-sm font-medium text-white/80">Phone</h3>
              <p className="text-sm">{formatPhone(getPhone())}</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
              <h3 className="mb-1 text-sm font-medium text-white/80">Email</h3>
              <p className="text-sm break-words">{getEmail()}</p>
            </div>


          </div>

        </div>
            <button className="rounded-xl border border-white/10 p-3 sm:p-4 text-center bg-emerald-600 text-white rounded-xl hover:bg-blue-500"
            onClick={() => setPopUp(!emailPopUp)}>
              <h3 className="mb-1 text-sm font-medium text-white">Integrate Email</h3>
            </button>
        {/* Footer note */}
        <p className="pt-1 text-center text-xs text-white/50">
          LeaseLink can make mistakes — please verify important details.
        </p>
      </DisplayBox>
      {emailPopUp && (
         <div className="flex flex-col space-y-2 rounded-lg p-3 bg-lease-gradient mt-5">
          <button
            onClick={() => integrateEmail("microsoft")}
            className="rounded-xl border border-white/10 p-3 sm:p-4 text-center bg-emerald-600 text-white rounded-xl hover:bg-blue-500"
          >
            Connect Microsoft Outlook
          </button>
          <button
            onClick={() => integrateEmail("google")}
            className="rounded-xl border border-white/10 p-3 sm:p-4 text-center bg-emerald-600 text-white rounded-xl hover:bg-blue-500"
          >
            Connect Gmail 
          </button>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
