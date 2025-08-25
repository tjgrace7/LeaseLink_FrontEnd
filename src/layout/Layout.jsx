// Layout.jsx — unified sidebar toggle for mobile + desktop
import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';
import { Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import TicketSystem from '../components/TicketSystem';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Open by default on desktop at first mount; closed on mobile
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSidebarOpen(window.innerWidth >= 768);
    }
  }, []);

  // Single source of truth to toggle from TopNav hamburger
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  // Lock body scroll only when MOBILE sidebar is open
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobile && sidebarOpen) {
      const { overflow } = document.body.style;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = overflow; };
    }
    // reset when closed or on desktop
    document.body.style.overflow = '';
  }, [sidebarOpen]);

  // Close the sidebar on route change on MOBILE (desktop keeps user choice)
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobile && sidebarOpen) setSidebarOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // Optional: close on ESC (mobile only)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        if (isMobile) setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#222222] text-white">
      {/* Mobile overlay + drawer (covers whole screen) */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!sidebarOpen}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />

        {/* Drawer */}
        <div
          className={`absolute inset-y-0 left-0 w-full bg-[#000000] flex flex-col overflow-y-auto transform transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">Menu</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-white hover:text-gray-300 p-1 rounded-md hover:bg-gray-800 transition-colors"
              aria-label="Close sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1">
            <Sidebar />
          </div>
        </div>
      </div>

      {/* Desktop sidebar — collapsible with the same state */}
      <div
        className={`hidden md:flex bg-[#000000] flex-col overflow-hidden shrink-0 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-0'
        }`}
        aria-hidden={!sidebarOpen}
      >
        {sidebarOpen ? <Sidebar /> : null}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav toggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-y-auto bg-[#222222]">
          <Outlet />
        </main>
      </div>

      <TicketSystem />
    </div>
  );
};

export default Layout;
