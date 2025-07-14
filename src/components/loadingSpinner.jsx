import React from 'react';
import './Spinner.css'
//Creates spinner used while loading pages
const Spinner = () =>
{
    return (
        <div className="spinner-overlay">
            <div className='spinner'/>
        </div>
    )
}
export default Spinner