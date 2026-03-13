/**
 * UserDropdown
 *
 * Avatar button in the top-right corner of the app that reveals a dropdown
 * menu on hover. Menu items are gated by role:
 *  - "Profile" — always visible
 *  - "Settings" — only when roleData.Access_Settings is truthy
 *  - "LeaseLink" (admin dashboard) — only for LeaseLink admins (Is_LeaseLink_Admin)
 *  - "Sign Out" — always visible
 *
 * The avatar image is fetched from Supabase Storage using a signed URL
 * (get_entity_image). Falls back to a generic user-circle icon if no image
 * is set or the fetch fails.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { FaUserCircle } from 'react-icons/fa';
import { get_entity_image } from '../utilities/get_entity_image';
import SignOut from '../components/SignOut';

const UserDropdown = () => {
  const { userData, roleData, session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [image, setImage] = useState('');
  const closeTimeout = useRef(null);

  // Derive admin flag locally (no hard-coded company_id checks)
  const isLLAdmin = !!roleData?.Is_LeaseLink_Admin;

  useEffect(() => {
    if (!session || !userData?.image_file_path) {
      setImage('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const url = await get_entity_image(userData.image_file_path, session);
        if (!cancelled) setImage(url || '');
      } catch (e) {
        console.error('Failed to load profile image', e);
        if (!cancelled) setImage('');
      }
    })();
    return () => { cancelled = true; };
  }, [userData?.image_file_path, session]);

  // Hover open/close with a short debounce on mouse-leave so the user can
  // move from the trigger button into the dropdown without it immediately
  // closing. The 200 ms timeout is cancelled on re-enter.
  const handleMouseEnter = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    setIsOpen(true);
  };
  const handleMouseLeave = () => {
    closeTimeout.current = setTimeout(() => setIsOpen(false), 200);
  };

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        type="button"
        className="text-white"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {image ? (
          <img
            src={image}
            alt="Profile"
            className="w-12 h-12 rounded-full object-cover border-4 border-white shadow-md"
          />
        ) : (
          <FaUserCircle className="w-8 h-8" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[#222] text-white border border-gray-700 rounded-lg shadow-lg z-50">
          <Link to="/profile" className="block px-4 py-2 hover:bg-gray-700">
            Profile
          </Link>

          {roleData?.Access_Settings && (
            <Link to="/settings" className="block px-4 py-2 hover:bg-gray-700">
              Settings
            </Link>
          )}

          {isLLAdmin && (
            <Link to="/admindashboard" className="block px-4 py-2 hover:bg-gray-700">
              LeaseLink
            </Link>
          )}

          <div className="block px-4 py-2 hover:bg-gray-700">
            <SignOut />
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;
