import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Gift, Plus, Calendar, LogOut, Trash2, Sparkles, Search, X, Camera, Upload, DollarSign, Image, ChevronDown, ChevronRight, Users, CheckCircle2, Menu, Edit2 } from 'lucide-react';

// --- THEME CONFIGURATION (CSS VARIABLES) ---
// Defined as a string to be injected directly into the component
const themeStyles = `
  :root {
    /* Colors */
    --bg-main: #0f172a;
    --bg-sidebar: rgba(15, 23, 42, 0.95);
    --bg-card: rgba(30, 41, 59, 0.4);
    --bg-hover: rgba(255, 255, 255, 0.05);
    --bg-input: rgba(2, 6, 23, 0.5);
    
    --text-primary: #f8fafc;
    --text-secondary: #cbd5f5
    --text-muted: #8b9bb3;
    
    --border-color: rgba(45, 212, 191, 0.1);
    --border-light: rgba(45, 212, 191, 0.02);
    --border-cool: rgba(68, 114, 196, 0.15);
    --border-primary: rgba(68, 114, 196, 0.5);
    
    --accent-primary: #4472C4;
    --accent-hover: #365ba3;
    --accent-glow: rgba(68, 114, 196, 0.5);
    
    --danger: #ef4444;           /* Red 500 */
    --success: #22c55e;          /* Green 500 */
  }
`;

