import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider'


const SignIn = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const { session } = useAuth();
    const [testimonial, setTestimonial] = useState('')

    useEffect(() => {
        if (session) {
            navigate('/dashboard');
        }
    })
    useEffect(() => {
        const getTestimonies = async () => {
            const { data, error } = await supabase.from('Testimonials').select('*')
            if (error) {
                console.error("Error Fecting Testimonial", error)
            }
            console.log(data)
            const num = Math.floor(Math.random() * data.length)
            setTestimonial(data[num])
        }
        getTestimonies();
    })
    const handleSignIn = async (e) => {
        e.preventDefault();
        const { data, error } = await supabase.auth.signInWithPassword({
            email, password,
        });
        if (error) {
            alert(error.message)
        }
        else {
            navigate('/dashboard')
        }
    }
    return (
<div className="min-h-screen flex bg-black text-white font-sans">
  {/* Left Side: Sign In Form */}
  <div className="w-1/2 flex items-center justify-center bg-[#0f0f0f]">
    <form onSubmit={handleSignIn} className="w-full max-w-sm p-10">
      <h2 className="text-2xl font-semibold mb-6">Welcome back</h2>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full mb-4 p-3 bg-gray-800 border border-gray-700 rounded text-white"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full mb-6 p-3 bg-gray-800 border border-gray-700 rounded text-white"
        required
      />
      <button
        type="submit"
        className="w-full bg-green-600 hover:bg-green-700 py-2 rounded font-semibold"
      >
        Sign In
      </button>

      <p className="text-sm text-gray-400 mt-4">
        Don’t have an account?{" "}
        <a href="/request" className="text-green-500 hover:underline">
          Book a Demo
        </a>
      </p>
    </form>
  </div>

  {/* Right Side: Testimonial */}
  <div className="w-1/2 flex flex-col items-center justify-center text-center px-16 bg-black">
    {testimonial ? (
      <>
        <p className="text-xl italic mb-6 max-w-lg">
          “{testimonial.Message}”
        </p>
        <div className="flex items-center space-x-4">
          <p className="text-md font-medium">{testimonial.User_Handle}</p>
        </div>
      </>
    ) : (
      <p className="text-gray-500">Loading testimonial...</p>
    )}
  </div>
</div>


    )
}
export default SignIn