import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const RequestAccess = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [numberOfTenants, setNumberOfTenants] = useState('');
  const [message, setMessage] = useState('');
  const [testimonial, setTestimonial] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const getTestimonies = async () => {
      const { data, error } = await supabase.from('Testimonials').select('*');
      if (!error && data.length) {
        const num = Math.floor(Math.random() * data.length);
        setTestimonial(data[num]);
      }
    };
    getTestimonies();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { error } = await supabase.from('access_requests').insert({
      full_name: fullName,
      email,
      phone,
      company_name: companyName,
      number_of_tenants: Number(numberOfTenants),
      message,
    });

    if (error) {
      alert('There was a problem submitting your request.');
      console.error(error);
    } else {
      navigate('/thank-you')
    }
  };

  return (
    <div className="min-h-screen flex bg-black text-white font-sans">
      {/* Left Side: Request Form */}
      <div className="w-1/2 flex items-center justify-center bg-[#0f0f0f]">
          <form onSubmit={handleSubmit} className="w-full max-w-sm p-10">
            <h2 className="text-2xl font-semibold mb-6">Request Access</h2>

            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full mb-3 p-3 bg-gray-800 border border-gray-700 rounded text-white"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mb-3 p-3 bg-gray-800 border border-gray-700 rounded text-white"
              required
            />
            <input
              type="text"
              placeholder="Phone (Optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full mb-3 p-3 bg-gray-800 border border-gray-700 rounded text-white"
            />
            <input
              type="text"
              placeholder="Company Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full mb-3 p-3 bg-gray-800 border border-gray-700 rounded text-white"
              required
            />
            <input
              type="number"
              placeholder="Estimated Number of Tenants"
              value={numberOfTenants}
              onChange={(e) => setNumberOfTenants(e.target.value)}
              className="w-full mb-3 p-3 bg-gray-800 border border-gray-700 rounded text-white"
              required
            />
            <textarea
              placeholder="Tell us more about your needs (Optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full mb-6 p-3 bg-gray-800 border border-gray-700 rounded text-white"
            ></textarea>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 py-2 rounded font-semibold"
            >
              Submit Request
            </button>
          </form>
        
      </div>

      {/* Right Side: Testimonial */}
      <div className="w-1/2 flex flex-col items-center justify-center text-center px-16 bg-black">
        {testimonial ? (
          <>
            <p className="text-xl italic mb-6 max-w-lg">“{testimonial.Message}”</p>
            <p className="text-md font-medium">@{testimonial.User_Handle}</p>
          </>
        ) : (
          <p className="text-gray-500">Loading testimonial...</p>
        )}
      </div>
    </div>
  );
};

export default RequestAccess;
