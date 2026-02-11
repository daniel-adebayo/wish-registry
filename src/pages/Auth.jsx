import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Auth() {
  const [isLoginMode, setIsLoginMode] = useState(true);

  const handleAuth = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    if (isLoginMode) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert("Login Error: " + error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      if (error) alert("Sign Up Error: " + error.message);
      else alert("Account created! Please log in.");
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) console.error(error);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0f172a] flex items-center justify-center p-4 font-sans text-white selection:bg-indigo-500 selection:text-white">
      
      {/* --- MESH GRADIENT BACKGROUND --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="mesh-blob w-96 h-96 bg-indigo-600/60 top-[-30%] left-[-5%] animate-[move-towards_7s_infinite]"></div>
        <div className="mesh-blob w-[500px] h-[500px] bg-purple-600/60 top-[20%] right-[-10%] animate-[drift_5s_infinite_reverse]"></div>
        <div className="mesh-blob w-80 h-80 bg-pink-600/50 bottom-[-30%] left-[10%] animate-[move-towards_6s_infinite_5s]"></div>
        <div className="mesh-blob w-64 h-64 bg-cyan-600/40 top-[10%] left-[42%] animate-[drift_4s_infinite]"></div>
      </div>

      {/* --- MAIN CARD --- */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/0 backdrop-blur-0xl border border-white/0 rounded-2xl p-8 shadow-2xl shadow-black/0 animate-in fade-in zoom-in-95 duration-500">
          
          {/* --- HEADER SECTION --- */}
        <div className="text-center mb-8">
        <img 
            src="/images/my-logo.png" 
            alt="WishRegistry Logo" 
            className="mx-auto -mb-5 w-24 h-44 object-contain animate-float"
            />

            {/* 2. Title (Must have w-fit and mx-auto to center properly) */}
            <h1 className="w-fit mx-auto text-center text-2xl md:text-3xl lg:text-5xl font-bold tracking-tight mb-2 whitespace-nowrap">Wish Registry</h1>

            {/* 3. Subtitle */}
            <p className="text-gray-400 text-sm">Access your circle of gifts.</p>
            </div>

          {/* Buttons */}
          <div className="space-y-4">
            <button onClick={handleGoogleLogin} className="w-full group relative flex items-center justify-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all duration-300">
              <svg width="20" height="20" viewBox="0 0 24 24" className="group-hover:scale-110 transition-transform"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#EA4335"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#4285F4"/></svg>
              <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">Continue with Google</span>
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink-0 mx-4 text-xs uppercase tracking-widest text-gray-500">Or</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Email</label>
                <input name="email" type="email" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:bg-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none text-white placeholder-gray-600 transition-all" placeholder="you@example.com" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Password</label>
                <input name="password" type="password" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:bg-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none text-white placeholder-gray-600 transition-all" placeholder="••••••••••••" required />
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition-all duration-300 hover:scale-[1.02]">
                {isLoginMode ? "Sign In" : "Create Account"}
              </button>
            </form>

            <div className="text-center pt-4">
              <button onClick={() => setIsLoginMode(!isLoginMode)} className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                {isLoginMode ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}