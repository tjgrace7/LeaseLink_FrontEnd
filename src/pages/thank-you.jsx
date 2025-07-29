import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ThankYou = () => {
  const navigate = useNavigate();

  // Optional: auto-redirect after a delay
  // useEffect(() => {
  //   const timer = setTimeout(() => navigate('/'), 10000);
  //   return () => clearTimeout(timer);
  // }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white px-4 text-center">
      <h1 className="text-4xl font-bold mb-6">Thank You!</h1>
      <p className="text-xl max-w-xl mb-10">
        We’ve received your request and will be in touch shortly to get you set up.
        A member of our team will contact you by email to schedule your onboarding.
      </p>

      {/* Placeholder for VSL (coming later) */}
      <div className="w-full max-w-2xl aspect-video bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center text-gray-400">
        Video walkthrough coming soon...
      </div>

      <button
        className="mt-10 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded font-semibold"
        onClick={() => navigate('/')}
      >
        Return to Homepage
      </button>
    </div>
  );
};

export default ThankYou;
