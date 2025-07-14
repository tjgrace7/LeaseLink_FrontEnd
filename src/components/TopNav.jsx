import {HiMenu, HiPlus, HiOfficeBuilding} from 'react-icons/hi';
import {FaUserPlus, FaDoorOpen} from 'react-icons/fa';
import {FiUpload} from 'react-icons/fi';
import SearchBar from './SearchBar'
import UserDropdown from './UserDropdown'
import { useAuth } from './AuthProvider';

//Controls the Top Navigation Panel at the top of most pages on the app
const TopNav = ({toggleSidebar}) => {
    const {session } = useAuth();
    return (
        
        <div className=" bg-[#000000] text-white flex items-center p-4 justify-between">
            <div>
                <button onClick={toggleSidebar}>
                <HiMenu className='text-white w-10 h-10'/>
                </button>
            </div>
            <div className='flex items-center space-x-4'>
                {/* Upload Docs icon/link */}
                <a href="/upload_docs"><FiUpload className='w-8 h-8'/></a>
                {/*create user icon/link */}
                <a href="/create_person"><FaUserPlus className='w-8 h-8'/></a>
                {/* create property icon/link */}
                <a href="/create_property" className='flex items-center'><HiOfficeBuilding className='w-8 h-8'/><HiPlus className='w-5 h-5 -ml-1'/></a>

                <a href='create_unit' className='flex items-center'><FaDoorOpen className='w-8 h-8'/></a>
                {/*Search bar  */}
                <div className='hidden md:block flex'>
                    <SearchBar placeholder='Search...'
                    selectEntity={() => {
                        console.log("yea")
                    }}
                    type='all'
                    />
                    
                </div>
                {/*User Dropdown*/}
                <div className='hidden md:block flex'>
                    <UserDropdown/>
                </div>
            </div>

        </div>
    )
}

export default TopNav;