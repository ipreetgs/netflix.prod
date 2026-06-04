import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ShieldCheck } from 'lucide-react';
import { billingApi } from '../api';
import { useDispatch } from 'react-redux';
import { updateSubscription } from '../store';

export const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [selectedPlan, setSelectedPlan] = useState('Standard');
  const [loading, setLoading] = useState(false);

  const plans = [
    { name: 'Mobile', price: 2.99, resolution: '480p', devices: '1', downloadDevices: '1', quality: 'Good' },
    { name: 'Basic', price: 7.99, resolution: '720p', devices: '1', downloadDevices: '1', quality: 'Good' },
    { name: 'Standard', price: 12.99, resolution: '1080p', devices: '2', downloadDevices: '2', quality: 'Better' },
    { name: 'Premium', price: 17.99, resolution: '4K+HDR', devices: '4', downloadDevices: '6', quality: 'Best' }
  ];

  const handleSubscribe = async () => {
    setLoading(true);
    const userIdStr = localStorage.getItem('netflix_user_id') || '1';
    const userId = parseInt(userIdStr, 10);

    try {
      // 1. Create subscription via Billing Service
      const subRes = await billingApi.post('/api/billing/subscribe', {
        userId,
        planName: selectedPlan
      });

      // 2. Trigger Mock Payment
      await billingApi.post('/api/billing/pay', {
        userId,
        subscriptionId: subRes.data.id,
        amount: subRes.data.price,
        paymentMethod: 'credit_card'
      });

      // 3. Update local state
      dispatch(updateSubscription(selectedPlan));
      alert(`Successfully subscribed to ${selectedPlan} plan!`);
      navigate('/profiles');
    } catch (err) {
      console.error('Failed to subscribe:', err);
      // Fallback
      dispatch(updateSubscription(selectedPlan));
      navigate('/profiles');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white bg-netflix-black font-primary flex flex-col justify-between py-12 px-6">
      <div className="max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-6 mb-12">
          <h1 className="text-3xl font-extrabold text-brand tracking-tighter">NETFLIX</h1>
          <button 
            onClick={() => navigate('/login')} 
            className="text-neutral-400 hover:text-white transition text-sm font-semibold"
          >
            Sign Out
          </button>
        </div>

        {/* Section Title */}
        <div className="mb-10 text-center md:text-left">
          <span className="text-xs font-bold text-brand uppercase tracking-wider">Step 2 of 3</span>
          <h2 className="text-3xl md:text-4xl font-extrabold mt-2 mb-4">Choose the plan that's right for you</h2>
          <p className="text-neutral-400 flex items-center justify-center md:justify-start gap-2 text-sm">
            <ShieldCheck size={18} className="text-brand" /> Watch everything you want. Ad-free. Cancel anytime.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {plans.map((p) => (
            <div 
              key={p.name}
              onClick={() => setSelectedPlan(p.name)}
              className={`relative cursor-pointer bg-netflix-card border-2 rounded-lg p-6 flex flex-col justify-between transition-all duration-300 transform hover:scale-[1.02] ${
                selectedPlan === p.name 
                  ? 'border-brand shadow-lg shadow-brand/20 bg-brand/5' 
                  : 'border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {selectedPlan === p.name && (
                <div className="absolute top-3 right-3 bg-brand text-white p-1 rounded-full">
                  <Check size={14} />
                </div>
              )}
              <div>
                <h3 className="text-2xl font-bold mb-2">{p.name}</h3>
                <p className="text-3xl font-black mb-6 text-white">${p.price}<span className="text-sm font-medium text-neutral-400">/mo</span></p>
                
                <ul className="text-sm text-neutral-300 flex flex-col gap-3 border-t border-neutral-800/50 pt-6">
                  <li className="flex justify-between">
                    <span className="text-neutral-400">Video quality:</span>
                    <span className="font-semibold">{p.quality}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-neutral-400">Resolution:</span>
                    <span className="font-semibold">{p.resolution}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-neutral-400">Screens at once:</span>
                    <span className="font-semibold">{p.devices}</span>
                  </li>
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center justify-center border-t border-neutral-900 pt-8 gap-4">
          <p className="text-neutral-400 text-xs text-center max-w-2xl leading-relaxed">
            HD (720p), Full HD (1080p), Ultra HD (4K) and HDR availability subject to your internet service and device capabilities. Not all content is available in all resolutions. See our Terms of Use for more details.
          </p>
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="bg-brand hover:bg-brand-hover disabled:bg-neutral-800 text-white text-lg font-bold px-12 py-4 rounded shadow-lg shadow-brand/30 transition duration-200 w-full md:w-auto"
          >
            {loading ? 'Processing membership...' : 'Start Membership'}
          </button>
        </div>
      </div>
    </div>
  );
};
