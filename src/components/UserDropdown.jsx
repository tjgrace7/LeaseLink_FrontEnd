import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { FaUserCircle } from 'react-icons/fa'
import { get_entity_image } from '../utilities/get_entity_image';

import SignOut from '../components/SignOut'
//Dropdown that appears when hovering over user icon in TopNav
const UserDropdown = () => {
    //checks to see if Dropdown is open
    const [isOpen, setIsOpen] = useState(false)
    const { userData, session } = useAuth();
    const [image, setImage] = useState("");
    const {roleData} = useAuth()
    let closeTimeout;

    useEffect(() => {
        if (!session || !userData) return;
        const getUserImage = async () => {
        if(userData.image_file_path != null)
        {
        const imageurl = await get_entity_image(userData.image_file_path, session)
        setImage(imageurl)
        }
    }
    getUserImage();
    }, [userData, session])
    const handleMouseEnter = () => {
        clearTimeout(closeTimeout);
        setIsOpen(true);
    }
    const handleMouseLeave = () => {
        closeTimeout = setTimeout(() => {
            setIsOpen(false)
        }, 200)
    }
    return (

        <div className='relative' onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}>
            {/*Creates user icon as a button */}
            <button className='text-white'>
                {image ? (
                    <img
                        src={image}
                        alt="Profile"
                        className="w-12 h-12 rounded-full object-cover border-4 border-white shadow-md mb-4"/>
                ) :
                (
                <FaUserCircle className='w-8 h-8' />
                )}
            </button>
            {/*Checks to see if mouse is in usericon if so. Opens Dropdown*/}
            {isOpen &&
                <div className='absolute right-0 mt-2 w-48 bg-[#222] text-white border border-gray-700 rounded-lg shadow-lg z-50'>
                    {/*Holds all the links to pages in user dropdown */}
                    <a href="/profile" className='block px-4 py-2 hover:bg-gray-700'>Profile</a>
                    {roleData && roleData.Access_Settings && (
                    <a href="/settings" className='block px-4 py-2 hover:bg-gray-700'>Settings</a>
                    )}
                    {userData.company_id === '74326e0e-58c6-4ba4-9d50-caf5670402f0' && (
                        <a href='/admindashboard' className='block px-4 py-2 hover:bg-gray-700'>
                            LeaseLink
                        </a>
                    )}
                    <div className='block px-4 py-2 hover:bg-gray-700'>
                        <SignOut/>
                    </div>
                </div>
            }
        </div>
    );
};
export default UserDropdown;