
import { HiMenu, HiPlus, HiOfficeBuilding } from 'react-icons/hi';
import { FaUserPlus } from 'react-icons/fa';
import { FiUpload, FiMessageCircle } from 'react-icons/fi';
import { NavLink, useNavigate } from 'react-router-dom';
import SearchBar from './SearchBar';
import UserDropdown from './UserDropdown';
import { useAuth } from './AuthProvider';
import logo from '../assets/Lease_Link_Logo.png'

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
  const iconSize = 'w-8 h-8';
  const activeClass = 'text-blue-400';

  // Debug function to test if toggleSidebar is being called
  const handleMenuClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Menu button clicked!', typeof toggleSidebar);
    
    if (typeof toggleSidebar === 'function') {
      toggleSidebar();
    } else {
      console.error('toggleSidebar is not a function:', toggleSidebar);
    }
  };

  return (
    <div className="bg-black text-white flex items-center p-4 justify-between sticky top-0 z-40 shrink-0">
      {/* Home Link */}
      <button
        onClick={() => navigate('dashboard')}
        type="button"
        aria-label="Toggle sidebar"
        className={`${linkBase} p-2 hover:bg-gray-800 transition-colors`}
        title="Toggle sidebar"
      >
        <img src={logo} alt="Lease Link Logo" className="h-12 w-auto" />
      </button>

      <div className="flex items-center space-x-4">
        {/* Chat Page */}
                <NavLink
          to="/chat"
          aria-label="Chat Page"
          title="Chat Page"
          className={({ isActive }) =>
            `${linkBase} p-2 hover:bg-gray-800 transition-colors ${isActive ? activeClass : 'text-white'}`
          }
        >
          <FiMessageCircle className={iconSize} />
        </NavLink>
        {/* Upload Docs */}
        <NavLink
          to="/upload_docs"
          aria-label="Upload documents"
          title="Upload documents"
          className={({ isActive }) =>
            `${linkBase} p-2 hover:bg-gray-800 transition-colors ${isActive ? activeClass : 'text-white'}`
          }
        >
          <FiUpload className={iconSize} />
        </NavLink>

        {/* Create Person (User/Tenant/Contact/Owner) */}
        {canCreatePerson && (
          <NavLink
            to="/create_person"
            aria-label="Create person"
            title="Create person"
            className={({ isActive }) =>
              `${linkBase} p-2 hover:bg-gray-800 transition-colors ${isActive ? activeClass : 'text-white'}`
            }
          >
            <FaUserPlus className={iconSize} />
          </NavLink>
        )}

        {/* Create Property/Unit */}
        {canCreateBuilding && (
          <NavLink
            to="/create_building"
            aria-label="Create property/unit"
            title="Create property/unit"
            className={({ isActive }) =>
              `${linkBase} p-2 hover:bg-gray-800 transition-colors ${isActive ? activeClass : 'text-white'}`
            }
          >
            <span className="relative inline-flex items-center">
              <HiOfficeBuilding className={iconSize} />
              <HiPlus className="w-5 h-5 -ml-1" />
            </span>
          </NavLink>
        )}

        {/* Search (md+) */}
        <div className="hidden md:block">
          <SearchBar
            placeholder="Search..."
            type="all"
            selectEntity={(id, type) => {
              if (!id || !type) return;
              // Ensure leading slash
              navigate(`/${type}/${id}`);
            }}
          />
        </div>

        {/* User menu (md+) */}
        <div className="hidden md:block">
          <UserDropdown />
        </div>
      </div>
    </div>
  );
};

export default TopNav;