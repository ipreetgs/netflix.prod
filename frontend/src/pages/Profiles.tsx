import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../api';
import { useDispatch } from 'react-redux';
import { setActiveProfile } from '../store';
import { Edit2, Plus, Check } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  avatar: string;
  language: string;
  maturity: string;
}

export const Profiles: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Creation state
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80');

  // Edit Preferences State
  const [prefLang, setPrefLang] = useState('en');
  const [prefMaturity, setPrefMaturity] = useState('PG-13');

  const fetchProfiles = async () => {
    try {
      const res = await userApi.get('/api/profiles');
      setProfiles(res.data);
    } catch (err) {
      console.error('Failed to fetch profiles:', err);
      // Mock Fallback
      setProfiles([
        { id: '1', name: 'Gurpreet', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80', language: 'en', maturity: 'R' },
        { id: '2', name: 'Kids', avatar: 'https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?w=150&auto=format&fit=crop&q=80', language: 'en', maturity: 'G' },
        { id: '3', name: 'Family', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80', language: 'en', maturity: 'PG-13' }
      ]);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleSelectProfile = (p: Profile) => {
    if (isEditing) {
      setEditingProfile(p);
      setPrefLang(p.language || 'en');
      setPrefMaturity(p.maturity || 'PG-13');
      return;
    }

    dispatch(setActiveProfile(p));
    navigate('/home');
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      await userApi.post('/api/profiles', { name: newName, avatar: newAvatar });
      setNewName('');
      setShowAddModal(false);
      fetchProfiles();
    } catch (err) {
      alert('Failed to create profile. Max 5 profiles allowed.');
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;

    try {
      await userApi.put(`/api/profiles/${editingProfile.id}`, {
        language: prefLang,
        maturity: prefMaturity
      });
      setEditingProfile(null);
      fetchProfiles();
    } catch (err) {
      console.error('Failed to save preferences:', err);
    }
  };

  return (
    <div className="min-h-screen text-white bg-netflix-black font-primary flex flex-col items-center justify-center p-6">
      {!editingProfile ? (
        <>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-12 tracking-wide text-center">
            {isEditing ? 'Manage Profiles:' : "Who's watching?"}
          </h2>

          <div className="flex flex-wrap items-center justify-center gap-8 mb-16">
            {profiles.map((p) => (
              <div 
                key={p.id}
                onClick={() => handleSelectProfile(p)}
                className="group flex flex-col items-center gap-4 cursor-pointer relative"
              >
                <div className="relative w-28 h-28 md:w-32 md:h-32 rounded overflow-hidden border-2 border-transparent group-hover:border-white transition duration-200">
                  <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                  {isEditing && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Edit2 size={24} className="text-white" />
                    </div>
                  )}
                </div>
                <span className="text-neutral-400 group-hover:text-white text-lg transition">{p.name}</span>
              </div>
            ))}

            {profiles.length < 5 && (
              <div 
                onClick={() => setShowAddModal(true)}
                className="flex flex-col items-center gap-4 cursor-pointer group"
              >
                <div className="w-28 h-28 md:w-32 md:h-32 rounded flex items-center justify-center bg-neutral-800 border-2 border-transparent group-hover:bg-neutral-700 group-hover:border-white transition duration-200">
                  <Plus size={40} className="text-neutral-500 group-hover:text-white" />
                </div>
                <span className="text-neutral-500 group-hover:text-white text-lg transition">Add Profile</span>
              </div>
            )}
          </div>

          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="border border-neutral-600 px-8 py-3 text-neutral-400 hover:text-white hover:border-white uppercase tracking-widest text-sm font-semibold transition duration-200"
          >
            {isEditing ? 'Done' : 'Manage Profiles'}
          </button>
        </>
      ) : (
        /* Edit Profile Settings */
        <div className="w-full max-w-lg bg-netflix-card border border-white/10 rounded-lg p-10 shadow-2xl">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Edit2 size={20} className="text-brand" /> Edit Profile: {editingProfile.name}
          </h3>

          <form onSubmit={handleSavePreferences} className="flex flex-col gap-6">
            <div className="flex items-center gap-6 mb-4">
              <img src={editingProfile.avatar} alt={editingProfile.name} className="w-20 h-20 rounded object-cover" />
              <div>
                <p className="text-lg font-bold">{editingProfile.name}</p>
                <p className="text-xs text-neutral-500">Maturity setting: {editingProfile.maturity}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-neutral-400 font-semibold">Language Preference</label>
              <select 
                value={prefLang}
                onChange={(e) => setPrefLang(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 text-white rounded p-3 focus:outline-none focus:border-brand"
              >
                <option value="en">English (US)</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-neutral-400 font-semibold">Maturity Rating Lock</label>
              <select 
                value={prefMaturity}
                onChange={(e) => setPrefMaturity(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 text-white rounded p-3 focus:outline-none focus:border-brand"
              >
                <option value="G">G (All Audiences)</option>
                <option value="PG">PG (Parental Guidance)</option>
                <option value="PG-13">PG-13 (Teens)</option>
                <option value="R">R (Restricted Restricted)</option>
                <option value="TV-MA">TV-MA (Mature Adults)</option>
              </select>
            </div>

            <div className="flex items-center gap-4 mt-6">
              <button 
                type="submit"
                className="flex-1 bg-white hover:bg-neutral-200 text-black font-bold py-3 rounded transition duration-200"
              >
                Save
              </button>
              <button 
                type="button"
                onClick={() => setEditingProfile(null)}
                className="flex-1 border border-neutral-700 hover:border-white text-white font-bold py-3 rounded transition duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Profile Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-netflix-card border border-white/10 rounded-lg p-8 shadow-2xl">
            <h3 className="text-2xl font-bold mb-6">Create Profile</h3>

            <form onSubmit={handleCreateProfile} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm text-neutral-400 font-semibold">Profile Name</label>
                <input 
                  type="text"
                  placeholder="Enter name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="bg-neutral-800 border border-neutral-700 text-white rounded p-3 focus:outline-none focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm text-neutral-400 font-semibold">Choose Avatar</label>
                <div className="flex gap-4">
                  {[
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?w=150&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
                  ].map((av) => (
                    <img 
                      key={av}
                      src={av}
                      onClick={() => setNewAvatar(av)}
                      className={`w-14 h-14 rounded object-cover cursor-pointer border-2 transition ${
                        newAvatar === av ? 'border-brand' : 'border-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-4 mt-4">
                <button type="submit" className="flex-1 bg-brand hover:bg-brand-hover text-white font-bold py-3 rounded transition duration-200">
                  Create
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 border border-neutral-700 hover:border-white text-white font-bold py-3 rounded transition duration-200">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
