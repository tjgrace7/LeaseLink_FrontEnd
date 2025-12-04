import DisplayBox from "../components/DisplayBox";

const CheckEmail = () => {
    return (
        <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 min-h-screen w-full flex items-center justify-center px-4 py-12">
            <DisplayBox className="max-w-xl w-full p-8 md:p-10 text-center space-y-4 shadow-lg rounded-2xl bg-white">
                <div className="space-y-4">
                <div className="flex justify-center">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-12 h-12 text-blue-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16 12l-4-4m0 0l-4 4m4-4v12"
                        />
                    </svg>
                </div>

                <h1 className="text-2xl font-semibold text-white-900">
                    Check Your Email
                </h1>

                <p className="text-white-600 leading-relaxed">
                    We’ve sent a verification request to your inbox.  
                    Please confirm the email before continuing.
                </p>
            </div>
            </DisplayBox>
        </div>
    );
};

export default CheckEmail;
