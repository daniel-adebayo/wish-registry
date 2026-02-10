import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Gift, Plus, Calendar, LogOut, CheckCircle2, Trash2, Sparkles, Search, X, Camera, Upload } from 'lucide-react';

export default function Dashboard({ session, onLogout }) {
  // --- STATE ---
  const [activeListId, setActiveListId] = useState(session.user.id);
  const [notifications, setNotifications] = useState([]);
  const [gifts, setGifts] = useState([]);
  
  // User Data State
  const [birthday, setBirthday] = useState(session.user.user_metadata?.birthday || '');
  const [avatarUrl, setAvatarUrl] = useState(session.user.user_metadata?.avatar_url || '');
  const [displayName, setDisplayName] = useState(session.user.user_metadata?.full_name || session.user.email.split('@')[0]);
  
  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // Edit Form State
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editName, setEditName] = useState('');
  const [editBirthday, setEditBirthday] = useState('');
  
  const [newGift, setNewGift] = useState({ name: '', price: '', description: '', image: '' });
  const fileInputRef = useRef(null);

  // --- EFFECTS ---
  useEffect(() => {
    fetchGifts();
    // Initialize local state from session
    const meta = session.user.user_metadata || {};
    setBirthday(meta.birthday || '');
    setAvatarUrl(meta.avatar_url || '');
  }, [session]);

  async function fetchGifts() {
    const { data, error } = await supabase.from('gifts').select('*');
    if (error) console.error("Error fetching gifts:", error);
    else setGifts(data);
  }

  // --- HANDLERS ---
  
  // Helper to format dates to "Month Day"
  const formatBirthday = (dateStr) => {
    if (!dateStr) return 'No Date Set';
    if (!dateStr.includes('-')) return dateStr;
    const date = new Date(dateStr);
    if (isNaN(date)) return dateStr; 
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  // Handle File Selection (Base64)
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatarUrl(reader.result); 
      };
      reader.readAsDataURL(file);
    }
  };

  // Open Profile Modal
  const openProfileModal = () => {
    setEditAvatarUrl(avatarUrl);
    setEditName(displayName);
    setEditBirthday(birthday);
    setIsProfileModalOpen(true);
  };

  // Trigger hidden file input
  const triggerFileUpload = () => {
    fileInputRef.current.click();
  };

  // Handle Profile Save
  const handleProfileSave = async (e) => {
    e.preventDefault();
    
    // Update Supabase
    const { error } = await supabase.auth.updateUser({
      data: { 
        full_name: editName,
        avatar_url: editAvatarUrl, 
        birthday: editBirthday 
      }
    });
    
    if (error) {
      console.error("Failed to update profile:", error);
      alert("Could not save profile changes. The image might be too large.");
    } else {
      // Update Local State Immediately
      setDisplayName(editName);
      setAvatarUrl(editAvatarUrl);
      setBirthday(editBirthday);
      
      setIsProfileModalOpen(false); 
      addNotification("Profile updated successfully!");
    }
  };

  const handleAddGift = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('gifts').insert([
      { 
        name: newGift.name, price: newGift.price, description: newGift.description,
        image_url: newGift.image, owner_id: session.user.id, reserved_by: null 
      }
    ]);
    if (error) alert("Error adding gift");
    else { setIsModalOpen(false); setNewGift({ name: '', price: '', description: '', image: '' }); fetchGifts(); addNotification("New gift added!"); }
  };

  const handleReserve = async (giftId) => {
    const currentGift = gifts.find(g => g.id === giftId);
    if (!currentGift) return;
    const shouldReserve = currentGift.reserved_by === null;
    const { error } = await supabase.from('gifts').update({ reserved_by: shouldReserve ? session.user.id : null }).eq('id', giftId);
    if (error) console.error("Error reserving:", error);
    else { fetchGifts(); addNotification(shouldReserve ? `Reserved "${currentGift.name}"!` : `Cancelled reservation`); }
  };

  const handleDeleteGift = async (giftId) => {
    if (!confirm("Remove this gift?")) return;
    const { error } = await supabase.from('gifts').delete().eq('id', giftId);
    if (error) console.error("Error deleting:", error);
    else { fetchGifts(); addNotification("Gift removed."); }
  };

  const addNotification = (msg) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, msg }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  };

  if (!session || !session.user) return <div className="p-10 text-center text-white">Loading...</div>;

  const user = session.user;
  
  // Use local state values
  const currentAvatar = avatarUrl || `https://ui-avatars.com/api/?name=${displayName}&background=6366f1&color=fff`;

  // Since there are no fake users, 'allUsers' is just the current user
  const allUsers = [
    { id: user.id, name: displayName, avatar: currentAvatar, isMe: true, birthday: birthday }
  ];

  // Since only your list is available, you are always active
  const isMyList = true; 
  const activeUser = { name: displayName, avatar: currentAvatar, birthday: birthday }; 

  const userGifts = gifts.filter(g => g.owner_id === activeListId);

  return (
    <div className="flex h-screen bg-[#0f172a] text-white font-sans selection:bg-indigo-500 selection:text-white overflow-hidden relative">
      
      {/* --- DOT GRID BACKGROUND --- */}
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundSize: '40px 40px',
          backgroundImage: 'linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)'
        }}
      ></div>
      
      {/* --- GLOW EFFECTS --- */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* --- SIDEBAR (Glassmorphism) --- */}
      <aside className="relative z-10 w-72 bg-slate-900/40 backdrop-blur-xl border-r border-white/5 flex flex-col md:flex">
        <div className="p-6 flex items-center gap-3 border-b border-white/5">
          <img 
            src="/images/my-logo.png" 
            alt="Logo" 
            className="w-8 h-8 object-contain"
          />
          <span className="font-bold tracking-tight text-lg">WishRegistry</span>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3">
          <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Your Circle</p>
          <nav className="space-y-1">
            {allUsers.map(u => (
              <button
                key={u.id}
                onClick={() => setActiveListId(u.id)}
                className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 group bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
              >
                <img src={u.avatar} className="w-8 h-8 rounded-full object-cover border border-white/10 group-hover:border-indigo-400/50 transition-colors" alt="" />
                <div className="text-left flex-1 min-w-0">
                  <div className="truncate font-semibold">{u.name}</div>
                </div>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-white/5">
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-400 bg-white/5 hover:bg-red-500/10 hover:text-red-400 border border-white/5 hover:border-red-500/20 rounded-xl transition-all">
            <LogOut className="w-4 h-4" /> <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
        
        {/* HEADER (Glass) */}
        <header className="bg-slate-900/50 backdrop-blur-md border-b border-white/5 px-8 py-5 flex justify-between items-center shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                My Wishlist
              </h1>
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>

            {/* BIRTHDAY BADGE */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-300 uppercase tracking-wide">
                {formatBirthday(activeUser.birthday)}
              </span>
            </div>
          </div>

          {/* CLICKABLE PROFILE AREA */}
          <button 
            onClick={openProfileModal}
            className="flex items-center gap-4 hover:bg-white/5 p-2 -mr-2 rounded-xl transition-colors group cursor-pointer"
          >
            <div className="hidden sm:block text-right">
              <p className="text-xs text-gray-400 group-hover:text-indigo-400 transition-colors">Signed in as</p>
              <p className="text-sm font-semibold text-gray-200">{displayName}</p>
            </div>
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px]">
                <img src={currentAvatar} className="w-full h-full rounded-full object-cover bg-slate-900" alt="Profile" />
                {/* Edit Icon Overlay */}
                <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-4 h-4 text-white" />
                </div>
            </div>
          </button>
        </header>

        {/* SCROLLABLE AREA */}
        <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            
            {/* SEARCH / FILTER */}
            <div className="mb-8 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search gifts..." 
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all backdrop-blur-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              
              {/* ADD BUTTON CARD */}
              <button 
                onClick={() => setIsModalOpen(true)}
                className="group h-full min-h-[320px] flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl hover:border-indigo-500 hover:bg-indigo-500/5 transition-all duration-300 text-gray-500 hover:text-indigo-400 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-14 h-14 rounded-full bg-slate-800 group-hover:bg-indigo-500 group-hover:text-white flex items-center justify-center mb-4 transition-all shadow-lg group-hover:scale-110 z-10">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="font-semibold z-10">Add new gift</span>
                <span className="text-xs mt-2 opacity-60 z-10">Start a new wishlist item</span>
              </button>

              {/* GIFT CARDS */}
              {userGifts.map(gift => {
                const isReserved = gift.reserved_by !== null;
                const isReservedByMe = gift.reserved_by === session.user.id;
                
                return (
                  <div key={gift.id} className="group relative bg-slate-900/40 border border-white/5 hover:border-white/10 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-indigo-900/20 transition-all duration-300 flex flex-col">
                    
                    {/* IMAGE SECTION */}
                    <div className="aspect-[4/3] w-full bg-slate-800/50 relative overflow-hidden">
                      {gift.image_url ? (
                        <img src={gift.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={gift.name} />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-600">
                          <Gift className="w-10 h-10 mb-2 opacity-50" />
                          <span className="text-xs font-medium uppercase tracking-wider opacity-60">No Image</span>
                        </div>
                      )}
                      
                      {/* Price Badge (Glass) */}
                      <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-white border border-white/10 shadow-lg">
                        {gift.price === 'Any' ? 'Any Price' : `$${gift.price}`}
                      </div>

                      {/* Reserved Overlay */}
                      {isReserved && !isMyList && (
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-center z-20">
                          <div className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-3 shadow-xl shadow-indigo-600/30">
                            Reserved
                          </div>
                          <p className="text-gray-300 font-medium text-sm">
                            {isReservedByMe ? "You've reserved this" : "Someone else grabbed it"}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* CONTENT SECTION */}
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="font-bold text-lg text-white leading-tight mb-2">{gift.name}</h3>
                      <p className="text-sm text-gray-400 line-clamp-2 mb-4 flex-1 leading-relaxed">{gift.description}</p>
                      
                      <div className="mt-auto pt-4 border-t border-white/5">
                        {isMyList ? (
                          <button 
                            onClick={() => handleDeleteGift(gift.id)}
                            className="w-full py-2.5 text-xs font-semibold text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors flex items-center justify-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Gift
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleReserve(gift.id)}
                            disabled={isReserved}
                            className="w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40"
                          >
                            <Gift className="w-4 h-4" /> Reserve Gift
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* --- ADD GIFT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="font-bold text-lg text-white">Add new gift</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleAddGift} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Gift Name</label>
                  <input required type="text" placeholder="e.g. Mechanical Keyboard" className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none text-white placeholder-gray-600 transition-all" value={newGift.name} onChange={e => setNewGift({...newGift, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Price</label>
                    <input required type="text" placeholder="e.g. 150" className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none text-white placeholder-gray-600 transition-all" value={newGift.price} onChange={e => setNewGift({...newGift, price: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Image Link (Optional)</label>
                    <input type="url" placeholder="https://..." className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none text-white placeholder-gray-600 transition-all" value={newGift.image} onChange={e => setNewGift({...newGift, image: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Description</label>
                  <textarea rows="3" placeholder="Add details..." className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none resize-none text-white placeholder-gray-600 transition-all" value={newGift.description} onChange={e => setNewGift({...newGift, description: e.target.value})} />
                </div>
                <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.01]">Add to wishlist</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT PROFILE MODAL --- */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="font-bold text-lg text-white">Edit Profile</h3>
              <button onClick={() => setIsProfileModalOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleProfileSave} className="space-y-5">
                
                {/* Avatar Upload */}
                <div className="flex flex-col items-center gap-3">
                   <div className="relative group cursor-pointer" onClick={triggerFileUpload}>
                      <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px]">
                         <img 
                           src={editAvatarUrl || `https://ui-avatars.com/api/?name=${editName}&background=6366f1&color=fff`} 
                           className="w-full h-full rounded-full object-cover bg-slate-900" 
                           alt="Preview" 
                         />
                      </div>
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <Upload className="w-6 h-6 text-white" />
                      </div>
                   </div>
                   <input 
                     type="file" 
                     ref={fileInputRef} 
                     className="hidden" 
                     accept="image/*" 
                     onChange={handleFileChange} 
                   />
                   <p className="text-xs text-gray-500">Click to upload image</p>
                </div>
                
                {/* Name Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Display Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none text-white placeholder-gray-600 transition-all" 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)} 
                  />
                </div>
                
                {/* Birthday Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Birthday</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none text-white placeholder-gray-600 transition-all [color-scheme:dark]" 
                    value={editBirthday} 
                    onChange={e => setEditBirthday(e.target.value)} 
                  />
                </div>
                
                <button type="submit" className="w-full bg-white text-slate-900 hover:bg-gray-200 font-bold py-3 rounded-xl transition-all">Save Changes</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className="bg-slate-900 border border-white/10 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 pointer-events-auto backdrop-blur-xl">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            <span className="text-sm font-medium">{n.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}