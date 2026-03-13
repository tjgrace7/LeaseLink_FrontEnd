/**
 * TopNav — sticky top navigation bar (responsive & mobile-friendly).
 *
 * Rendered once inside Layout above the main content area. Contains:
 *  - Brand logo → navigates to /dashboard
 *  - Action buttons: Chat, Upload, Sync Email (conditional), Create Person
 *    (conditional), Create Property/Unit (conditional)
 *  - SearchBar and UserDropdown (hidden on small screens, shown md+)
 *  - Imposter Mode banner — shown when a LeaseLink admin has switched into
 *    another company's context; provides an "Exit" button to revert.
 *
 * Conditional visibility rules:
 *  - firstValue:        the entire nav is hidden until userData has loaded
 *                       (prevents a layout flash before the session is ready)
 *  - emailIntegrated:   Sync Email button is shown only when emailAccess is
 *                       enabled AND the user's Email_Sync_Logs record shows
 *                       status "complete" or "error" (i.e. a prior sync exists)
 *  - canCreatePerson:   at least one of CreateUsers / Create_Tenants /
 *                       Create_Contact / Create_Owner is granted in roleData
 *  - canCreateBuilding: Create_Properties or Create_Unit is granted
 *  - imposter:          userData.Imposter is truthy — set by the admin dashboard
 *                       when switching company context
 */
