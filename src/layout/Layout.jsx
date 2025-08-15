import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';
import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import TicketSystem from '../components/TicketSystem';

const Layout = () => {
  const [sidebarOpen, setSideBarOpen] = useState(false); // closed by default on mobile

  // Lock body scroll when overlay is open (optional)
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-screen bg-[#222222] text-white">
      
      {/* --- Mobile: full-screen overlay sidebar --- */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-opacity duration-200 ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60"
          onClick={() => setSideBarOpen(false)}
        />
        {/* Sidebar Panel - Full Screen */}
        <div
          className={`absolute inset-0 bg-[#000000] flex flex-col overflow-y-auto transform transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar />
        </div>
      </div>

      {/* --- Desktop: static sidebar --- */}
      <div
        className={`hidden md:flex transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-64'
        } bg-[#000000] flex-col overflow-hidden`}
      >
        <Sidebar />
      </div>

      {/* Main area */}
      <div className="flex-1 min-h-screen flex flex-col">
        {/* TopNav with higher z-index to stay above mobile sidebar */}
        <div className="relative z-50">
          <TopNav toggleSidebar={() => setSideBarOpen((prev) => !prev)} />
        </div>
        
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <TicketSystem />
    </div>
  );
};

export default Layout;