export default function Dashboard({ session, onLogout }) {
  // --- STATE ---
  const [activeListId, setActiveListId] = useState(session?.user?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  // --- Circle/Follow State ---
  const [myCircle, setMyCircle] = useState([]); 
  const [searchFriendQuery, setSearchFriendQuery] = useState('');
  const [friendSearchResults, setFriendSearchResults] = useState([]);

  // --- Group State ---
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [generatedGroupCode, setGeneratedGroupCode] = useState(null); 
  const [editGroupCode, setEditGroupCode] = useState('');

  // --- Group & Circle UI State ---
  const [myGroups, setMyGroups] = useState([]);
  const [groupMembersMap, setGroupMembersMap] = useState({});
  const [expandedGroupIds, setExpandedGroupIds] = useState(new Set());
  
  // Accordion State
  const [isCircleOpen, setIsCircleOpen] = useState(true);
  const [isGroupsOpen, setIsGroupsOpen] = useState(true);

  // --- Mobile & Edit State ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [editingGiftId, setEditingGiftId] = useState(null); 

  // User Data State
  const [birthday, setBirthday] = useState(session?.user?.user_metadata?.birthday || '');
  const [avatarUrl, setAvatarUrl] = useState(session?.user?.user_metadata?.avatar_url || '');
  const [displayName, setDisplayName] = useState(session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'User');
  
  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false); // FIXED SYNTAX ERROR HERE
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // --- NEW: Gift Detail Modal State ---
  const [selectedGift, setSelectedGift] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Edit Form State
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editName, setEditName] = useState('');
  const [editBirthday, setEditBirthday] = useState('');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null); 

  // Add/Edit Gift State
  const [newGift, setNewGift] = useState({ name: '', price: '', currency: 'NGN', description: '', image: '' });
  const [selectedGiftFile, setSelectedGiftFile] = useState(null); 
  const fileInputRef = useRef(null);
  const giftFileInputRef = useRef(null); 

  // --- EFFECTS ---
  const hasFetchedData = useRef(false);

  useEffect(() => {
    if (hasFetchedData.current) return;
    if (session?.user?.id) {
      fetchGifts();
      fetchMyCircle();
      fetchGroupsData();
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

    // --- FETCH GROUPS & MEMBERS ---
  const fetchGroupsData = async () => {
    const { data: myMembership, error: groupError } = await supabase
      .from('group_members')
      .select('group_id, groups(name)')
      .eq('user_id', session.user.id);

    if (groupError) {
      console.error("Error fetching groups:", groupError);
      return;
    }

    if (!myMembership || myMembership.length === 0) {
      setMyGroups([]);
      setGroupMembersMap({});
      return;
    }

    const groupsList = myMembership.map(item => ({
      id: item.group_id,
      name: item.groups?.name || 'Unknown Group'
    }));
    setMyGroups(groupsList);

    const groupIds = groupsList.map(g => g.id);
    
    const { data: allMembersData, error: membersError } = await supabase
      .from('group_members')
      .select('group_id, user_id, profiles(full_name, avatar_url, username, birthday)')
      .in('group_id', groupIds);

    if (membersError) {
      console.error("Error fetching group members:", membersError);
      return;
    }

    const map = {};
    allMembersData.forEach(item => {
      if (!map[item.group_id]) map[item.group_id] = [];
      if (item.profiles && item.user_id !== session.user.id) {
        map[item.group_id].push({
          id: item.user_id,
          name: item.profiles.full_name || item.profiles.username || 'Unknown',
          avatar: item.profiles.avatar_url,
          birthday: item.profiles.birthday,
          isMe: false
        });
      }
    });

    setGroupMembersMap(map);
  };

  // --- SEARCH FRIEND ---
const handleSearchFriend = async (e) => {
  const term = e.target.value;
  setSearchFriendQuery(term);

  // 1. If the term is empty or just one letter, clear immediately and STOP.
  if (term.length <= 1) {
    setFriendSearchResults([]);
    return;
  }

  // 2. Perform the search
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url')
    .or(`full_name.ilike.%${term}%,username.ilike.%${term}%`)
    .limit(5);

  if (!error) {
    // 3. THE MAGIC FIX: Only update the results if the search box 
    // STILL matches the term we just searched for.
    // If the user has cleared the box while we were waiting, this will be false.
    setSearchFriendQuery(currentQuery => {
      if (currentQuery === term) {
        setFriendSearchResults(data || []);
      }
      return currentQuery;
    });
  }
};
  // --- FOLLOW (MUTUAL) ---
  const handleFollow = async (targetId) => {
    if (targetId === session.user.id) {
      alert("You cannot follow yourself.");
      return;
    }

    const { error: error1 } = await supabase
      .from('follows')
      .insert([{ follower_id: session.user.id, following_id: targetId }]);

    const { error: error2 } = await supabase
      .from('follows')
      .insert([{ follower_id: targetId, following_id: session.user.id }]);

    if (error1 || error2) {
      const err = error1 || error2;

      if (err.code === '23505') {
        // Ignore duplicate error
      } 
      else if (err.code === '23503') {
         alert("This user profile does not exist.");
         return;
      } 
      else {
        console.error("Follow Error:", err);
        alert("Could not follow.");
        return;
      }
    }

    setSearchFriendQuery(''); 
    setFriendSearchResults([]);
    await fetchMyCircle(); 
    addNotification("Added to circle!");
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
    
    const { data: groupData, error: createError } = await supabase
      .from('groups')
      .insert([
        { name: groupName, code: code, creator_id: session.user.id }
      ])
      .select();

    if (createError) {
      alert("Error creating group");
      console.error(createError);
      return;
    }

    if (groupData && groupData[0]) {
      const newGroupId = groupData[0].id;
      
      await supabase.from('group_members').insert([
        { group_id: newGroupId, user_id: session.user.id }
      ]);
    }

    setGeneratedGroupCode(code);
    setGroupName('');
    addNotification("Group created successfully!");
    await fetchGroupsData();
  };

   const handleJoinGroupLogic = async (code) => {
    if (!code) return;

    const { data: group, error: findError } = await supabase
      .from('groups')
      .select('id')
      .eq('code', code.trim().toUpperCase())
      .single();

    if (findError || !group) {
      alert("Invalid Group Code");
      return false;
    }

    const { error: joinError } = await supabase
      .from('group_members')
      .insert([{ 
        group_id: group.id, 
        user_id: session.user.id 
      }]);

    if (joinError) {
      if (joinError.code === '23505') {
        return true;
      }
      console.error("Join Error:", joinError);
      alert("Could not join group.");
      return false;
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
    setIsSidebarOpen(false); 
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

    if (authError) {
      alert(`Auth Error: ${authError.message}`);
      setUploading(false);
      return;
    }

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
    
    if (profileError) {
      console.error("Profile DB Error:", profileError); 
      alert(`Profile Save Error: ${profileError.message}`); 
      setUploading(false);
      return;
    } else {
      setDisplayName(editName);
      setAvatarUrl(finalAvatarUrl);
      setBirthday(editBirthday);
      
      if (editGroupCode) {
        await handleJoinGroupLogic(editGroupCode);
        await fetchGroupsData(); 
      }
      
      setIsProfileModalOpen(false);
      setSelectedAvatarFile(null); 
      addNotification("Profile updated successfully!");
    }
    setUploading(false);
  };

  // --- GIFT HANDLERS ---
  const openAddModal = () => {
    setEditingGiftId(null);
    setNewGift({ name: '', price: '', currency: 'NGN', description: '', image: '' });
    setSelectedGiftFile(null);
    setIsModalOpen(true);
  };

  // --- NEW: Open Detail Modal ---
  const handleGiftClick = (gift) => {
    setSelectedGift(gift);
    setIsDetailModalOpen(true);
  };

    const openEditModal = (gift) => {
    setEditingGiftId(gift.id);
    setNewGift({
      name: gift.name,
      price: gift.price ? String(gift.price).replace(/[^0-9]/g, '') : '', 
      currency: gift.currency || 'NGN', 
      description: gift.description,
      image: gift.image_url || ''
    });
    setSelectedGiftFile(null);
    setIsModalOpen(true);
  };

  const handleGiftSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    
    let finalImageUrl = newGift.image; 

    if (selectedGiftFile) {
      const url = await uploadImage(selectedGiftFile);
      if (url) finalImageUrl = url;
    }

    const rawPrice = newGift.price.replace(/[^0-9]/g, '');

    if (editingGiftId) {
      const { error } = await supabase.from('gifts').update({
        name: newGift.name, 
        price: rawPrice, 
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
      const { error } = await supabase.from('gifts').insert([
        { 
          name: newGift.name, 
          price: rawPrice, 
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
      setNewGift(g => ({...g, image: ''})); 
    }
  };

  const handleReserve = async (giftId) => {
    const currentGift = gifts.find(g => g.id === giftId);
    if (!currentGift) return;

    const isReservedByMe = currentGift.reserved_by === session.user.id;
    const newValue = isReservedByMe ? null : session.user.id;

    const { error } = await supabase
      .from('gifts')
      .update({ reserved_by: newValue })
      .eq('id', giftId);

    if (error) {
      console.error("RESERVATION ERROR:", error);
      alert(`Error reserving gift: ${error.message}`);
      return;
    }

    await fetchGifts();

    if (isReservedByMe) {
      addNotification("Cancelled reservation");
    } else {
      addNotification("Gift reserved successfully!");
    }
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

   const toggleGroup = (id) => {
    const newSet = new Set(expandedGroupIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedGroupIds(newSet);
  };

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

  if (!session || !session.user) return <div className="p-10 text-center text-[var(--text-primary)]">Loading...</div>;

  const user = session.user;
  const currentAvatar = avatarUrl || `https://ui-avatars.com/api/?name=${displayName}&background=6366f1&color=fff`;

  const allGroupMembers = Object.values(groupMembersMap).flat();

  const allUsers = [
    { id: user.id, name: displayName, avatar: currentAvatar, isMe: true, birthday: birthday },
    ...myCircle,
    ...allGroupMembers
  ];

  const activeUser = allUsers.find(u => u.id === activeListId) || { name: 'Unknown', avatar: '', birthday: ''}; 
  const isMyList = activeUser.id === session.user.id;

  const userGifts = gifts.filter(gift => {
    const isOwner = gift.owner_id === activeListId;
    if (!searchQuery) return isOwner;
    const term = searchQuery.toLowerCase();
    const matchesSearch = gift.name.toLowerCase().includes(term) || gift.description.toLowerCase().includes(term);
    return isOwner && matchesSearch;
  });

  return (
    <>
      {/* FIXED CSS INJECTION: Placed at top of return to prevent flicker */}
      <style>{themeStyles}</style>
      
      <div className="flex h-screen bg-[var(--bg-main)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent-primary)] selection:text-white overflow-hidden relative">
        {/* Backgrounds using variables */}
        <div className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundSize: '40px 40px',
            backgroundImage: 'linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
            maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)'
          }}
        ></div>
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[var(--accent-primary)]/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

        {/* MOBILE OVERLAY */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        {/* --- SIDEBAR --- */}
        <aside className={`
          fixed inset-y-0 left-0 z-[200] w-72 bg-[var(--bg-sidebar)] backdrop-blur-xl border-r border-[var(--border-light)] flex flex-col 
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:relative
        `}>
          {/* Header */}
          <div className="p-6 flex items-center justify-between md:justify-start gap-3 border-b border-[var(--border-light)]">
            <div className="flex items-center gap-3">
              <img src="/images/my-logo.png" alt="Logo" className="w-8 h-8 object-contain" />
              <span className="font-bold tracking-tight text-lg">Wish Registry</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-2">
            
            {/* --- SECTION 1: MY CIRCLE --- */}
            <div className="flex flex-col">
              <button 
                onClick={() => setIsCircleOpen(!isCircleOpen)}
                className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider hover:text-[var(--text-primary)] transition-colors"
              >
                <span>My Circle ({myCircle.length})</span>
                {isCircleOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              
              {isCircleOpen && (
                <nav className="space-y-1 mt-1">
                  {/* ME */}
                  <button
                    onClick={() => { setActiveListId(user.id); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200 group ${
                      activeListId === user.id 
                      ? 'bg-[var(--accent-primary)] text-[var(--text-primary)]' 
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px]">
                      <img src={currentAvatar} className="w-full h-full rounded-full object-cover bg-[var(--bg-main)]" alt="" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="truncate font-semibold">{displayName} (You)</div>
                    </div>
                  </button>

                  {/* FOLLOWED USERS */}
                  {myCircle.map(u => (
                    <button
                      key={`circle-${u.id}`}
                      onClick={() => { setActiveListId(u.id); setIsSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200 group ${
                        activeListId === u.id 
                        ? 'bg-[var(--accent-primary)] text-[var(--text-primary)]' 
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=6366f1&color=fff`} className="w-8 h-8 rounded-full object-cover border border-[var(--border-light)] group-hover:border-[var(--accent-primary)]/50 transition-colors" alt="" />
                      <div className="text-left flex-1 min-w-0">
                        <div className="truncate font-semibold">{u.name}</div>
                      </div>
                    </button>
                  ))}
                  
                  {myCircle.length === 0 && (
                      <p className="px-4 py-2 text-xs text-[var(--text-muted)] italic">Search for friends to add them here.</p>
                  )}
                </nav>
              )}
            </div>

            {/* --- SECTION 2: MY GROUPS --- */}
            <div className="flex flex-col mt-2">
              <button 
                onClick={() => setIsGroupsOpen(!isGroupsOpen)}
                className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider hover:text-[var(--text-primary)] transition-colors"
              >
                <span>My Groups ({myGroups.length})</span>
                {isGroupsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {isGroupsOpen && (
                <div className="space-y-1 mt-1">
                  {myGroups.map(group => {
                    const isExpanded = expandedGroupIds.has(group.id);
                    const members = groupMembersMap[group.id] || [];

                    return (
                      <div key={group.id} className="overflow-hidden rounded-xl border border-[var(--border-light)] bg-[var(--bg-hover)]">
                        <button 
                          onClick={() => toggleGroup(group.id)}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--bg-hover)] transition-colors"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="p-1.5 bg-[var(--accent-primary)]/20 rounded-lg text-[var(--accent-primary)]">
                              <Users className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-sm font-semibold text-[var(--text-secondary)] truncate">{group.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[var(--text-muted)]">
                            <span className="text-[10px] bg-[var(--bg-hover)] px-1.5 py-0.5 rounded">{members.length}</span>
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-[var(--border-light)] bg-[var(--bg-main)]/30">
                            {members.length > 0 ? members.map(member => (
                              <button
                                key={`group-${group.id}-${member.id}`}
                                onClick={() => { setActiveListId(member.id); setIsSidebarOpen(false); }}
                                className={`w-full flex items-center gap-3 px-3 py-2 pl-9 text-sm font-medium transition-all duration-200 group ${
                                  activeListId === member.id 
                                  ? 'bg-[var(--border-cool)]/20 text-[var(--accent-primary)]' 
                                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                                }`}
                              >
                                <img src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}&background=6366f1&color=fff`} className="w-6 h-6 rounded-full object-cover" alt="" />
                                <span className="truncate">{member.name}</span>
                              </button>
                            )) : (
                              <p className="px-9 py-2 text-xs text-[var(--text-muted)] italic">No other members yet.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {myGroups.length === 0 && (
                      <p className="px-4 py-2 text-xs text-[var(--text-muted)] italic">Join a group to see members here.</p>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Footer Logout */}
          <div className="p-4 border-t border-[var(--border-light)]">
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-hover)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] border border-[var(--border-light)] hover:border-[var(--danger)]/20 rounded-xl transition-all">
              <LogOut className="w-4 h-4" /> <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* --- MAIN CONTENT --- */}
        <main className="relative flex-1 flex flex-col h-full">
          
        {/* HEADER */}
        <header className="relative z-[100] bg-[var(--bg-sidebar)]/50 backdrop-blur-md border-b border-[var(--border-light)] px-4 md:px-8 py-3 md:py-3 flex justify-between items-center shrink-0 gap-2 md:gap-4">
          
          <div className="flex items-center justify-between flex-1 gap-2 md:gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1">
                <Menu className="w-6 h-6" />
              </button>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-lg md:text-2xl font-bold tracking-tight text-[var(--text-primary)] truncate">
                    {isMyList ? "My Wishlist" : (activeUser.name.length > 15 ? `${activeUser.name.split(' ')[0]}'s Wishlist` : `${activeUser.name}'s Wishlist`)}
                  </h1>
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-[var(--accent-primary)] flex-shrink-0" />
                </div>
                <div className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-[var(--border-cool)] border border-[var(--accent-primary)] rounded sm:flex">
                  <Calendar className="w-3 h-3 md:w-4 md:h-4 text-[var(--text-primary)]" />
                  <span className="text-[10px] md:text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide">
                    {formatBirthday(activeUser.birthday)}
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="Find friend..." 
                  className="w-50 bg-[var(--bg-input)] border border-[var(--border-light)] rounded-full py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-all focus:w-60 duration-300"
                  value={searchFriendQuery}
                  onChange={handleSearchFriend}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                {friendSearchResults.length > 0 && (
                  <div className="absolute top-full right-0 mt-2 w-60 bg-[var(--bg-card)] border border-[var(--border-light)] rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto backdrop-blur-xl">
                    {friendSearchResults.map(friend => (
                      <button 
                        key={friend.id}
                        onClick={() => handleFollow(friend.id)}
                        className="w-full text-left px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--accent-primary)] transition-colors flex items-center gap-2"
                      >
                        <img src={friend.avatar_url || `https://ui-avatars.com/api/?name=${friend.full_name}&background=6366f1&color=fff`} className="w-5 h-5 rounded-full" alt="" />
                        <div className="flex flex-col">
                          <span className="font-semibold">{friend.full_name}</span>
                          <span className="text-[10px] text-[var(--text-muted)]">@{friend.username}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button 
                onClick={() => setIsGroupModalOpen(true)}
                className="flex items-center justify-center gap-2 px-3 py-1.5 bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)] text-[var(--accent-primary)] rounded-full hover:bg-[var(--accent-primary)] hover:text-white transition-all text-sm font-semibold"
              >
                <Users className="w-3.5 h-3.5" /> Create Group
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 pl-2 md:pl-4 border-l border-[var(--border-light)]">
            <button 
              onClick={openProfileModal}
              className="flex items-center gap-2 md:gap-4 hover:bg-[var(--bg-hover)] p-1 md:p-2 rounded-xl transition-colors group cursor-pointer"
            >
              <div className="hidden sm:block text-right">
                <p className="text-[10px] text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors leading-tight">Signed in as</p>
                <p className="text-xs md:text-sm font-semibold text-[var(--text-secondary)] truncate max-w-[200px]">{displayName}</p>
              </div>
              <div className="relative w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px]">
                  <img src={currentAvatar} className="w-full h-full rounded-full object-cover bg-[var(--bg-main)]" alt="Profile" />
                  <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-3 h-3 md:w-4 md:h-4 text-white" />
                  </div>
              </div>
            </button>
          </div>
        </header>

          {/* MOBILE QUICK ACTIONS BAR */}
          <div className="flex md:hidden px-4 py-2 gap-2 border-b border-[var(--border-light)] bg-[var(--bg-main)]/30">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  placeholder="Find friend..." 
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-light)] rounded-lg py-3 pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-all"
                  value={searchFriendQuery}
                  onChange={handleSearchFriend}
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                {friendSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border-light)] rounded-lg shadow-xl z-[9999] max-h-40 overflow-y-auto backdrop-blur-xl">
                    {friendSearchResults.map(friend => (
                      <button 
                        key={friend.id}
                        onClick={() => handleFollow(friend.id)}
                        className="w-full text-left px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--accent-primary)] transition-colors flex items-center gap-2"
                      >
                        <img src={friend.avatar_url || `https://ui-avatars.com/api/?name=${friend.full_name}&background=6366f1&color=fff`} className="w-5 h-5 rounded-full" alt="" />
                        <div className="flex flex-col">
                          <span className="font-semibold">{friend.full_name}</span>
                          <span className="text-[10px] text-[var(--text-muted)]">@{friend.username}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button 
                onClick={() => setIsGroupModalOpen(true)}
                className="flex-shrink-0 flex items-center justify-center gap-2 px-3 py-1.5 bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 text-[var(--accent-primary)] rounded-lg hover:bg-[var(--accent-primary)] hover:text-white transition-all text-xs font-semibold"
              >
                <Users className="w-3.5 h-3.5" /> Group
              </button>
          </div>

          {/* SCROLLABLE AREA */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6 md:mb-8 relative">
                <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-[var(--text-muted)]" />
                <input 
                  type="text" 
                  placeholder="Search gifts..." 
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-light)] rounded-xl py-2.5 md:py-3 pl-10 md:pl-12 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]/50 focus:ring-1 focus:ring-[var(--accent-primary)]/50 transition-all backdrop-blur-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
                {/* ADD/EDIT BUTTON CARD */}
                {isMyList && (
                  <button 
                    onClick={openAddModal}
                    className="group h-full min-h-[280px] md:min-h-[320px] flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-light)] rounded-2xl hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/5 transition-all duration-300 text-[var(--text-muted)] hover:text-[var(--accent-primary)] relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-[var(--accent-primary)]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[var(--bg-card)] group-hover:bg-[var(--accent-primary)] group-hover:text-white flex items-center justify-center mb-4 transition-all shadow-lg group-hover:scale-110 z-10">
                      <Plus className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <span className="font-semibold text-sm md:text-base z-10">Add new gift</span>
                    <span className="text-xs mt-2 opacity-60 z-10">Start a new wishlist item</span>
                  </button>
                )}
                
               {/* GIFT CARDS */}
              {userGifts.map(gift => {
                const isMyList = activeUser.id === session.user.id;
                const isReserved = gift.reserved_by !== null;
                const isReservedByMe = gift.reserved_by === session.user.id;
                const reserver = allUsers.find(u => u.id === gift.reserved_by);
                const currencyObj = currencies.find(c => c.code === gift.currency);
                const symbol = currencyObj ? currencyObj.symbol : '₦';
                const displayPrice = gift.price === 'Any' ? 'Any Price' : `${symbol}${Number(gift.price).toLocaleString()}`;

                return (
                  <div 
                    key={gift.id} 
                    onClick={() => handleGiftClick(gift)}
                    className="group relative bg-[var(--bg-card)] border border-[var(--border-light)] hover:border-[var(--border-color)] rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-[var(--accent-primary)]/10 transition-all duration-300 flex flex-col cursor-pointer"
                  >
                    {/* IMAGE SECTION */}
                    <div className="aspect-[4/3] w-full bg-[var(--bg-card)]/50 relative overflow-hidden">
                      {gift.image_url ? (
                        <img src={gift.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={gift.name} />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--bg-input)] text-[var(--text-muted)]">
                          <Gift className="w-10 h-10 mb-2 opacity-50" />
                          <span className="text-xs font-medium uppercase tracking-wider opacity-60">No Image</span>
                        </div>
                      )}
                      
                      {/* BADGE LOGIC */}
                      {isReserved ? (
                        <div className="absolute top-4 right-4 bg-[var(--danger)] backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-lg border border-[var(--danger)] flex items-center gap-1.5 z-10">
                          <Gift className="w-3 h-3" />
                          <span>{isMyList ? "Reserved" : ""}</span>
                        </div>
                      ) : (
                        <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-white border border-[var(--border-light)] shadow-lg z-10">
                          {displayPrice}
                        </div>
                      )}

                      {/* EDIT BUTTON (Owner Only) */}
                      {isMyList && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); openEditModal(gift); }}
                          className="absolute top-4 left-4 bg-white/10 backdrop-blur-md p-1.5 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-[var(--accent-primary)]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* RESERVED OVERLAY (For Viewers) */}
                      {isReserved && !isMyList && (
                        <div className="absolute inset-0 bg-[var(--bg-main)]/80 backdrop-blur-sm flex flex-col items-center justify-center text-center z-30 pointer-events-none">
                          <div className="bg-[var(--danger)] text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-3 shadow-xl shadow-[var(--danger)]/30">Reserved</div>
                          <p className="text-white bg-[var(--bg-input)] font-medium text-sm">{isReservedByMe ? "You've reserved this" : `${reserver?.name || 'Someone'} Grabbed It!`}</p>
                        </div>
                      )}
                    </div>

                    {/* CONTENT SECTION */}
                    <div className="p-4 md:p-5 flex-1 flex flex-col">
                      <h3 className="font-bold text-base md:text-lg text-[var(--text-primary)] leading-tight mb-2">{gift.name}</h3>
                      <p className="text-xs md:text-sm text-[var(--text-secondary)] mb-4 flex-1 leading-relaxed line-clamp-2">{gift.description || "No description provided."}</p>
                      
                      <div className="mt-auto pt-4 border-t border-[var(--border-light)] flex gap-2">
                        {isMyList ? (
                          <>
                            <button 
                              onClick={(e) => { e.stopPropagation(); openEditModal(gift); }}
                              className="flex-1 py-2 text-xs font-semibold text-[var(--accent-primary)] hover:text-white hover:bg-[var(--accent-primary)]/10 rounded-lg transition-colors flex items-center justify-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" /> Edit
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteGift(gift.id); }}
                              className="flex-1 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded-lg transition-colors flex items-center justify-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleReserve(gift.id); }}
                            disabled={isReserved && !isReservedByMe}
                            className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${
                              isReservedByMe 
                                ? 'bg-[var(--text-muted)] hover:bg-[var(--text-secondary)] text-white' 
                                : (isReserved 
                                    ? 'bg-[var(--bg-input)] text-[var(--text-muted)] cursor-not-allowed opacity-50' 
                                    : 'bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white'
                                  )
                            }`}
                          >
                            <Gift className="w-4 h-4" /> 
                            {isReservedByMe ? "Cancel Reservation" : (isReserved ? "Reserved" : "Reserve Gift")}
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

      {/* --- GIFT DETAIL MODAL --- */}
      {isDetailModalOpen && selectedGift && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[var(--bg-main)]/90 backdrop-blur-sm" onClick={() => setIsDetailModalOpen(false)} >
          <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl w-full max-w-5xl h-[85vh] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 relative" onClick={(e) => e.stopPropagation()} >
            <button onClick={() => setIsDetailModalOpen(false)} className="absolute top-1.5 right-1.5 z-50 p-1 bg-black/20 hover:bg-[var(--accent-primary)] rounded-full text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
            <div className="w-full md:w-1/2 h-1/2 md:h-full bg-[var(--bg-input)] flex items-center justify-center p-4 md:p-8">
              {selectedGift.image_url ? (
                <img src={selectedGift.image_url} alt={selectedGift.name} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
              ) : (
                <div className="flex flex-col items-center text-[var(--text-muted)]">
                  <Gift className="w-24 h-24 mb-4 opacity-20" />
                  <span className="text-lg font-medium">No Image Available</span>
                </div>
              )}
            </div>
            <div className="w-full md:w-1/2 h-1/2 md:h-full bg-[var(--bg-main)] p-6 md:p-10 overflow-y-auto flex flex-col">
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">{selectedGift.name}</h2>
                  <div className="bg-[var(--bg-hover)] border border-[var(--border-color)] px-4 py-2 rounded-xl">
                    <span className="text-xl md:text-2xl font-bold text-[var(--accent-primary)]">
                      {selectedGift.price === 'Any' ? 'Any Price' : `${currencies.find(c => c.code === selectedGift.currency)?.symbol || '₦'}${Number(selectedGift.price).toLocaleString()}`}
                    </span>
                  </div>
                </div>
                <div className="mb-8">
                  <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Description</h4>
                  <p className="text-[var(--text-secondary)] text-base md:text-lg leading-relaxed whitespace-pre-wrap">{selectedGift.description || "No description provided."}</p>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-[var(--border-light)]">
                {activeUser.id === session.user.id ? (
                  <div className="flex gap-4">
                    <button onClick={() => { setIsDetailModalOpen(false); openEditModal(selectedGift); }} className="flex-1 py-4 rounded-xl bg-[var(--bg-hover)] text-[var(--accent-primary)] font-bold">Edit Gift</button>
                    <button onClick={() => { if(confirm('Delete?')) { handleDeleteGift(selectedGift.id); setIsDetailModalOpen(false); } }} className="flex-1 py-4 rounded-xl bg-[var(--danger)]/10 text-[var(--danger)] font-bold">Delete</button>
                  </div>
                ) : (
                  <button 
                    onClick={() => { handleReserve(selectedGift.id); setIsDetailModalOpen(false); }}
                    disabled={selectedGift.reserved_by && selectedGift.reserved_by !== session.user.id}
                    className={`w-full py-4 rounded-xl text-lg font-bold transition-all shadow-lg flex items-center justify-center gap-3 ${
                      selectedGift.reserved_by === session.user.id ? 'bg-[var(--text-muted)]' : (selectedGift.reserved_by ? 'bg-[var(--bg-input)] opacity-50' : 'bg-[var(--accent-primary)]')
                    } text-white`}
                  >
                    <Gift className="w-6 h-6" />
                    {selectedGift.reserved_by === session.user.id ? "Cancel Reservation" : (selectedGift.reserved_by ? "Reserved" : "Reserve Gift")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT GIFT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-main)]/90 backdrop-blur-sm">
          <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-[var(--border-light)] flex justify-between items-center bg-[var(--bg-hover)]">
              <h3 className="font-bold text-lg text-[var(--text-primary)]">{editingGiftId ? "Edit Gift" : "Add new gift"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-[var(--bg-hover)] rounded-lg"><X className="w-5 h-5 text-[var(--text-muted)]" /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleGiftSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Gift Name</label>
                  <input required type="text" className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] outline-none" value={newGift.name} onChange={e => setNewGift({...newGift, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Currency</label>
                    <select value={newGift.currency} onChange={e => setNewGift({...newGift, currency: e.target.value})} className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] outline-none appearance-none">
                      {currencies.map(c => (<option key={c.code} value={c.code} className="bg-[var(--bg-main)]">{c.code} ({c.symbol})</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Amount</label>
                    <input required type="text" className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] outline-none" value={newGift.price} onChange={handlePriceChange} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Description</label>
                  <textarea rows="3" className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] outline-none resize-none" value={newGift.description} onChange={e => setNewGift({...newGift, description: e.target.value})} />
                </div>
                <button type="submit" disabled={uploading} className="w-full bg-[var(--accent-primary)] text-white font-semibold py-3.5 rounded-xl disabled:opacity-50">
                    {uploading ? "Saving..." : "Save Gift"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-main)]/90 backdrop-blur-sm">
          <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-[var(--border-light)] flex justify-between items-center bg-[var(--bg-hover)]">
              <h3 className="font-bold text-lg text-[var(--text-primary)]">{generatedGroupCode ? "Group Created!" : "Create Group"}</h3>
              <button onClick={() => {setIsGroupModalOpen(false); setGeneratedGroupCode(null);}} className="p-2 rounded-lg"><X className="w-5 h-5 text-[var(--text-muted)]" /></button>
            </div>
            <div className="p-6">
              {generatedGroupCode ? (
                <div className="text-center space-y-4">
                  <div className="w-full bg-[var(--bg-input)] border-2 border-dashed border-[var(--accent-primary)]/30 rounded-xl p-6" onClick={copyGroupCode}>
                    <span className="text-3xl font-mono font-bold text-[var(--accent-primary)] tracking-widest">{generatedGroupCode}</span>
                  </div>
                  <button onClick={copyGroupCode} className="w-full py-3 bg-white text-black font-bold rounded-xl">Copy Code</button>
                </div>
              ) : (
                <form onSubmit={handleCreateGroup} className="space-y-5">
                  <input type="text" required placeholder="Group Name" className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] outline-none" value={groupName} onChange={e => setGroupName(e.target.value)} />
                  <button type="submit" className="w-full bg-[var(--accent-primary)] text-white font-bold py-3 rounded-xl">Create Group</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PROFILE MODAL */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[var(--bg-main)]/90 backdrop-blur-sm">
          <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-[var(--border-light)] flex justify-between items-center bg-[var(--bg-hover)]">
              <h3 className="font-bold text-lg text-[var(--text-primary)]">Edit Profile</h3>
              <button onClick={() => setIsProfileModalOpen(false)} className="p-2 rounded-lg"><X className="w-5 h-5 text-[var(--text-muted)]" /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleProfileSave} className="space-y-5">
                <div className="flex flex-col items-center gap-3">
                    <div className="relative cursor-pointer" onClick={() => fileInputRef.current.click()}>
                      <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px]">
                          <img src={editAvatarUrl || currentAvatar} className="w-full h-full rounded-full object-cover bg-[var(--bg-main)]" alt="" />
                      </div>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
                <input type="text" required className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] outline-none" value={editName} onChange={e => setEditName(e.target.value)} />
                <input type="date" className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-light)] rounded-xl text-[var(--text-primary)] outline-none [color-scheme:dark]" value={editBirthday} onChange={e => setEditBirthday(e.target.value)} />
                <button type="submit" disabled={uploading} className="w-full bg-white text-black font-bold py-3 rounded-xl disabled:opacity-50">Save Changes</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className="bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-primary)] px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right pointer-events-auto backdrop-blur-xl">
            <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)]"></div>
            <span className="text-sm font-medium">{n.msg}</span>
          </div>
        ))}
      </div>
    </div>
    </>
  );
}