import { HiPlus, HiOfficeBuilding } from 'react-icons/hi';
import { FaUserPlus } from 'react-icons/fa';
import { FiUpload, FiMessageCircle } from 'react-icons/fi';
import { data, NavLink, useNavigate } from 'react-router-dom';
import SearchBar from './SearchBar';
import UserDropdown from './UserDropdown';
import { useAuth } from './AuthProvider';
import logo from '../assets/Lease_Link_Logo.png';
import chatIcon from '../assets/ChatIcon.png'
import uploadIcon from '../assets/Upload_Icon.png'
import createPerson from '../assets/CreatePerson.png'
import propertyIcon from '../assets/Property_Icon.png'
import resyncEmail from '../assets/ResyncEmail.png'
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const TopNav = () => {
  const { session, roleData, userData, clearFrontEndCompany, emailAccess, effectiveCompanyId } = useAuth();
  const navigate = useNavigate();
  // true when userData.Imposter is set — triggers the amber imposter-mode banner
  const [imposter, setImposter] = useState(false)
  // true when the user has a completed/errored email sync (i.e. prior sync exists)
  const [emailIntegrated, setEmailIntegrated] = useState(false)
  // mirrors userData.First_Value; gates the main nav render to avoid a flash
  // before auth/userData have resolved (default true keeps nav visible on first paint)
  const [firstValue, setFirstValue] = useState(true)
  const [imposterCompany, setImposterCompany] = useState("")
  const company_id = localStorage.getItem("activeCompanyId");

  const auth_id = session?.user?.id;
  const access_token = session?.access_token;
  //switch to import.meta.env.VITE_SERVER_URL
  const server_url = "https://leaselink.onrender.com";

  useEffect(() => {
    if (!userData) return
    setFirstValue(userData.First_Value)
  }, [userData])

  useEffect(() => {
    if (!effectiveCompanyId || !roleData?.Is_LeaseLink_Admin) {
      setImposter(false)
      setImposterCompany('')
      return
    }
    setImposter(true)
    const getCompanyName = async () => {
      const { data, error } = await supabase.from('Property_Management_Companies').select('company_name').eq('company_id', effectiveCompanyId).single()
      if (error) { console.error("Error Fetching Company:", error); return }
      setImposterCompany(data.company_name)
    }
    getCompanyName()
  }, [effectiveCompanyId, roleData])


  useEffect(() => {
    if (!emailAccess) return;
    const getSyncLogs = async () => {
      const { data, error } = await supabase.from("Email_Sync_Logs").select("*").eq("user_id", userData.user_id)
      if (error) {
        console.log("No Sync Logs Available", error)
        return
      }
      if (data.some((log) => log.sync_status === 'complete' || log.sync_status === 'error')) {
        setEmailIntegrated(true)
      }
      else {
        setEmailIntegrated(false)
      }
    }
    getSyncLogs()
  })
  const syncEmail = async () => {
    const payload = {
      auth_id,
    }
    const res = await fetch(`${server_url}/api/email/resync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      body: JSON.stringify(payload),
    });
  }
  // Show "Create Person" if the user has any people-creation permission
  const canCreatePerson =
    !!roleData &&
    (roleData.CreateUsers ||
      roleData.Create_Tenants ||
      roleData.Create_Contact ||
      roleData.Create_Owner);

  // Show "Create Property/Unit" if the user has any building-creation permission
  const canCreateBuilding =
    !!roleData && (roleData.Create_Properties || roleData.Create_Unit);

  const linkBase =
    'inline-flex items-center justify-center rounded focus:outline-none focus:ring-2 focus:ring-blue-400';
  // Smaller icons on mobile, larger on md+
  const iconSize = 'w-6 h-6 md:w-8 md:h-8';
  const activeClass = 'text-blue-400';

  return (
    <div className="sticky top-0 z-40 bg-black/40 backdrop-blur-md border-b border-white/10 text-white">
      {firstValue && (
        <div className="mx-auto flex max-w-full items-center justify-between px-3 py-2 md:px-4 md:py-3">
          {/* Brand / Home */}
          <button
            onClick={() => navigate('dashboard')}
            type="button"
            aria-label="Go to dashboard"
            className={`${linkBase} p-1.5 md:p-2 hover:bg-gray-800 transition-colors`}
            title="Home"
          >
            <img
              src={logo}
              alt="Lease Link Logo"
              className="h-12 md:h-10 lg:h-16 w-auto object-contain block"
            />
          </button>

          {/* Right actions */}
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Chat Page (always visible) */}
            <NavLink
              to="/chat"
              onClick={() => localStorage.setItem("isOldMessage", "false")}
              aria-label="Chat Page"
              title="Chat Page"
              className={({ isActive }) =>
                `${linkBase} p-2 hover:bg-gray-800 transition-colors ${isActive ? activeClass : "text-white"
                }`
              }
            >
              <div className="flex flex-col items-center">
                <img
                  src={chatIcon}
                  alt="Chat Icon"
                  className="h-10 md:h-8 lg:h-10 w-auto object-contain block"
                />
                <p className="md:0">Chat</p>
              </div>
            </NavLink>


            {/* Upload Docs (always visible) */}
            <NavLink
              to="/upload_docs"
              aria-label="Upload documents"
              title="Upload documents"
              className={({ isActive }) =>
                `${linkBase} p-2 hover:bg-gray-800 transition-colors ${isActive ? activeClass : 'text-white'}`
              }
            >
              <div className='flex flex-col items-center'>
                <img
                  src={uploadIcon}
                  alt="Upload icon"
                  className="h-10 md:h-8 lg:h-10 w-auto object-contain block"
                />
                <p className='md:0'>Upload</p>
              </div>
            </NavLink>
            {emailAccess && emailIntegrated && (
              <div>
                <button
                  aria-label="Sync Email"
                  title="Sync Email"
                  className={`${linkBase} p-2 hover:bg-gray-800 transition-colors text-white`}
                  onClick={async () => await syncEmail()}
                >
                  <div className='flex flex-col items-center'>
                    <img
                      src={resyncEmail}
                      alt="Upload icon"
                      className="h-10 md:h-8 lg:h-10 w-auto object-contain block"
                    />
                    <p className='md:0'>Sync Email</p>
                  </div>
                </button>
              </div>
            )}
            {/* Create Person (hide on xs to reduce clutter) */}
            {canCreatePerson && (
              <NavLink
                to="/create_person"
                aria-label="Create person"
                title="Create person"
                className={({ isActive }) =>
                  `hidden sm:inline-flex ${linkBase} p-2 hover:bg-gray-800 transition-colors ${isActive ? activeClass : 'text-white'}`
                }
              >
                <div className='flex flex-col items-center'>
                  <img
                    src={createPerson}
                    alt="Create Person Icon"
                    className="h-10 md:h-8 lg:h-10 w-auto object-contain block"
                  />
                  <p className='md:0'>Create Person</p>
                </div>
              </NavLink>
            )}

            {/* Create Property/Unit (hide on xs) */}
            {canCreateBuilding && (
              <NavLink
                to="/create_building"
                aria-label="Create property or unit"
                title="Create property or unit"
                className={({ isActive }) =>
                  `hidden sm:inline-flex ${linkBase} p-2 hover:bg-gray-800 transition-colors ${isActive ? activeClass : 'text-white'}`
                }
              >
                <div className='flex flex-col items-center'>
                  <img
                    src={propertyIcon}
                    alt="Create Property Icon"
                    className="h-10 md:h-8 lg:h-10 w-auto object-contain block"
                  />
                  <p className='md:0'>Create Property/Unit</p>
                </div>
              </NavLink>
            )}

            {/* Search & User menu (md+) */}
            <div className="hidden md:block">
              <SearchBar
                placeholder="Search..."
                type="all"
                selectEntity={(id, type) => {
                  if (!id || !type) return;
                  navigate(`/${type}/${id}`);
                }}
              />
            </div>
            <div className="hidden md:block">
              <UserDropdown />
            </div>
          </div>
        </div>
      )}
      {imposter && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3">
          {/* Left: context */}
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-amber-300/80">
              Imposter Mode
            </span>
            <h2 className="text-sm font-semibold text-amber-100">
              {imposterCompany}
            </h2>
          </div>

          {/* Right: action */}
          <button
            type="button"
            onClick={async () => {
              setImposter(false)
              await supabase
                .from('User_Data')
                .update({ Imposter: false })
                .eq('company_id', userData.company_id)
              clearFrontEndCompany()
            }}
            className="inline-flex items-center rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200 hover:bg-red-500/20 transition"
            title="Cancel Imposter Mode"
          >
            Exit
          </button>
        </div>
      )}

    </div>

  );
};

export default TopNav;
