import {useState} from 'react';
import {FaUserCircle} from 'react-icons/fa'

//Dropdown that appears when hovering over user icon in TopNav
const UserDropdown = () => {
    //checks to see if Dropdown is open
    const[isOpen, setIsOpen] = useState(false)
    return (
        
        <div className='relative' onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}>
            {/*Creates user icon as a button */}
            <button className='text-white'>
                <FaUserCircle className='w-8 h-8'/>
            </button>
            {/*Checks to see if mouse is in usericon if so. Opens Dropdown*/}
            {isOpen &&
                <div className='absolute right-0 mt-2 w-48 bg-[#222] text-white border border-gray-700 rounded-lg shadow-lg z-50'>
                    {/*Holds all the links to pages in user dropdown */}
                    <a href="/profile" className='block px-4 py-2 hover:bg-gray-700'>Profile</a>
                    <a href="/settings" className='block px-4 py-2 hover:bg-gray-700'>Settings</a>
                    <a href="/logout" className='block px-4 py-2 hover:bg-gray-700'>Logout</a>
                </div>
            }
        </div>
    );
};
export default UserDropdown;