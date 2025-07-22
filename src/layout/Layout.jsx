import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';
import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import TicketSystem from '../components/TicketSystem';

//Shows the Layout of the App for main to use when loading pages
const Layout = () => {
    const [sidebarOpen, setSideBarOpen] = useState(true);
    return (
        <div className="flex min-h-screen bg-[#222222] text-white">

            {/* Sidebar (fixed width, full height. Controls Sliding Animation) */}
            <div className={`transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0'} bg-[#000000] flex flex-col overflow-hidden`}>
                <Sidebar />
            </div>

            {/* Main area (takes remaining width, full height) */}
            <div className="flex-1 min-h-screen">
                <TopNav toggleSidebar={() => setSideBarOpen(prev => !prev)} />
                <main className="flex-1 overflow-y-auto">

                        <Outlet />

                </main>
            </div>
            <TicketSystem/>
        </div>
    );
};

export default Layout;

