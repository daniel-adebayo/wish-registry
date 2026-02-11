import React from 'react';

export default function Landing({ onGetStarted }) {
  return (
    // Forces it to fit the viewport
    <div className="h-screen flex flex-col bg-[#0f172a] text-white relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* --- BACKGROUND MESH GRADIENT --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[100px] mix-blend-screen animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/30 rounded-full blur-[100px] mix-blend-screen"></div>
        <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] bg-pink-500/20 rounded-full blur-[80px]"></div>
      </div>

      {/* --- NAVBAR --- */}
      <nav className="relative z-20 max-w-7xl mx-auto px-6 py-5 flex justify-between items-center gap-x-12 shrink-0">
        <div className="flex items-center gap-3 shrink-0">
          <img 
            src="/images/my-logo.png" 
            alt="WishRegistry" 
            className="w-10 h-10 object-contain"
          />
          <span className="font-bold text-xl tracking-tight">Wish Registry</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
          <a href="#" className="hover:text-white transition-colors">How it works</a>
          <a href="#" className="hover:text-white transition-colors">Features</a>
          <a href="#" className="hover:text-white transition-colors">Community</a>
          <button 
            onClick={onGetStarted}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 px-5 py-2 rounded-full transition-all hover:scale-105"
          >
            Log In
          </button>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <main className="relative z-10 flex-1 flex items-center justify-center w-full px-6">
        <section className="max-w-7xl w-full grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side: Copy */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              v2.0 Now Live
            </div>

            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
              Never get a <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">bad gift again.</span>
            </h1>

            <p className="text-base text-gray-400 max-w-lg leading-relaxed">
              Create a shared wishlist with your friends and family. Reserve gifts, track birthdays, and make every occasion special.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onGetStarted}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-xl shadow-indigo-600/20 transition-all hover:scale-105 hover:shadow-indigo-600/40 flex items-center justify-center gap-2"
              >
                Get Started
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </button>
            </div>

            <div className="pt-2 flex items-center gap-4 text-sm text-gray-500">
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0f172a] bg-gray-700 overflow-hidden">
                     <img src={`https://i.pravatar.cc/150?img=${i+10}`} alt="User" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <p>Soon to be trusted by 10,000+ happy gifters</p>
            </div>
          </div>

          {/* Right Side: 3D CSS Mockup */}
          <div className="relative h-[400px] lg:h-[500px] flex items-center justify-center perspective-1000 lg:flex">
            
            <div className="absolute inset-0 bg-indigo-500/20 blur-[60px] rounded-full transform scale-75 animate-pulse"></div>

            <div className="relative w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 transform rotate-y-12 rotate-x-6 hover:rotate-0 transition-transform duration-700 ease-out">
              
              <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-orange-400"></div>
                  <div>
                    <div className="h-3 w-24 bg-white/20 rounded mb-1"></div>
                    <div className="h-2 w-16 bg-white/10 rounded"></div>
                  </div>
                </div>
                <div className="h-8 w-20 bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/30"></div>
              </div>

              <div className="space-y-4">
                <div className="bg-[#1e293b] p-3 rounded-xl flex gap-3 items-center border border-white/5 shadow-lg transform translate-y-0 hover:-translate-y-1 transition-transform">
                  <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center text-gray-500">
                     <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                  </div>
                  <div className="flex-1">
                    <div className="h-3 w-3/4 bg-white/20 rounded mb-2"></div>
                    <div className="h-2 w-1/2 bg-white/10 rounded"></div>
                  </div>
                  <div className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-bold">Reserved</div>
                </div>

                <div className="bg-[#1e293b] p-3 rounded-xl flex gap-3 items-center border border-white/5 shadow-lg transform translate-y-4 hover:translate-y-3 transition-transform delay-75">
                  <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center text-gray-500">
                     <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"></path></svg>
                  </div>
                  <div className="flex-1">
                    <div className="h-3 w-2/3 bg-white/20 rounded mb-2"></div>
                    <div className="h-2 w-1/3 bg-white/10 rounded"></div>
                  </div>
                  <div className="px-3 py-1 bg-indigo-500 text-white text-xs rounded-full font-bold">Reserve</div>
                </div>
                
                 <div className="bg-[#1e293b]/50 p-3 rounded-xl flex gap-3 items-center border border-white/5 transform translate-y-8">
                  <div className="w-16 h-16 bg-gray-800 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-3 w-1/2 bg-white/10 rounded mb-2"></div>
                    <div className="h-2 w-1/4 bg-white/5 rounded"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -right-4 top-20 bg-white text-slate-900 px-4 py-2 rounded-lg shadow-2xl flex items-center gap-3 animate-bounce">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">Success</p>
                <p className="text-sm font-bold">Gift Reserved!</p>
              </div>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
}