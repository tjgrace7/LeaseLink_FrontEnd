import {useEffect, useState} from 'react';
import {supabase} from '../supabaseClient'
import { useNavigate } from 'react-router-dom';
import {useAuth} from '../components/AuthProvider'


const SignIn = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const {session} = useAuth();

    useEffect(() => {
        if (session) {
            navigate('/dashboard');
        }
    })
    const handleSignIn = async (e) => {
        e.preventDefault();
        const {data, error} = await supabase.auth.signInWithPassword({
            email, password,
        });
        if (error)
        {
            alert(error.message)
        }
        else
        {
            navigate('/dashboard')
        }
    }
    return (
        <form onSubmit={handleSignIn} className='max-w-sm mx-auto mt-12'>
            <h2 className='text-xl mb-4 text-white'>Sign In</h2>
            <input
                type='email'
                placeholder='Email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className='w-full mb-2 p-2 border'
                required
                />
            <input
                type='password'
                placeholder='Password'
                value={password}
                onChange={(e) =>setPassword(e.target.value)}
                className='w-full mb-4 p-2 border'
                required
                />
            <button type='submit' className='w-full bg-blue-600 text-white py-2 rounded'>Sign In</button>
        </form>
    )
}
export default SignIn