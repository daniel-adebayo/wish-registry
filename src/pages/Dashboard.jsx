import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Gift, Plus, Calendar, LogOut, Trash2, Sparkles, Search, X, Camera, Upload, DollarSign, Image,ChevronDown, ChevronRight, Users, CheckCircle2, Menu, Edit2 } from 'lucide-react';

export default function Dashboard({ session, onLogout }) {
  // --- STATE ---
  const [activeListId, setActiveListId] = useState(session?.user?.id || '');
  const [searchQuery, setSearchQuery] = useState(''); // Gift Search
  const [notifications, setNotifications] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [uploading, setUploading] = useState(false); // Loading state for uploads
  
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
  const [groupMembersMap, setGroupMembersMap] = useState({}); // { groupId: [members] }
  const [expandedGroupIds, setExpandedGroupIds] = useState(new Set()); // Track which groups are open
  
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
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
    // 1. Get Groups I am a member of
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

    // Format my groups
    const groupsList = myMembership.map(item => ({
      id: item.group_id,
      name: item.groups?.name || 'Unknown Group'
    }));
    setMyGroups(groupsList);

    // 2. Get ALL members for ALL my groups in one go
    const groupIds = groupsList.map(g => g.id);
    
    const { data: allMembersData, error: membersError } = await supabase
      .from('group_members')
      .select('group_id, user_id, profiles(full_name, avatar_url, username)')
      .in('group_id', groupIds);

    if (membersError) {
      console.error("Error fetching group members:", membersError);
      return;
    }

    // 3. Map members to their groups
    const map = {};
    allMembersData.forEach(item => {
      if (!map[item.group_id]) map[item.group_id] = [];
      if (item.profiles && item.user_id !== session.user.id) { // Don't list self
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

    const { error: error1 } = await supabase
      .from('follows')
      .insert([{ follower_id: session.user.id, following_id: targetId }]);

    const { error: error2 } = await supabase
      .from('follows')
      .insert([{ follower_id: targetId, following_id: session.user.id }]);

    if (error1 || error2) {
      const err = error1 || error2;

      if (err.code === '23505') {
        // Ignore duplicate error, implies first step worked or existed
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
    
    // 1. Create the Group
    // We use .select() to get the ID of the newly created group back
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

    // 2. Automatically add Creator to Members
    if (groupData && groupData[0]) {
      const newGroupId = groupData[0].id;
      
      await supabase.from('group_members').insert([
        { group_id: newGroupId, user_id: session.user.id }
      ]);
    }

    // 3. Success State
    setGeneratedGroupCode(code);
    setGroupName('');
    addNotification("Group created successfully!");

    // 4. Refresh the Sidebar so the new group appears
    await fetchGroupsData();
  };

   const handleJoinGroupLogic = async (code) => {
    if (!code) return;

    // 1. Validate the group exists
    const { data: group, error: findError } = await supabase
      .from('groups')
      .select('id')
      .eq('code', code.trim().toUpperCase())
      .single();

    if (findError || !group) {
      alert("Invalid Group Code");
      return false;
    }

    // 2. Attempt to Join the group
    const { error: joinError } = await supabase
      .from('group_members')
      .insert([{ 
        group_id: group.id, 
        user_id: session.user.id 
      }]);

    // 3. Handle the Result
    if (joinError) {
      // Error Code '23505' means "Unique Violation" (User is already in the group)
      // If we get this, it means they are successfully joined, so we return TRUE.
      if (joinError.code === '23505') {
        return true;
      }

      // If it's any other error, something actually went wrong
      console.error("Join Error:", joinError);
      alert("Could not join group.");
      return false;
    }

    // If no error at all, it was a successful insert
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

    const openEditModal = (gift) => {
    setEditingGiftId(gift.id);
    setNewGift({
      name: gift.name,
      // Ensure we only load the number (remove any stray symbols just in case)
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

    // Handle Image Upload if new file selected
    if (selectedGiftFile) {
      const url = await uploadImage(selectedGiftFile);
      if (url) finalImageUrl = url;
    }

    // --- THE FIX ---
    // Strip commas and non-digits so we save "3000000" instead of "3,000,000"
    const rawPrice = newGift.price.replace(/[^0-9]/g, '');

    if (editingGiftId) {
      // --- UPDATE MODE ---
      const { error } = await supabase.from('gifts').update({
        name: newGift.name, 
        price: rawPrice, // Save the clean number
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
          price: rawPrice, // Save the clean number
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
    
    const isReserved = currentGift.reserved_by !== null;
    const isReservedByMe = currentGift.reserved_by === session.user.id;

    // Decide what we want to do
    // Case A: It's free, and I want to reserve it.
    // Case B: It's reserved by me, and I want to cancel.
    // Case C: It's reserved by someone else -> Do nothing (blocked by UI, but logic handles it)

    if (isReserved && !isReservedByMe) return; 

    const shouldReserve = !isReserved;

    // Perform the update with a safety check
    // We use .is() to ensure we only update if the current state matches what we think it is
    const { error, count } = await supabase
      .from('gifts')
      .update({ reserved_by: shouldReserve ? session.user.id : null })
      .eq('id', giftId)
      // Logic: If I want to reserve, ensure it is currently null (free)
      .is('reserved_by', shouldReserve ? null : session.user.id);

    if (error) {
      console.error("Error reserving:", error);
      return;
    }

    // If count is 0, it means someone else beat us to it!
    if (shouldReserve && count === 0) {
      alert("Too slow! Someone else just reserved this gift.");
      fetchGifts(); // Refresh to show it's taken
      return;
    }

    // Success
    fetchGifts(); 
    addNotification(shouldReserve ? `Reserved "${currentGift.name}"!` : `Cancelled reservation`);
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

   // TOGGLE GROUP LOGIC ---
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

  if (!session || !session.user) return <div className="p-10 text-center text-white">Loading...</div>;

  const user = session.user;
  const currentAvatar = avatarUrl || `https://ui-avatars.com/api/?name=${displayName}&background=6366f1&color=fff`;

   // --- LOGIC BLOCK (Must be at bottom, before return) ---
  
  // Combine all group members into one flat list
  const allGroupMembers = Object.values(groupMembersMap).flat();

  // The master list of users available to view
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
        {/* Header */}
        <div className="p-6 flex items-center justify-between md:justify-start gap-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <img src="/images/my-logo.png" alt="Logo" className="w-8 h-8 object-contain" />
            <span className="font-bold tracking-tight text-lg">Wish Registry</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-2">
          
          {/* --- SECTION 1: MY CIRCLE (FOLLOWS) --- */}
          <div className="flex flex-col">
            <button 
              onClick={() => setIsCircleOpen(!isCircleOpen)}
              className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-white transition-colors"
            >
              <span>My Circle ({myCircle.length})</span>
              {isCircleOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            {isCircleOpen && (
              <nav className="space-y-1 mt-1">
                {/* ME (Always Visible) */}
                <button
                  onClick={() => { setActiveListId(user.id); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200 group ${
                    activeListId === user.id 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px]">
                    <img src={currentAvatar} className="w-full h-full rounded-full object-cover bg-slate-900" alt="" />
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
                
                {myCircle.length === 0 && (
                   <p className="px-4 py-2 text-xs text-gray-600 italic">Search for friends to add them here.</p>
                )}
              </nav>
            )}
          </div>

          {/* --- SECTION 2: MY GROUPS --- */}
          <div className="flex flex-col mt-2">
            <button 
              onClick={() => setIsGroupsOpen(!isGroupsOpen)}
              className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-white transition-colors"
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
                    <div key={group.id} className="overflow-hidden rounded-xl border border-white/5 bg-white/5">
                      {/* Group Header (Click to Expand) */}
                      <button 
                        onClick={() => toggleGroup(group.id)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400">
                            <Users className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-sm font-semibold text-gray-200 truncate">{group.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded">{members.length}</span>
                          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </div>
                      </button>

                      {/* Group Members List (Expandable) */}
                      {isExpanded && (
                        <div className="border-t border-white/5 bg-slate-900/30">
                          {members.length > 0 ? members.map(member => (
                            <button
                              key={`group-${group.id}-${member.id}`}
                              onClick={() => { setActiveListId(member.id); setIsSidebarOpen(false); }}
                              className={`w-full flex items-center gap-3 px-3 py-2 pl-9 text-sm font-medium transition-all duration-200 group ${
                                activeListId === member.id 
                                ? 'bg-indigo-600/20 text-indigo-300' 
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              <img src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}&background=6366f1&color=fff`} className="w-6 h-6 rounded-full object-cover" alt="" />
                              <span className="truncate">{member.name}</span>
                            </button>
                          )) : (
                            <p className="px-9 py-2 text-xs text-gray-600 italic">No other members yet.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {myGroups.length === 0 && (
                   <p className="px-4 py-2 text-xs text-gray-600 italic">Join a group to see members here.</p>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Footer Logout */}
        <div className="p-4 border-t border-white/5">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-400 bg-white/5 hover:bg-red-500/10 hover:text-red-400 border border-white/5 hover:border-red-500/20 rounded-xl transition-all">
            <LogOut className="w-4 h-4" /> <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
        
      {/* HEADER */}
      <header className="bg-slate-900/50 backdrop-blur-md border-b border-white/5 px-4 md:px-8 py-3 md:py-3 flex justify-between items-center shrink-0 gap-2 md:gap-4">
        
        {/* LEFT SECTION: Title + Moved Actions */}
        <div className="flex items-center justify-between flex-1 gap-2 md:gap-4">
          
          {/* Left Side: Hamburger + Title */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
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

          {/* Right Side of Left Section: Search + Group (Moved Here to Center) */}
          <div className="hidden md:flex items-center gap-3">
            
            {/* FIND FRIEND SEARCH */}
            <div className="relative group">
              <input 
                type="text" 
                placeholder="Find friend..." 
                className="w-40 bg-slate-950/50 border border-white/10 rounded-full py-1.5 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all focus:w-60 duration-300"
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

            {/* CREATE GROUP BUTTON */}
            <button 
              onClick={() => setIsGroupModalOpen(true)}
              className="flex items-center justify-center gap-2 px-3 py-1.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-full hover:bg-indigo-600 hover:text-white transition-all text-xs font-semibold"
            >
              <Users className="w-3.5 h-3.5" /> Create Group
            </button>
          </div>
        </div>

        {/* RIGHT SECTION: Profile Only */}
        <div className="flex items-center gap-2 md:gap-4 pl-2 md:pl-4 border-l border-white/5">
          <button 
            onClick={openProfileModal}
            className="flex items-center gap-2 md:gap-4 hover:bg-white/5 p-1 md:p-2 rounded-xl transition-colors group cursor-pointer"
          >
            <div className="hidden sm:block text-right">
              <p className="text-[10px] text-gray-400 group-hover:text-indigo-400 transition-colors leading-tight">Signed in as</p>
              <p className="text-xs md:text-sm font-semibold text-gray-200 truncate max-w-[200px]">{displayName}</p>
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

        {/* MOBILE QUICK ACTIONS BAR */}
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
              const isMyList = activeUser.id === session.user.id;
              const reserver = allUsers.find(u => u.id === gift.reserved_by);
              const isReserved = !!reserver;
              const isReservedByMe = reserver?.id === session.user.id;
                
                return (
                  <div key={gift.id} className="group relative bg-slate-900/40 border border-white/5 hover:border-white/10 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-indigo-900/20 transition-all duration-300 flex flex-col">
                    
                                 {/* IMAGE SECTION */}
                    <div className="aspect-[4/3] w-full bg-slate-800/50 relative overflow-hidden">
                      {/* Image Placeholder or Actual Image */}
                      {gift.image_url ? (
                        <img src={gift.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={gift.name} />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-600">
                          <Gift className="w-10 h-10 mb-2 opacity-50" />
                          <span className="text-xs font-medium uppercase tracking-wider opacity-60">No Image</span>
                        </div>
                      )}
                      
                      {/* BADGE LOGIC */}
                      {isReserved ? (
                        // 1. Show Reserved Badge (Red)
                        <div className="absolute top-4 right-4 bg-red-600/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-lg border border-red-400/20 flex items-center gap-1.5 z-10">
                          <Gift className="w-3 h-3" />
                          <span>
                            {isReservedByMe 
                              ? "You reserved this" 
                              : `Reserved by ${reserver.name || 'Someone'}`
                            }
                          </span>
                        </div>
                      ) : (
                        // 2. Show Price Badge (Black) - Only if NOT reserved
                        <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-white border border-white/10 shadow-lg z-10">
                          {(() => {
                            if (gift.price === 'Any') return 'Any Price';
                            const currencyObj = currencies.find(c => c.code === gift.currency);
                            const symbol = currencyObj ? currencyObj.symbol : '₦'; 
                            return `${symbol}${Number(gift.price).toLocaleString()}`;
                          })()}
                        </div>
                      )}

                      {/* EDIT BUTTON (Owner Only) */}
                      {isMyList && (
                        <button 
                          onClick={() => openEditModal(gift)}
                          className="absolute top-4 left-4 bg-white/10 backdrop-blur-md p-1.5 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* GRAY OVERLAY (For Viewers) */}
                      {isReserved && !isMyList && (
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-center z-30">
                          <div className="bg-red-600 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-3 shadow-xl shadow-red-600/30">Reserved</div>
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