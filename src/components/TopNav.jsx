// TopNav.jsx — responsive & mobile-friendly
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
  const { session, roleData, userData, clearFrontEndCompany, emailAccess } = useAuth();
  const navigate = useNavigate();
  const [imposter, setImposter] = useState(false)
  const [emailIntegrated, setEmailIntegrated] = useState(false)

  const auth_id = session?.user?.id;
  const access_token = session?.access_token;
    //switch to import.meta.env.VITE_SERVER_URL
  const server_url = "https://leaselink.onrender.com";

  useEffect(() => {
    if (!userData) return
    if (userData.Imposter) setImposter(true)
  }, [userData])

  useEffect(() => {
    if (!emailAccess) return;
    const getSyncLogs = async () => {
      const { data, error } = await supabase.from("Email_Sync_Logs").select("*").eq("user_id", userData.user_id).single()
      if (error) {
        console.log("No Sync Logs Available", error)
        return
      }
      if (data.sync_status === 'complete') {
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
  const canCreatePerson =
    !!roleData &&
    (roleData.CreateUsers ||
      roleData.Create_Tenants ||
      roleData.Create_Contact ||
      roleData.Create_Owner);

  const canCreateBuilding =
    !!roleData && (roleData.Create_Properties || roleData.Create_Unit);

  const linkBase =
    'inline-flex items-center justify-center rounded focus:outline-none focus:ring-2 focus:ring-blue-400';
  // Smaller icons on mobile, larger on md+
  const iconSize = 'w-6 h-6 md:w-8 md:h-8';
  const activeClass = 'text-blue-400';

  return (
    <div className="sticky top-0 z-40 bg-black/40 backdrop-blur-md border-b border-white/10 text-white">
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
          {console.log(emailIntegrated)}
          {emailAccess && emailIntegrated && (
            <div>
              <button
                aria-label="Sync Email"
                title="Sync Email"
                className={({ isActive }) =>
                  `${linkBase} p-2 hover:bg-gray-800 transition-colors ${isActive ? activeClass : 'text-white'}`
                }
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
      {imposter && (
        <button
          type="button"
          onClick={async () => {
            setImposter(false)
            await supabase.from('User_Data').update({ "Imposter": false }).eq('company_id', userData.company_id)
            clearFrontEndCompany()
          }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15"
          title="Cancel Imposter"
        >
          Cancel Imposter Mode
        </button>
      )}
    </div>
  );
};

export default TopNav;
