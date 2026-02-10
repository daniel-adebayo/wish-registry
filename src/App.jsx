import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Landing from './pages/Landing';  
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState('landing'); // Options: 'landing', 'auth'

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Logic to decide which component to render
  if (session) {
    // If logged in, show Dashboard
    return <Dashboard session={session} onLogout={() => supabase.auth.signOut()} />;
  } else {
    // If NOT logged in, check which view we are on
    if (view === 'landing') {
      return <Landing onGetStarted={() => setView('auth')} />;
    } else {
      return <Auth />;
    }
  }
}