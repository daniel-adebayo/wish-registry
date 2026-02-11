import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Gift, Plus, Calendar, LogOut, Trash2, Sparkles, Search, X, Camera, Upload, DollarSign, Image, Users, CheckCircle2, Menu, Edit2 } from 'lucide-react';

export default function Dashboard({ session, onLogout }) {
  // --- STATE ---
  const [activeListId, setActiveListId] = useState(session?.user?.id || '');
  const [searchQuery, setSearchQuery] = useState(''); // Gift Search
  const [notifications, setNotifications] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [uploading, setUploading] = useState(false); // Loading state for uploads
  
  // --- NEW: Circle/Follow State ---
  const [myCircle, setMyCircle] = useState([]); // Stores followed users
  const [searchFriendQuery, setSearchFriendQuery] = useState('');
  const [friendSearchResults, setFriendSearchResults] = useState([]);

  // --- NEW: Group State ---
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [generatedGroupCode, setGeneratedGroupCode] = useState(null); // Stores the generated code for UI display
  const [editGroupCode, setEditGroupCode] = useState('');

  // --- NEW: Mobile & Edit State ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar toggle
  const [editingGiftId, setEditingGiftId] = useState(null); // If null = Add Mode, if ID = Edit Mode

  // User Data State
  const [birthday, setBirthday] = useState(session?.user?.user_metadata?.birthday || '');
  const [avatarUrl, setAvatarUrl] = useState(session?.user?.user_metadata?.avatar_url || '');
  const [displayName, setDisplayName] = useState(session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'User');
  
  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // Edit Form State
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editName, setEditName] = useState('');
  const [editBirthday, setEditBirthday] = useState('');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null); // Holds the profile file object

  // Add/Edit Gift State
  const [newGift, setNewGift] = useState({ name: '', price: '', currency: 'NGN', description: '', image: '' });
  const [selectedGiftFile, setSelectedGiftFile] = useState(null); // Holds the gift file object
  const fileInputRef = useRef(null);
  const giftFileInputRef = useRef(null); // Separate ref for gift input

  // --- EFFECTS ---
  const hasFetchedData = useRef(false);

  useEffect(() => {
    if (hasFetchedData.current) return;
    if (session?.user?.id) {
      fetchGifts();
      fetchMyCircle();
      hasFetchedData.current = true;
    }
  }, [session]);

  // --- FETCH GIFTS ---
  async function fetchGifts() {
    try {
      const { data, error } = await supabase.from('gifts').select('*');
      if (error) throw error;
      setGifts(data || []);
    } catch (error) {
      console.error("Error fetching gifts:", error.message);
      setGifts([]);
    }
  }

  // --- FETCH MY CIRCLE ---
  const fetchMyCircle = async () => {
    const { data: followsData, error: followsError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', session.user.id);

    if (followsError) {
      console.error("Error fetching follows IDs:", followsError);
      return;
    }

    if (!followsData || followsData.length === 0) {
      setMyCircle([]);
      return;
    }

    const ids = followsData.map(item => item.following_id);
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', ids);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
    } else {
      const circle = profilesData.map(p => ({
        id: p.id,
        name: p.full_name || p.username || 'Unknown',
        avatar: p.avatar_url,
        birthday: p.birthday,
        isMe: false
      }));
      setMyCircle(circle);
    }
  };

  // --- SEARCH FRIEND ---
  const handleSearchFriend = async (e) => {
    const term = e.target.value;
    setSearchFriendQuery(term);

    if (term.length > 1) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .or(`full_name.ilike.%${term}%,username.ilike.%${term}%`)
        .limit(5);

      if (!error) setFriendSearchResults(data || []);
    } else {
      setFriendSearchResults([]);
    }
  };

  // --- FOLLOW (MUTUAL) ---
  const handleFollow = async (targetId) => {
    if (targetId === session.user.id) {
      alert("You cannot follow yourself.");
      return;
    }

    // 1. I follow them
    const { error: error1 } = await supabase
      .from('follows')
      .insert([{ follower_id: session.user.id, following_id: targetId }]);

    // 2. They follow me (Mutual)
    const { error: error2 } = await supabase
      .from('follows')
      .insert([{ follower_id: targetId, following_id: session.user.id }]);

    if ((error1 && error1.code !== '23505') || (error2 && error2.code !== '23505')) {
      alert("Could not follow.");
    } else {
      setSearchFriendQuery(''); 
      setFriendSearchResults([]);
      await fetchMyCircle(); 
      addNotification("Added to circle!");
    }
  };

  // --- GROUP FUNCTIONS ---
  
  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const copyGroupCode = () => {
    if (generatedGroupCode) {
      navigator.clipboard.writeText(generatedGroupCode);
      addNotification("Code copied to clipboard!");
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    const code = generateCode();
    
    const { error } = await supabase.from('groups').insert([
      { name: groupName, code: code, creator_id: session.user.id }
    ]);

    if (error) {
      alert("Error creating group");
      console.error(error);
    } else {
      setGeneratedGroupCode(code);
      setGroupName('');
      addNotification("Group created successfully!");
    }
  };

  const handleJoinGroupLogic = async (code) => {
    if (!code) return;

    // 1. Find Group
    const { data: group, error: findError } = await supabase
      .from('groups')
      .select('id')
      .eq('code', code.trim().toUpperCase())
      .single();

    if (findError || !group) {
      alert("Invalid Group Code");
      return false;
    }

    // 2. Add to Group Members
    await supabase.from('group_members').insert([
      { group_id: group.id, user_id: session.user.id }
    ]).ignoreDuplicates(); // Ignore if already member

    // 3. Fetch other members
    const { data: members } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', group.id)
      .neq('user_id', session.user.id);

    if (members && members.length > 0) {
      // 4. Create Mutual Follows
      const followPromises = members.map(member => {
        return Promise.all([
          supabase.from('follows').insert([{ follower_id: session.user.id, following_id: member.user_id }]),
          supabase.from('follows').insert([{ follower_id: member.user_id, following_id: session.user.id }])
        ]);
      });
      await Promise.all(followPromises);
    }
    
    return true;
  };

  // --- IMAGE UPLOAD ---
  const uploadImage = async (file) => {
    if (!file) return null;
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      let { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Image upload failed.');
      return null;
    }
  };

  // --- PROFILE HANDLERS ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedAvatarFile(file);
      setEditAvatarUrl(URL.createObjectURL(file));
    }
  };

  const openProfileModal = async () => {
    setEditAvatarUrl(avatarUrl);
    setEditName(displayName);
    setEditBirthday(birthday);
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('group_code')
      .eq('id', session.user.id)
      .single();
    
    setEditGroupCode(profile?.group_code || '');
    setIsProfileModalOpen(true);
    setIsSidebarOpen(false); // Close sidebar on mobile when opening modal
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setUploading(true);

    let finalAvatarUrl = avatarUrl; 

    if (selectedAvatarFile) {
      const url = await uploadImage(selectedAvatarFile);
      if (url) finalAvatarUrl = url;
      else { setUploading(false); return; }
    }
    
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: editName, avatar_url: finalAvatarUrl, birthday: editBirthday }
    });

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: session.user.id,
        full_name: editName,
        avatar_url: finalAvatarUrl,
        birthday: editBirthday,
        group_code: editGroupCode,
        updated_at: new Date()
      });
    
    if (authError || profileError) {
      alert("Could not save profile changes.");
    } else {
      setDisplayName(editName);
      setAvatarUrl(finalAvatarUrl);
      setBirthday(editBirthday);
      
      if (editGroupCode) {
        await handleJoinGroupLogic(editGroupCode);
        await fetchMyCircle(); 
      }
      
      setIsProfileModalOpen(false);
      setSelectedAvatarFile(null); 
      addNotification("Profile updated successfully!");
    }
    setUploading(false);
  };

  // --- GIFT HANDLERS ---
  
  // Open Modal for Adding
  const openAddModal = () => {
    setEditingGiftId(null);
    setNewGift({ name: '', price: '', currency: 'NGN', description: '', image: '' });
    setSelectedGiftFile(null);
    setIsModalOpen(true);
  };

  // Open Modal for Editing
  const openEditModal = (gift) => {
    setEditingGiftId(gift.id);
    setNewGift({
      name: gift.name,
      price: gift.price, // Note: price includes symbol currently, usually better to store raw, but editing existing data
      currency: gift.currency || 'NGN', // Fallback if old data
      description: gift.description,
      image: gift.image_url || ''
    });
    setSelectedGiftFile(null);
    setIsModalOpen(true);
  };

  // Combined Handle Submit (Add or Update)
  const handleGiftSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    
    let finalImageUrl = newGift.image; 

    // Handle Image Upload if new file selected
    if (selectedGiftFile) {
      const url = await uploadImage(selectedGiftFile);
      if (url) finalImageUrl = url;
    }

    const selectedCurrencyObj = currencies.find(c => c.code === newGift.currency);
    const symbol = selectedCurrencyObj ? selectedCurrencyObj.symbol : '$';
    const finalPrice = `${symbol}${newGift.price}`;

    if (editingGiftId) {
      // --- UPDATE MODE ---
      const { error } = await supabase.from('gifts').update({
        name: newGift.name, 
        price: finalPrice,
        currency: newGift.currency, 
        description: newGift.description,
        image_url: finalImageUrl
      }).eq('id', editingGiftId);
      
      if (error) {
        alert("Error updating gift");
        console.error(error);
      } else { 
        setIsModalOpen(false); 
        setNewGift({ name: '', price: '', currency: 'USD', description: '', image: '' });
        setSelectedGiftFile(null); 
        fetchGifts(); 
        addNotification("Gift updated!"); 
      }
    } else {
      // --- INSERT MODE ---
      const { error } = await supabase.from('gifts').insert([
        { 
          name: newGift.name, 
          price: finalPrice,
          currency: newGift.currency, 
          description: newGift.description,
          image_url: finalImageUrl, 
          owner_id: session.user.id, 
          reserved_by: null 
        }
      ]);
      
      if (error) {
        alert("Error adding gift");
        console.error(error);
      } else { 
        setIsModalOpen(false); 
        setNewGift({ name: '', price: '', currency: 'USD', description: '', image: '' });
        setSelectedGiftFile(null); 
        fetchGifts(); 
        addNotification("New gift added!"); 
      }
    }
    setUploading(false);
  };

  const handleGiftFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedGiftFile(file);
      setNewGift(g => ({...g, image: file.name})); 
    }
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

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error(error);
    window.location.href = '/';
  };

  // Helpers
  const formatBirthday = (dateStr) => {
    if (!dateStr) return 'No Date Set';
    const date = new Date(dateStr);
    return isNaN(date) ? dateStr : date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  const currencies = [
    { code: 'NGN', symbol: '₦' }, { code: 'EUR', symbol: '€' }, { code: 'GBP', symbol: '£' },
    { code: 'JPY', symbol: '¥' }, { code: 'USD', symbol: '$' }, { code: 'CAD', symbol: 'C$' },
    { code: 'AUD', symbol: 'A$' }, { code: 'INR', symbol: '₹' }
  ];

  const formatNumber = (val) => {
    const clean = val.replace(/[^0-9]/g, '');
    return clean ? Number(clean).toLocaleString() : '';
  };

  const handlePriceChange = (e) => {
    setNewGift({...newGift, price: formatNumber(e.target.value)});
  };

  if (!session || !session.user) return <div className="p-10 text-center text-white">Loading...</div>;

  const user = session.user;
  const currentAvatar = avatarUrl || `https://ui-avatars.com/api/?name=${displayName}&background=6366f1&color=fff`;

  const allUsers = [
    { id: user.id, name: displayName, avatar: currentAvatar, isMe: true, birthday: birthday },
    ...myCircle
  ];

  const isMyList = activeListId === user.id; 
  const activeUser = { name: displayName, avatar: currentAvatar, birthday: birthday }; 

  const userGifts = gifts.filter(gift => {
    const isOwner = gift.owner_id === activeListId;
    if (!searchQuery) return isOwner;
    const term = searchQuery.toLowerCase();
    const matchesSearch = gift.name.toLowerCase().includes(term) || gift.description.toLowerCase().includes(term);
    return isOwner && matchesSearch;
  });

  return (
    <div className="flex h-screen bg-[#0f172a] text-white font-sans selection:bg-indigo-500 selection:text-white overflow-hidden relative">
      {/* Backgrounds */}
      <div className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundSize: '40px 40px',
          backgroundImage: 'linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)'
        }}
      ></div>
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* --- SIDEBAR (Mobile Responsive) --- */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-72 bg-slate-900/40 backdrop-blur-xl border-r border-white/5 flex flex-col 
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:relative
      `}>
        <div className="p-6 flex items-center justify-between md:justify-start gap-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <img src="/images/my-logo.png" alt="Logo" className="w-8 h-8 object-contain" />
            <span className="font-bold tracking-tight text-lg">Wish Registry</span>
          </div>
          {/* Close button for mobile */}
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 flex flex-col">
          <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Your Circle</p>
          
          {/* List Users */}
          <nav className="space-y-1">
            {allUsers.map(u => (
              <button
                key={u.id}
                onClick={() => { setActiveListId(u.id); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                  activeListId === u.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=6366f1&color=fff`} className="w-8 h-8 rounded-full object-cover border border-white/10 group-hover:border-indigo-400/50 transition-colors" alt="" />
                <div className="text-left flex-1 min-w-0">
                  <div className="truncate font-semibold">{u.name}</div>
                </div>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-white/5">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-400 bg-white/5 hover:bg-red-500/10 hover:text-red-400 border border-white/5 hover:border-red-500/20 rounded-xl transition-all">
            <LogOut className="w-4 h-4" /> <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
        
        {/* HEADER */}
        <header className="bg-slate-900/50 backdrop-blur-md border-b border-white/5 px-4 md:px-8 py-3 md:py-5 flex justify-between items-center shrink-0 gap-2 md:gap-4">
          
          {/* Left Section: Hamburger + Title */}
          <div className="flex items-center gap-3 flex-1">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-400 hover:text-white p-1">
              <Menu className="w-6 h-6" />
            </button>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-2xl font-bold tracking-tight text-white truncate">
                  {isMyList ? "My Wishlist" : `${activeUser.name}'s Wishlist`}
                </h1>
                <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-indigo-400" />
              </div>
              <div className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-white/5 border border-white/10 rounded-full sm:flex">
                <Calendar className="w-3 h-3 md:w-4 md:h-4 text-gray-400" />
                <span className="text-[10px] md:text-xs font-medium text-gray-300 uppercase tracking-wide">
                  {formatBirthday(activeUser.birthday)}
                </span>
              </div>
            </div>
          </div>

          {/* Right Section: Actions + Profile */}
          <div className="flex items-center gap-2 md:gap-4">
            
            {/* MOBILE ACTIONS: Only visible on mobile, placed under header in a real app usually, but here side-by-side if space permits or stacked */}
            
            {/* FIND FRIEND SEARCH (Moved to Navbar) */}
            <div className="relative hidden md:block group">
              <input 
                type="text" 
                placeholder="Find friend..." 
                className="w-40 bg-slate-950/50 border border-white/10 rounded-full py-1.5 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:w-60 transition-all duration-300"
                value={searchFriendQuery}
                onChange={handleSearchFriend}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              {friendSearchResults.length > 0 && (
                <div className="absolute top-full right-0 mt-2 w-60 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-20 max-h-40 overflow-y-auto">
                  {friendSearchResults.map(friend => (
                    <button 
                      key={friend.id}
                      onClick={() => handleFollow(friend.id)}
                      className="w-full text-left px-3 py-2 text-xs text-white hover:bg-indigo-600 transition-colors flex items-center gap-2"
                    >
                      <img src={friend.avatar_url || `https://ui-avatars.com/api/?name=${friend.full_name}&background=6366f1&color=fff`} className="w-5 h-5 rounded-full" alt="" />
                      <div className="flex flex-col">
                        <span className="font-semibold">{friend.full_name}</span>
                        <span className="text-[10px] text-gray-400">@{friend.username}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* CREATE GROUP BUTTON (Moved to Navbar) */}
            <button 
              onClick={() => setIsGroupModalOpen(true)}
              className="hidden md:flex items-center justify-center gap-2 px-3 py-1.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-full hover:bg-indigo-600 hover:text-white transition-all text-xs font-semibold"
            >
              <Users className="w-3.5 h-3.5" /> Create Group
            </button>

            {/* PROFILE BUTTON */}
            <button 
              onClick={openProfileModal}
              className="flex items-center gap-2 md:gap-4 hover:bg-white/5 p-1 md:p-2 rounded-xl transition-colors group cursor-pointer"
            >
              <div className="hidden sm:block text-right">
                <p className="text-[10px] text-gray-400 group-hover:text-indigo-400 transition-colors leading-tight">Signed in as</p>
                <p className="text-xs md:text-sm font-semibold text-gray-200 truncate max-w-[100px]">{displayName}</p>
              </div>
              <div className="relative w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px]">
                  <img src={currentAvatar} className="w-full h-full rounded-full object-cover bg-slate-900" alt="Profile" />
                  <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-3 h-3 md:w-4 md:h-4 text-white" />
                  </div>
              </div>
            </button>
          </div>
        </header>

        {/* MOBILE QUICK ACTIONS BAR (Visible only on small screens) */}
        <div className="flex md:hidden px-4 py-2 gap-2 overflow-x-auto border-b border-white/5 bg-slate-900/30">
             <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="Find friend..." 
                className="w-full bg-slate-950/50 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
                value={searchFriendQuery}
                onChange={handleSearchFriend}
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              {friendSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-20 max-h-40 overflow-y-auto">
                  {friendSearchResults.map(friend => (
                    <button 
                      key={friend.id}
                      onClick={() => handleFollow(friend.id)}
                      className="w-full text-left px-3 py-2 text-xs text-white hover:bg-indigo-600 transition-colors flex items-center gap-2"
                    >
                      <img src={friend.avatar_url || `https://ui-avatars.com/api/?name=${friend.full_name}&background=6366f1&color=fff`} className="w-5 h-5 rounded-full" alt="" />
                      <div className="flex flex-col">
                        <span className="font-semibold">{friend.full_name}</span>
                        <span className="text-[10px] text-gray-400">@{friend.username}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button 
              onClick={() => setIsGroupModalOpen(true)}
              className="flex-shrink-0 flex items-center justify-center gap-2 px-3 py-1.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-600 hover:text-white transition-all text-xs font-semibold"
            >
              <Users className="w-3.5 h-3.5" /> Group
            </button>
        </div>

        {/* SCROLLABLE AREA */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 md:mb-8 relative">
              <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search gifts..." 
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 md:py-3 pl-10 md:pl-12 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all backdrop-blur-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
              {/* ADD/EDIT BUTTON CARD */}
              {isMyList && (
                <button 
                  onClick={openAddModal}
                  className="group h-full min-h-[280px] md:min-h-[320px] flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl hover:border-indigo-500 hover:bg-indigo-500/5 transition-all duration-300 text-gray-500 hover:text-indigo-400 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-800 group-hover:bg-indigo-500 group-hover:text-white flex items-center justify-center mb-4 transition-all shadow-lg group-hover:scale-110 z-10">
                    <Plus className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <span className="font-semibold text-sm md:text-base z-10">Add new gift</span>
                  <span className="text-xs mt-2 opacity-60 z-10">Start a new wishlist item</span>
                </button>
              )}
              
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
                      
                      <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-white border border-white/10 shadow-lg">
                        {gift.price === 'Any' ? 'Any Price' : gift.price}
                      </div>
                      
                      {/* Mobile Edit Badge (Only visible on hover or always) - Optional, adding hover edit button */}
                      {isMyList && (
                        <button 
                          onClick={() => openEditModal(gift)}
                          className="absolute top-4 left-4 bg-white/10 backdrop-blur-md p-1.5 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isReserved && !isMyList && (
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-center z-20">
                          <div className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-3 shadow-xl shadow-indigo-600/30">Reserved</div>
                          <p className="text-gray-300 font-medium text-sm">{isReservedByMe ? "You've reserved this" : "Someone else grabbed it"}</p>
                        </div>
                      )}
                    </div>

                    {/* CONTENT SECTION */}
                    <div className="p-4 md:p-5 flex-1 flex flex-col">
                      <h3 className="font-bold text-base md:text-lg text-white leading-tight mb-2">{gift.name}</h3>
                      <p className="text-xs md:text-sm text-gray-400 line-clamp-2 mb-4 flex-1 leading-relaxed">{gift.description}</p>
                      
                      <div className="mt-auto pt-4 border-t border-white/5 flex gap-2">
                        {isMyList ? (
                          <>
                            <button 
                              onClick={() => openEditModal(gift)}
                              className="flex-1 py-2 text-xs font-semibold text-indigo-400 hover:text-white hover:bg-indigo-500/10 rounded-lg transition-colors flex items-center justify-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" /> Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteGift(gift.id)}
                              className="flex-1 py-2 text-xs font-semibold text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => handleReserve(gift.id)}
                            disabled={isReserved}
                            className="w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Gift className="w-4 h-4" /> {isReserved ? (isReservedByMe ? "Reserved by You" : "Reserved") : "Reserve Gift"}
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

      {/* ADD/EDIT GIFT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="font-bold text-lg text-white">{editingGiftId ? "Edit Gift" : "Add new gift"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleGiftSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Gift Name</label>
                  <input required type="text" placeholder="e.g. Mechanical Keyboard" className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none text-white placeholder-gray-600 transition-all" value={newGift.name} onChange={e => setNewGift({...newGift, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Currency</label>
                    <div className="relative">
                      <select value={newGift.currency} onChange={e => setNewGift({...newGift, currency: e.target.value})} className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none text-white transition-all appearance-none cursor-pointer">
                        {currencies.map(c => (<option key={c.code} value={c.code} className="bg-slate-900 text-gray-300">{c.code} ({c.symbol})</option>))}
                      </select>
                      <DollarSign className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Amount</label>
                    <input required type="text" placeholder="0" className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none text-white transition-all" value={newGift.price} onChange={handlePriceChange} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Image Link (Optional)</label>
                    <input type="url" placeholder="https://..." className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none text-white transition-all" value={newGift.image} onChange={e => { setNewGift({...newGift, image: e.target.value}); setSelectedGiftFile(null); }} />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-400 mb-1.5">Or Upload</label>
                     <input type="file" accept="image/*" ref={giftFileInputRef} className="hidden" onChange={handleGiftFileChange} />
                     <button type="button" onClick={() => giftFileInputRef.current.click()} className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-sm text-gray-300 hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                        <Upload className="w-4 h-4" /> {selectedGiftFile ? "File Selected" : "Upload Photo"}
                     </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Description</label>
                  <textarea rows="3" placeholder="Add details..." className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none resize-none text-white placeholder-gray-600 transition-all" value={newGift.description} onChange={e => setNewGift({...newGift, description: e.target.value})} />
                </div>
                <button type="submit" disabled={uploading} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.01] disabled:opacity-50">
                    {uploading ? "Saving..." : (editingGiftId ? "Update Gift" : "Add to wishlist")}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="font-bold text-lg text-white">
                {generatedGroupCode ? "Group Created!" : "Create New Group"}
              </h3>
              <button 
                onClick={() => {
                  setIsGroupModalOpen(false);
                  setGeneratedGroupCode(null);
                }} 
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6">
              {generatedGroupCode ? (
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">Share this Code</h4>
                    <p className="text-sm text-gray-400 mb-4">Give this code to your friends so they can join your group.</p>
                  </div>
                  <div className="w-full bg-slate-950 border-2 border-dashed border-indigo-500/30 rounded-xl p-6 cursor-pointer hover:bg-slate-900 transition-colors group" onClick={copyGroupCode}>
                    <span className="text-3xl font-mono font-bold text-indigo-400 tracking-widest">{generatedGroupCode}</span>
                    <p className="text-xs text-gray-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Click to copy</p>
                  </div>
                  <div className="flex w-full gap-3 pt-2">
                    <button onClick={copyGroupCode} className="flex-1 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-gray-200 transition-all">Copy Code</button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateGroup} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Group Name</label>
                    <input type="text" required placeholder="e.g. Family, Office" className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none text-white transition-all" value={groupName} onChange={e => setGroupName(e.target.value)} />
                  </div>
                  <p className="text-xs text-gray-500">A unique code will be generated automatically.</p>
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all">Create Group</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="font-bold text-lg text-white">Edit Profile</h3>
              <button onClick={() => setIsProfileModalOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleProfileSave} className="space-y-5">
                <div className="flex flex-col items-center gap-3">
                   <div className="relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
                      <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px]">
                         <img src={editAvatarUrl || `https://ui-avatars.com/api/?name=${editName}&background=6366f1&color=fff`} className="w-full h-full rounded-full object-cover bg-slate-900" alt="Preview" />
                      </div>
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <Upload className="w-6 h-6 text-white" />
                      </div>
                   </div>
                   <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                   <p className="text-xs text-gray-500">{selectedAvatarFile ? selectedAvatarFile.name : "Click to upload image"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Display Name</label>
                  <input type="text" required className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none text-white transition-all" value={editName} onChange={e => setEditName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Birthday</label>
                  <input type="date" className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none text-white transition-all [color-scheme:dark]" value={editBirthday} onChange={e => setEditBirthday(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Group Code (Optional)</label>
                  <input type="text" placeholder="Enter code to join group" className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none text-white transition-all" value={editGroupCode} onChange={e => setEditGroupCode(e.target.value)} />
                  <p className="text-[10px] text-gray-500 mt-1">Enter a code to join an existing group. You will automatically follow everyone in it.</p>
                </div>
                <button type="submit" disabled={uploading} className="w-full bg-white text-slate-900 hover:bg-gray-200 font-bold py-3 rounded-xl transition-all disabled:opacity-50">
                    {uploading ? "Saving..." : "Save Changes"}
                </button>
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