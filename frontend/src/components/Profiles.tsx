import React from 'react';

interface Profile {
  name: string;
  avatar: string;
}

interface ProfilesProps {
  onSelectProfile: (name: string, avatarUrl: string) => void;
}

const PROFILES: Profile[] = [
  {
    name: 'Gurpreet',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
  },
  {
    name: 'Kids',
    avatar: 'https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?w=150&auto=format&fit=crop&q=80'
  },
  {
    name: 'Family',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80'
  },
  {
    name: 'Guest',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  }
];

export const Profiles: React.FC<ProfilesProps> = ({ onSelectProfile }) => {
  return (
    <div className="profiles-screen">
      <h1 className="profiles-title">Who's watching?</h1>
      <div className="profiles-list">
        {PROFILES.map((profile) => (
          <div 
            key={profile.name} 
            className="profile-card"
            onClick={() => onSelectProfile(profile.name, profile.avatar)}
          >
            <div className="profile-box">
              <img src={profile.avatar} alt={profile.name} />
            </div>
            <div className="profile-name">{profile.name}</div>
          </div>
        ))}
      </div>
      <button className="btn-manage-profiles">Manage Profiles</button>
    </div>
  );
};
