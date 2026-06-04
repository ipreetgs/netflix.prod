import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1); // 1 = Request, 2 = Confirm
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const res = await authApi.post('/api/auth/password-reset/request', { email });
      setMessage('Password reset token generated.');
      setToken(res.data.token || '');
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      await authApi.post('/api/auth/password-reset/confirm', { token, newPassword });
      alert('Password reset successfully!');
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Reset failed. Token might be invalid or expired.');
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
      <h1 className="absolute top-8 left-8 text-4xl font-extrabold text-brand tracking-tighter cursor-pointer" onClick={() => navigate('/')}>
        NETFLIX
      </h1>

      <div className="w-[450px] bg-netflix-black/75 backdrop-blur-md border border-white/10 rounded-lg p-16 shadow-2xl flex flex-col">
        <h2 className="text-3xl font-bold mb-8">Forgot Password</h2>
        
        {error && (
          <div className="bg-orange-600 text-white rounded p-3 text-sm mb-4">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-600 text-white rounded p-3 text-sm mb-4">
            {message}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestReset} className="flex flex-col gap-4">
            <p className="text-neutral-400 text-sm leading-relaxed mb-2">
              Enter your email and we'll generate a reset token. In production, this dispatches a recovery email.
            </p>
            <div className="bg-neutral-800 rounded px-5 py-3 flex flex-col focus-within:bg-neutral-700 border-b-2 border-transparent focus-within:border-brand transition">
              <label className="text-[11px] text-neutral-400">Email Address</label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-transparent border-none outline-none text-white text-base mt-1"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="bg-brand hover:bg-brand-hover disabled:bg-neutral-800 text-white font-bold py-4 rounded text-base mt-6 transition duration-200"
            >
              {loading ? 'Sending Request...' : 'Send Reset Token'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirmReset} className="flex flex-col gap-4">
            <div className="bg-neutral-800 rounded px-5 py-3 flex flex-col focus-within:bg-neutral-700 border-b-2 border-transparent focus-within:border-brand transition">
              <label className="text-[11px] text-neutral-400">Reset Token</label>
              <input 
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                className="bg-transparent border-none outline-none text-white text-base mt-1"
              />
            </div>

            <div className="bg-neutral-800 rounded px-5 py-3 flex flex-col focus-within:bg-neutral-700 border-b-2 border-transparent focus-within:border-brand transition">
              <label className="text-[11px] text-neutral-400">New Password</label>
              <input 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="bg-transparent border-none outline-none text-white text-base mt-1"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="bg-brand hover:bg-brand-hover disabled:bg-neutral-800 text-white font-bold py-4 rounded text-base mt-6 transition duration-200"
            >
              {loading ? 'Updating Password...' : 'Reset Password'}
            </button>
          </form>
        )}

        <p className="mt-8 text-neutral-500 text-sm">
          Remember your password? <Link to="/login" className="text-white hover:underline">Sign in now.</Link>
        </p>
      </div>
    </div>
  );
};
