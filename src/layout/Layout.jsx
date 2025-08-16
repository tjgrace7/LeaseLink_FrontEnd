// Layout.jsx
import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';
import { Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import TicketSystem from '../components/TicketSystem';

const Layout = () => {
  const [sidebarOpen, setSideBarOpen] = useState(false);
  const location = useLocation();

  // Lock body scroll when overlay is open (optional)
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  // Close sidebar on route change for mobile screens
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches; // md breakpoint
    if (sidebarOpen && isMobile) setSideBarOpen(false);
  }, [location, sidebarOpen]);

  return (
    <div className="flex min-h-screen bg-[#222222] text-white">
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-opacity duration-200 ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-black/60" onClick={() => setSideBarOpen(false)} />
        <div
          className={`absolute inset-0 bg-[#000000] flex flex-col overflow-y-auto transform transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex w-64 bg-[#000000] flex-col overflow-hidden">
        <Sidebar />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        <TopNav toggleSidebar={() => setSideBarOpen((prev) => !prev)} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <TicketSystem />
    </div>
  );
};

export default Layout;