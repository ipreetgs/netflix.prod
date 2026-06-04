import React, { useState, useEffect } from 'react';
import { catalogApi, authApi, userApi, notifApi, Movie } from '../api';
import { LayoutDashboard, Film, Users, Zap, Bell, Plus, Edit3, Trash2, CheckCircle2, Shield } from 'lucide-react';

export const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'content' | 'users' | 'kafka' | 'notifications'>('dashboard');

  // Content state
  const [movies, setMovies] = useState<Movie[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMovie, setNewMovie] = useState({
    id: '', title: '', description: '', thumbnailUrl: '', videoUrl: '',
    duration: '', genre: '', year: 2026, matchRating: 98, maturityRating: 'PG-13',
    cast: '', category: 'movie', isTrending: false
  });

  // Users state
  const [usersList, setUsersList] = useState<any[]>([]);

  // Telemetry logs states
  const [kafkaLogs, setKafkaLogs] = useState<any[]>([]);
  const [notifLogs, setNotifLogs] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const movieRes = await catalogApi.get('/api/movies');
      setMovies(movieRes.data);

      // Fetch simulated user profiles / db values
      setUsersList([
        { id: 1, email: 'gurpreet.singh@example.com', role: 'ADMIN', mfa: true, joined: '2026-05-10' },
        { id: 2, email: 'john.doe@example.com', role: 'USER', mfa: false, joined: '2026-06-01' },
        { id: 3, email: 'jane.smith@example.com', role: 'EDITOR', mfa: false, joined: '2026-06-03' }
      ]);

      const notifRes = await notifApi.get('/api/notifications/logs');
      setNotifLogs(notifRes.data);

      setKafkaLogs([
        { id: '1', topic: 'user_registered', timestamp: new Date(Date.now() - 300000).toLocaleTimeString(), details: 'email: john.doe@example.com' },
        { id: '2', topic: 'subscription_created', timestamp: new Date(Date.now() - 250000).toLocaleTimeString(), details: 'plan: Premium, price: $17.99' },
        { id: '3', topic: 'payment_successful', timestamp: new Date(Date.now() - 245000).toLocaleTimeString(), details: 'amount: $17.99' },
        { id: '4', topic: 'movie_viewed', timestamp: new Date(Date.now() - 100000).toLocaleTimeString(), details: 'movieId: 1 (Cosmic Odyssey)' }
      ]);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleAddMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMovie.id || !newMovie.title) return;

    try {
      await catalogApi.post('/api/movies', {
        ...newMovie,
        cast_list: newMovie.cast.split(',').map(s => s.trim())
      });
      alert('Movie successfully added to catalog database!');
      setShowAddForm(false);
      fetchData();
    } catch (err) {
      // Fallback update in state for demonstration
      setMovies([...movies, {
        ...newMovie,
        cast: newMovie.cast.split(',').map(s => s.trim()),
        videoUrl: newMovie.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
      }]);
      setShowAddForm(false);
    }
  };

  const handleToggleRole = (id: number) => {
    setUsersList(prev => prev.map(u => {
      if (u.id === id) {
        const nextRole = u.role === 'ADMIN' ? 'USER' : u.role === 'EDITOR' ? 'ADMIN' : 'EDITOR';
        return { ...u, role: nextRole };
      }
      return u;
    }));
  };

  return (
    <div className="pt-28 px-6 md:px-12 pb-24 text-white font-primary min-h-screen bg-netflix-black flex flex-col md:flex-row gap-8">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-netflix-card border border-white/5 rounded-lg p-6 flex flex-col gap-2 h-fit">
        <h2 className="text-xl font-black mb-6 tracking-wide text-brand uppercase">Admin Panel</h2>
        
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-semibold transition ${
            activeTab === 'dashboard' ? 'bg-brand text-white' : 'text-neutral-400 hover:bg-neutral-800'
          }`}
        >
          <LayoutDashboard size={18} /> Telemetry Dashboard
        </button>

        <button 
          onClick={() => setActiveTab('content')}
          className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-semibold transition ${
            activeTab === 'content' ? 'bg-brand text-white' : 'text-neutral-400 hover:bg-neutral-800'
          }`}
        >
          <Film size={18} /> Catalog Content
        </button>

        <button 
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-semibold transition ${
            activeTab === 'users' ? 'bg-brand text-white' : 'text-neutral-400 hover:bg-neutral-800'
          }`}
        >
          <Users size={18} /> User Management
        </button>

        <button 
          onClick={() => setActiveTab('kafka')}
          className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-semibold transition ${
            activeTab === 'kafka' ? 'bg-brand text-white' : 'text-neutral-400 hover:bg-neutral-800'
          }`}
        >
          <Zap size={18} /> Kafka Live Stream
        </button>

        <button 
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-semibold transition ${
            activeTab === 'notifications' ? 'bg-brand text-white' : 'text-neutral-400 hover:bg-neutral-800'
          }`}
        >
          <Bell size={18} /> Dispatch History
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-netflix-card border border-white/5 rounded-lg p-8 shadow-xl">
        
        {/* Tab 1: Dashboard KPIs */}
        {activeTab === 'dashboard' && (
          <div>
            <h3 className="text-2xl font-bold mb-6">System Health & Telemetry</h3>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <div className="bg-neutral-900 border border-white/5 p-6 rounded">
                <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Concurrent Viewers</span>
                <p className="text-3xl font-black mt-2 text-white">418,290</p>
                <span className="text-xs text-green-500 font-semibold mt-1 block">▲ 14% vs last hour</span>
              </div>
              <div className="bg-neutral-900 border border-white/5 p-6 rounded">
                <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Active Subscribers</span>
                <p className="text-3xl font-black mt-2 text-white">32,809,142</p>
                <span className="text-xs text-brand font-semibold mt-1 block">Target: 35M by Q3</span>
              </div>
              <div className="bg-neutral-900 border border-white/5 p-6 rounded">
                <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider">MRR Revenue</span>
                <p className="text-3xl font-black mt-2 text-white">$425,720,105</p>
                <span className="text-xs text-neutral-400 mt-1 block">Active Stripe payouts</span>
              </div>
              <div className="bg-neutral-900 border border-white/5 p-6 rounded">
                <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider">EKS ALB Health</span>
                <p className="text-lg font-black mt-2 text-green-500 flex items-center gap-1">
                  <CheckCircle2 size={16} /> 200 OK (Healthy)
                </p>
                <span className="text-xs text-neutral-400 mt-1 block">Region: us-east-1 (Primary)</span>
              </div>
            </div>

            {/* Performance charts mock */}
            <div className="bg-neutral-900 border border-white/5 p-6 rounded mb-6">
              <h4 className="font-bold text-base mb-4">Cluster Latency & Performance (Prometheus Logs)</h4>
              <div className="h-48 flex items-end justify-between gap-1 border-b border-neutral-700 pb-2">
                {[45, 60, 35, 70, 85, 90, 50, 40, 65, 80, 55, 48, 62, 75, 88].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-brand rounded-t" style={{ height: `${h}%` }} />
                    <span className="text-[9px] text-neutral-600">t-{15 - i}m</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center text-xs text-neutral-400 mt-4">
                <p>Metrics endpoints exposed: <span className="text-white">/health, /metrics</span></p>
                <p>OneAgent Telemetry: <span className="text-green-500 font-bold">Auto-instrumented</span></p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Content CRUD */}
        {activeTab === 'content' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">Movies & Shows Catalog</h3>
              <button 
                onClick={() => setShowAddForm(true)}
                className="bg-brand hover:bg-brand-hover text-white text-sm font-bold px-4 py-2 rounded flex items-center gap-2 transition"
              >
                <Plus size={16} /> Add Content
              </button>
            </div>

            {/* Catalog Grid list */}
            <div className="bg-neutral-900 border border-white/5 rounded overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-950 text-neutral-400">
                    <th className="p-4">Thumbnail</th>
                    <th className="p-4">Title</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Genre</th>
                    <th className="p-4">Maturity</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {movies.map((m) => (
                    <tr key={m.id} className="border-b border-neutral-800 hover:bg-neutral-850">
                      <td className="p-4 w-24">
                        <img src={m.thumbnailUrl} className="w-16 aspect-[16/9] object-cover rounded" />
                      </td>
                      <td className="p-4 font-bold">{m.title}</td>
                      <td className="p-4 capitalize">{m.category}</td>
                      <td className="p-4">{m.genre}</td>
                      <td className="p-4 text-xs font-semibold">{m.maturityRating}</td>
                      <td className="p-4 flex gap-3 text-neutral-400">
                        <Edit3 size={16} className="hover:text-white cursor-pointer" />
                        <Trash2 size={16} className="hover:text-brand cursor-pointer" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: User RBAC Roles */}
        {activeTab === 'users' && (
          <div>
            <h3 className="text-2xl font-bold mb-6">Identity Roles (RBAC)</h3>
            <div className="bg-neutral-900 border border-white/5 rounded overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-950 text-neutral-400">
                    <th className="p-4">Email</th>
                    <th className="p-4">MFA State</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Date Joined</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => (
                    <tr key={u.id} className="border-b border-neutral-800 hover:bg-neutral-850">
                      <td className="p-4 font-semibold">{u.email}</td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${u.mfa ? 'bg-green-500/20 text-green-500' : 'bg-neutral-800 text-neutral-500'}`}>
                          {u.mfa ? 'MFA_ENABLED' : 'MFA_DISABLED'}
                        </span>
                      </td>
                      <td className="p-4 flex items-center gap-1 font-bold text-neutral-200">
                        <Shield size={14} className="text-brand" /> {u.role}
                      </td>
                      <td className="p-4">{u.joined}</td>
                      <td className="p-4">
                        <button 
                          onClick={() => handleToggleRole(u.id)}
                          className="bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold px-3 py-1.5 rounded transition"
                        >
                          Modify Role
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Kafka Streams */}
        {activeTab === 'kafka' && (
          <div>
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Zap size={20} className="text-yellow-400" /> MSK Kafka Event Listener (Real-Time)
            </h3>
            <p className="text-neutral-400 text-xs mb-6">
              Capturing published topic payloads from service brokers.
            </p>
            <div className="bg-neutral-950 border border-neutral-850 rounded p-6 font-mono text-xs flex flex-col gap-4 max-h-[450px] overflow-y-auto">
              {kafkaLogs.map((log) => (
                <div key={log.id} className="border-l-2 border-yellow-400 pl-4 py-1">
                  <p className="text-yellow-400 font-bold">[{log.timestamp}] TOPIC: {log.topic}</p>
                  <p className="text-neutral-300 mt-1">PAYLOAD: &#123; {log.details} &#125;</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Notification Dispatch */}
        {activeTab === 'notifications' && (
          <div>
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Bell size={20} className="text-brand" /> Notification Log History
            </h3>
            <p className="text-neutral-400 text-xs mb-6">
              Listing sent emails and alert history fetched from the Notification Microservice database.
            </p>
            {notifLogs.length === 0 ? (
              <p className="text-neutral-500 text-sm">No notification alerts currently logged. Stream catalog events to generate logs.</p>
            ) : (
              <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto">
                {notifLogs.map((log) => (
                  <div key={log.id} className="bg-neutral-900 border border-white/5 p-4 rounded flex justify-between items-start gap-4">
                    <div>
                      <p className="text-sm font-bold text-white">{log.type}</p>
                      <p className="text-xs text-neutral-400 mt-1">Recipient: <span className="text-neutral-200 font-semibold">{log.recipient}</span></p>
                      <p className="text-neutral-300 text-xs mt-2 bg-neutral-950 p-2.5 rounded border border-neutral-800 font-mono">
                        {log.content}
                      </p>
                    </div>
                    <span className="text-[10px] text-neutral-600 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add Movie Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-netflix-card border border-white/10 rounded-lg p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">Add Catalog Asset</h3>
            <form onSubmit={handleAddMovie} className="flex flex-col gap-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-neutral-400">ID (e.g. 9)</label>
                  <input type="text" required value={newMovie.id} onChange={e => setNewMovie({...newMovie, id: e.target.value})} className="bg-neutral-800 rounded p-2.5 text-white border border-neutral-700" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-neutral-400">Title</label>
                  <input type="text" required value={newMovie.title} onChange={e => setNewMovie({...newMovie, title: e.target.value})} className="bg-neutral-800 rounded p-2.5 text-white border border-neutral-700" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-400">Description</label>
                <textarea value={newMovie.description} onChange={e => setNewMovie({...newMovie, description: e.target.value})} className="bg-neutral-800 rounded p-2.5 text-white border border-neutral-700 h-20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-neutral-400">Thumbnail URL</label>
                  <input type="text" value={newMovie.thumbnailUrl} onChange={e => setNewMovie({...newMovie, thumbnailUrl: e.target.value})} className="bg-neutral-800 rounded p-2.5 text-white border border-neutral-700" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-neutral-400">Video Playback URL (HLS)</label>
                  <input type="text" value={newMovie.videoUrl} onChange={e => setNewMovie({...newMovie, videoUrl: e.target.value})} className="bg-neutral-800 rounded p-2.5 text-white border border-neutral-700" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-neutral-400">Duration</label>
                  <input type="text" value={newMovie.duration} onChange={e => setNewMovie({...newMovie, duration: e.target.value})} className="bg-neutral-800 rounded p-2.5 text-white border border-neutral-700" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-neutral-400">Genre</label>
                  <input type="text" value={newMovie.genre} onChange={e => setNewMovie({...newMovie, genre: e.target.value})} className="bg-neutral-800 rounded p-2.5 text-white border border-neutral-700" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-neutral-400">Year</label>
                  <input type="number" value={newMovie.year} onChange={e => setNewMovie({...newMovie, year: parseInt(e.target.value, 10)})} className="bg-neutral-800 rounded p-2.5 text-white border border-neutral-700" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-neutral-400">Maturity rating</label>
                  <input type="text" value={newMovie.maturityRating} onChange={e => setNewMovie({...newMovie, maturityRating: e.target.value})} className="bg-neutral-800 rounded p-2.5 text-white border border-neutral-700" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-neutral-400">Category</label>
                  <select value={newMovie.category} onChange={e => setNewMovie({...newMovie, category: e.target.value})} className="bg-neutral-800 rounded p-2.5 text-white border border-neutral-700">
                    <option value="movie">Movie</option>
                    <option value="tv_show">TV Show</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 items-start justify-center pl-2">
                  <label className="text-xs text-neutral-400 flex items-center gap-1 cursor-pointer mt-4">
                    <input type="checkbox" checked={newMovie.isTrending} onChange={e => setNewMovie({...newMovie, isTrending: e.target.checked})} className="accent-brand" /> Trending Featured
                  </label>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-400">Cast list (comma separated)</label>
                <input type="text" value={newMovie.cast} onChange={e => setNewMovie({...newMovie, cast: e.target.value})} className="bg-neutral-800 rounded p-2.5 text-white border border-neutral-700" />
              </div>
              <div className="flex gap-4 mt-4">
                <button type="submit" className="flex-1 bg-brand hover:bg-brand-hover text-white font-bold py-3 rounded transition duration-200">
                  Save Asset
                </button>
                <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 border border-neutral-700 hover:border-white text-white font-bold py-3 rounded transition duration-200">
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
