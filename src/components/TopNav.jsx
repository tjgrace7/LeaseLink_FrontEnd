// TopNav.jsx — responsive & mobile-friendly
import { HiPlus, HiOfficeBuilding } from 'react-icons/hi';
import { FaUserPlus } from 'react-icons/fa';
import { FiUpload, FiMessageCircle } from 'react-icons/fi';
import { NavLink, useNavigate } from 'react-router-dom';
import SearchBar from './SearchBar';
import UserDropdown from './UserDropdown';
import { useAuth } from './AuthProvider';
import logo from '../assets/Lease_Link_Logo.png';

const TopNav = ({ toggleSidebar }) => {
  const { roleData } = useAuth();
  const navigate = useNavigate();

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
    <div className="sticky top-0 z-40 bg-black text-white">
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
            aria-label="Chat Page"
            title="Chat Page"
            className={({ isActive }) =>
              `${linkBase} p-2 hover:bg-gray-800 transition-colors ${isActive ? activeClass : 'text-white'}`
            }
          >
            <div className='flex flex-col items-center'>
            <FiMessageCircle className={iconSize} />
            <p className='md:0'>chat</p>
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
            <FiUpload className={iconSize} />
            <p className='md:0'>upload</p>
            </div>
          </NavLink>

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
              <FaUserPlus className={iconSize} />
              <p className='md:0'>create person</p>
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
              <span className="relative inline-flex items-center">
                <HiOfficeBuilding className={iconSize} />
                <HiPlus className="w-4 h-4 md:w-5 md:h-5 -ml-1" />
              </span>
              <p className='md:0'>create property/unit</p>
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
    </div>
  );
};

export default TopNav;
