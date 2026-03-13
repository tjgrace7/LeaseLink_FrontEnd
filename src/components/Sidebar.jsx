/**
 * Sidebar
 *
 * Fixed left-hand navigation panel rendered inside the main Layout.
 * Contains the LeaseLink logo, primary nav links (Home, Chat), and a
 * sign-out button in the footer.
 *
 * The sidebar itself is stateless — it just reads from the router to
 * apply the active-link highlight via NavLink's `isActive` callback.
 */
import { NavLink, useNavigate } from 'react-router-dom';
import smalllogo from '../assets/Lease_Link_Logo_Small.png';
import { FiHome, FiMessageSquare, FiLogOut } from 'react-icons/fi';
import SignOut from '../components/SignOut'; // if this renders a button/handles auth

const Sidebar = () => {
  const navigate = useNavigate();

  /**
   * Clears all chat-related keys from localStorage so that navigating to
   * /chat via the sidebar always starts a fresh session rather than
   * resuming a previous entity context.
   */
  const clearChatState = () => {
    localStorage.removeItem('chat_session_id');
    localStorage.removeItem('entity_id');
    localStorage.removeItem('entity_type');
    localStorage.removeItem('entity_selected');
    localStorage.removeItem('image_file_path');
  };

  const linkBase =
    'flex items-center space-x-2 no-underline text-white/90 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-1';
  const linkSizes = 'text-base sm:text-xl md:text-2xl lg:text-3xl';
  const activeClass = 'text-blue-400';

  return (
    <aside className="h-full flex flex-col p-4 pb-8 bg-black text-white justify-between">
      <div>
        {/* Logo */}
        <div className="pl-4 mb-6">
          <img
            src={smalllogo}
            alt="LeaseLink logo"
            className="h-9 w-auto"
            draggable={false}
          />
        </div>

        {/* Nav */}
        <ul className="space-y-6 list-none pl-4">
          <li>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `${linkBase} ${linkSizes} ${isActive ? activeClass : ''}`
              }
            >
              <FiHome />
              <span>Home</span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/chat"
              onClick={clearChatState}
              className={({ isActive }) =>
                `${linkBase} ${linkSizes} ${isActive ? activeClass : ''}`
              }
            >
              <FiMessageSquare />
              <span>Chat</span>
            </NavLink>
          </li>
        </ul>
      </div>

      {/* Footer / Sign out */}
      <div className="pl-4 pt-6 border-t border-white/10">
        {/* If your SignOut component already handles the click/auth, keep it. 
            Otherwise, you can render a button with FiLogOut and call your sign-out logic. */}

        {/* SignOut renders the logout button and handles auth + redirect */}
        <SignOut />

        {/* Decorative logout icon rendered alongside the SignOut button */}
        <FiLogOut />

      </div>
    </aside>
  );
};

export default Sidebar;
