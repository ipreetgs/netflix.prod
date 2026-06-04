import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, updateSubscription } from '../store';
import { userApi, billingApi } from '../api';
import { CreditCard, Smartphone, Check, HelpCircle } from 'lucide-react';

export const Account: React.FC = () => {
  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.auth);

  const [devices, setDevices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [activeSub, setActiveSub] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(auth.subscriptionPlan || 'Premium');

  const fetchAccountData = async () => {
    try {
      const devRes = await userApi.get('/api/user/devices');
      setDevices(devRes.data);

      const userIdStr = localStorage.getItem('netflix_user_id') || '1';
      const billRes = await billingApi.get('/api/billing/history', { params: { userId: userIdStr } });
      setPayments(billRes.data.payments);
      setActiveSub(billRes.data.subscriptions[0] || null);
    } catch (err) {
      console.error('Failed to load account data:', err);
    }
  };

  useEffect(() => {
    fetchAccountData();
  }, []);

  const handleUpdatePlan = async () => {
    setLoading(true);
    const userIdStr = localStorage.getItem('netflix_user_id') || '1';
    try {
      await billingApi.post('/api/billing/subscribe', {
        userId: parseInt(userIdStr, 10),
        planName: selectedPlan
      });
      dispatch(updateSubscription(selectedPlan));
      alert(`Plan successfully updated to ${selectedPlan}!`);
      fetchAccountData();
    } catch (err) {
      alert('Failed to update plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-28 px-6 md:px-16 max-w-5xl mx-auto pb-24 text-white font-primary">
      <h2 className="text-4xl font-extrabold mb-8 border-b border-neutral-800 pb-4">Account</h2>

      {/* Membership & Billing Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 pb-8 border-b border-neutral-850">
        <div>
          <h3 className="text-lg text-neutral-400 font-semibold uppercase tracking-wider">Membership & Billing</h3>
          <p className="text-xs text-neutral-500 mt-2">Member since 2026</p>
        </div>
        <div className="md:col-span-2 flex flex-col gap-4">
          <div className="flex justify-between items-center bg-neutral-900 p-4 rounded">
            <div>
              <p className="font-semibold text-neutral-200">Email: {auth.email}</p>
              <p className="text-sm text-neutral-400">Password: ••••••••••</p>
            </div>
          </div>
          <div className="flex justify-between items-center bg-neutral-900 p-4 rounded">
            <div className="flex items-center gap-3">
              <CreditCard className="text-neutral-400" />
              <div>
                <p className="font-semibold">Visa ending in 4242</p>
                <p className="text-xs text-neutral-400">Next billing date: {activeSub ? new Date(activeSub.current_period_end).toLocaleDateString() : 'Next Month'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Details Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 pb-8 border-b border-neutral-850">
        <div>
          <h3 className="text-lg text-neutral-400 font-semibold uppercase tracking-wider">Plan Details</h3>
          <p className="text-sm font-bold text-brand mt-1">{auth.subscriptionPlan} Plan</p>
        </div>
        <div className="md:col-span-2 flex flex-col gap-4">
          <div className="bg-neutral-900 p-6 rounded">
            <p className="text-sm text-neutral-300 mb-4">Change plan tier:</p>
            <div className="flex flex-wrap gap-4 mb-6">
              {['Mobile', 'Basic', 'Standard', 'Premium'].map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPlan(p)}
                  className={`px-6 py-2 rounded text-sm font-semibold border-2 transition ${
                    selectedPlan === p 
                      ? 'border-brand bg-brand/10 text-white' 
                      : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            {selectedPlan !== auth.subscriptionPlan && (
              <button
                onClick={handleUpdatePlan}
                disabled={loading}
                className="bg-brand hover:bg-brand-hover text-white text-xs font-bold px-6 py-3 rounded transition"
              >
                {loading ? 'Updating Plan...' : 'Confirm Plan Update'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Device Sessions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 pb-8 border-b border-neutral-850">
        <div>
          <h3 className="text-lg text-neutral-400 font-semibold uppercase tracking-wider">Security & Devices</h3>
          <p className="text-xs text-neutral-500 mt-2">Manage active device sessions streaming this account.</p>
        </div>
        <div className="md:col-span-2">
          {devices.length === 0 ? (
            <p className="text-neutral-500 text-sm">No active device list logged.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {devices.map((dev) => (
                <div key={dev.id} className="flex justify-between items-center bg-neutral-900 p-4 rounded">
                  <div className="flex items-center gap-3">
                    <Smartphone size={20} className="text-neutral-400" />
                    <div>
                      <p className="font-semibold text-sm">{dev.device_name}</p>
                      <p className="text-xs text-neutral-500">IP: {dev.ip_address} | Last Active: {new Date(dev.last_active).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-green-500 flex items-center gap-1">
                    <Check size={14} /> Active
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h3 className="text-lg text-neutral-400 font-semibold uppercase tracking-wider">Billing History</h3>
        </div>
        <div className="md:col-span-2">
          {payments.length === 0 ? (
            <p className="text-neutral-500 text-sm">No payment history found.</p>
          ) : (
            <div className="bg-neutral-900 rounded overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-950 text-neutral-400">
                    <th className="p-4">Date</th>
                    <th className="p-4">Transaction ID</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((pm) => (
                    <tr key={pm.id} className="border-b border-neutral-800 hover:bg-neutral-850">
                      <td className="p-4">{new Date(pm.created_at).toLocaleDateString()}</td>
                      <td className="p-4 font-mono text-xs">{pm.transaction_id}</td>
                      <td className="p-4 font-semibold">${pm.amount}</td>
                      <td className="p-4">
                        <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded font-bold">
                          {pm.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
