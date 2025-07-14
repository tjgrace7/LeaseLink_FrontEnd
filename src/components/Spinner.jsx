//Creates animated loading dots for ai message as it runs through server workflow
const Spinner = () => (
    <div className="flex space-x-2 animate-pulse">
        <div className='w-2 h-2 bg-white rounded-full opacity-30 animate-bounce [animation-delay:.1s]'></div>
        <div className="w-2 h-2 bg-white rounded-full opacity-50 animate-bounce [animation-delay:.2s]"/>
        <div className="w-2 h-2 bg-white rounded-full opacity-75 animate-bounce [animation-delay:.3s]"/>

    </div>
);
export default Spinner;