import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const draftEmail = localStorage.getItem('signup_email_draft') || '';
  const [email, setEmail] = useState(draftEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authApi.post('/api/auth/register', { email, password });
      
      // Save in Redux
      dispatch(setCredentials({
        token: res.data.accessToken,
        email: res.data.email,
        role: res.data.role,
        plan: 'None'
      }));

      // Parse payload to get userId
      const tokenParts = res.data.accessToken.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        localStorage.setItem('netflix_user_id', payload.userId);
      }

      localStorage.removeItem('signup_email_draft');
      navigate('/pricing');
    } catch (err: any) {
      console.error('Registration failed:', err);
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen text-white font-primary flex items-center justify-center relative bg-cover bg-center"
      style={{ 
        backgroundImage: `radial-gradient(circle at center, rgba(20,20,20,0.6) 0%, rgba(8,8,8,0.95) 100%), url('https://images.unsplash.com/photo-1574375927938-d5a98e8fed85?q=80&w=2069&auto=format&fit=crop')`
      }}
    >
      {/* Red logo back link */}
      <h1 className="absolute top-8 left-8 text-4xl font-extrabold text-brand tracking-tighter cursor-pointer" onClick={() => navigate('/')}>
        NETFLIX
      </h1>

      <div className="w-[450px] bg-netflix-black/75 backdrop-blur-md border border-white/10 rounded-lg p-16 shadow-2xl flex flex-col">
        <h2 className="text-3xl font-bold mb-8">Sign Up</h2>
        
        {error && (
          <div className="bg-orange-600 text-white rounded p-3 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div className="bg-neutral-800 rounded px-5 py-3 flex flex-col focus-within:bg-neutral-700 border-b-2 border-transparent focus-within:border-brand transition">
            <label className="text-[11px] text-neutral-400">Email</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-transparent border-none outline-none text-white text-base mt-1"
            />
          </div>

          <div className="bg-neutral-800 rounded px-5 py-3 flex flex-col focus-within:bg-neutral-700 border-b-2 border-transparent focus-within:border-brand transition">
            <label className="text-[11px] text-neutral-400">Password</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-transparent border-none outline-none text-white text-base mt-1"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="bg-brand hover:bg-brand-hover disabled:bg-neutral-800 text-white font-bold py-4 rounded text-base mt-6 transition duration-200"
          >
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <p className="mt-8 text-neutral-500 text-sm">
          Already have an account? <Link to="/login" className="text-white hover:underline">Sign in now.</Link>
        </p>
      </div>
    </div>
  );
};
