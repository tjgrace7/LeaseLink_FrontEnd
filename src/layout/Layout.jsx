// Layout.jsx — simplified (no sidebar)
import TopNav from '../components/TopNav';
import { Outlet, useLocation } from 'react-router-dom';
import TicketSystem from '../components/TicketSystem';
import PrivacyGate from '../components/PrivacyPolicyGate';

const Layout = () => {
  const { pathname } = useLocation();
  const isChat = pathname.startsWith('/chat'); // adjust if your route is different
  const noop = () => {};

  return (
    <div className="flex min-h-screen bg-[#222222] text-white">
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav toggleSidebar={noop} />
        <PrivacyGate/>
        <main
          className={
            // scroll normally everywhere, but lock for /chat
            `flex-1 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 mt-0 md:mt-0 ${isChat ? 'overflow-hidden' : 'overflow-y-auto'}`
          }
        >
          <Outlet />
        </main>
      </div>

      <TicketSystem />
    </div>
  );
};

export default Layout;
