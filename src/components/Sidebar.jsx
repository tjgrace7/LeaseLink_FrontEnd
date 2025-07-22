import logo from '../assets/Lease_Link_Logo.png'
import smalllogo from '../assets/Lease_Link_Logo_Small.png'
import tinylogo from '../assets/Lease_Link_Icon_Tiny.png'
import { FiHome, FiSettings, FiLogOut, FiMessageSquare, FiDatabase } from 'react-icons/fi'
import SignOut from '../components/SignOut'

//Sidebar Component available on side of app
const Sidebar = () => {
    return (
        <div className="h-full flex flex-col p-4 pb-8 bg-black text-white justify-between">
            <div>
                {/*Lease Link Logo in top Right*/}
                <img src={smalllogo} alt={smalllogo} className="flex items-center space-x-2 pl-4" />

                <ul className="space-y-8 list-none pl-4">
                    {/* Home Link + Icon */}
                    <li><a href="/dashboard" className="flex items-center space-x-2 hover:text-blue-400 no-underline text-l sm:text-xl md:text-2xl lg:text-3xl">
                        <FiHome />
                        Home</a></li>
                    {/* Chat Link + Icon */}
                    <li><a href="/chat" onClick={() => {
                        localStorage.removeItem("chat_session_id");
                        localStorage.removeItem("entity_id");
                        localStorage.removeItem("entity_type");
                        localStorage.removeItem("entity_selected");
                        localStorage.removeItem("image_file_path");
                    }} className="flex items-center space-x-2 hover:text-blue-400 no-underline text-l sm:text-xl md:text-2xl lg:text-3xl">
                        <FiMessageSquare />
                        Chat</a></li>

                </ul>
            </div>
        </div>
    );
};

export default Sidebar;