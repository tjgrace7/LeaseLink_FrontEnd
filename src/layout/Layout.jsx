// Layout.jsx — simplified (no sidebar)
import TopNav from '../components/TopNav';
import { Outlet } from 'react-router-dom';
import TicketSystem from '../components/TicketSystem';

const Layout = () => {
  // If TopNav no longer needs a toggle, you can remove this and the prop below.
  const noop = () => {};

  return (
    <div className="flex min-h-screen bg-[#222222] text-white">
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Pass noop only if TopNav expects a toggleSidebar prop */}
        <TopNav toggleSidebar={noop} />
        <main className="flex-1 overflow-y-auto bg-[#222222]">
          <Outlet />
        </main>
      </div>

      {/* Keep your ticket system */}
      <TicketSystem />
    </div>
  );
};

export default Layout;
