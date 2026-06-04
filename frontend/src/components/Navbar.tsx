import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Search, Bell, LogOut, User, ShieldCheck, Settings } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface NavbarProps {
  onLogout: () => void;
  onSwitchProfile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onLogout,
  onSwitchProfile,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const auth = useSelector((state: RootState) => state.auth);
  const profile = useSelector((state: RootState) => state.profile.activeProfile);

  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim()) {
      navigate(`/search?q=${encodeURIComponent(val)}`);
    } else {
      navigate('/home');
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };

  if (!profile) return null;

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Link to="/home" className="navbar-brand">NETFLIX</Link>
        <ul className="navbar-nav">
          <li><Link to="/home" className={`nav-link ${isActive('/home')}`}>Home</Link></li>
          <li><Link to="/tv" className={`nav-link ${isActive('/tv')}`}>TV Shows</Link></li>
          <li><Link to="/movies" className={`nav-link ${isActive('/movies')}`}>Movies</Link></li>
          <li><Link to="/trending" className={`nav-link ${isActive('/trending')}`}>New & Popular</Link></li>
          <li><Link to="/watchlist" className={`nav-link ${isActive('/watchlist')}`}>My List</Link></li>
        </ul>
      </div>

      <div className="navbar-actions">
        <div className={`search-box ${isSearchExpanded || searchQuery !== '' ? 'expanded' : ''}`}>
          <button onClick={() => setIsSearchExpanded(!isSearchExpanded)} aria-label="Search">
            <Search size={20} />
          </button>
          <input
            type="text"
            placeholder="Titles, people, genres"
            value={searchQuery}
            onChange={handleSearchChange}
            onBlur={() => {
              if (searchQuery === '') {
                setIsSearchExpanded(false);
              }
            }}
          />
        </div>

        <span style={{ cursor: 'pointer', opacity: 0.85 }} title="Notifications">
          <Bell size={20} />
        </span>

        {/* Profiles Dropdown Menu */}
        <div className="profile-menu">
          <img src={profile.avatar} alt={profile.name} className="profile-avatar" />
          <span style={{ fontSize: '13px', fontWeight: 500 }}>{profile.name}</span>
          
          <div className="dropdown-menu">
            <div className="dropdown-item" onClick={onSwitchProfile} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={16} />
              Switch Profile
            </div>
            
            <Link to="/account" className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={16} />
              Account
            </Link>

            {(auth.role === 'ADMIN' || auth.role === 'EDITOR') && (
              <Link to="/admin" className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid #333', paddingTop: '5px' }}>
                <ShieldCheck size={16} className="text-brand" />
                Admin Panel
              </Link>
            )}

            <div className="dropdown-item" onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid #333', marginTop: '5px' }}>
              <LogOut size={16} />
              Sign Out
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
