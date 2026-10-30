import React, { useState } from 'react';

// Main App Wrapper to showcase the modal in a simulated environment
export default function App() {
  // State to control modal visibility (defaults to true for demonstration)
  const [isAuthOpen, setIsAuthOpen] = useState(true);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 relative">
      {/* --- MOCK BACKGROUND TO SHOWCASE THE OVERLAY --- */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            📅 StudySync
          </h1>
          <p className="text-sm text-slate-500">Team Calendar & Event Management</p>
        </div>
        <button 
          onClick={() => setIsAuthOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
        >
          Sign In / Register
        </button>
      </header>
      
      <main className="p-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 h-[600px] flex items-center justify-center">
          <p className="text-slate-400">Calendar Grid Placeholder</p>
        </div>
      </main>

      {/* --- THE ACTUAL AUTHENTICATION MODAL --- */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// AuthModal Component
// ---------------------------------------------------------------------------
function AuthModal({ isOpen, onClose }) {
  // Core UI State
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState('student'); // 'student' | 'parent'
  
  // Form Data State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    studentId: ''
  });

  // Handle closing the modal gracefully
  if (!isOpen) return null;

  // Handle form submission (UI only for now)
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form Submitted:", { isRegister, role, ...formData });
    // In the future: Connect to FastAPI backend here
    // onClose(); // Close modal on successful login
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header section */}
        <div className="px-8 pt-8 pb-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {isRegister ? 'Create Account' : 'Welcome back'}
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="px-8 pb-8 overflow-y-auto">
          <p className="text-slate-500 mb-6 text-sm">
            {isRegister 
              ? 'Join StudySync to organize your academic life.' 
              : 'Enter your credentials to access your calendar.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Conditional Fields for Registration */}
            {isRegister && (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                
                {/* Full Name Input */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 block">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Alex Smith"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Role Selection Toggle */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 block">I am registering as a:</label>
                  <div className="flex p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                        role === 'student' 
                          ? 'bg-white text-blue-700 shadow-sm border border-slate-200' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('parent')}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                        role === 'parent' 
                          ? 'bg-white text-blue-700 shadow-sm border border-slate-200' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Parent
                    </button>
                  </div>
                </div>

                {/* Conditional Link Code for Parents */}
                {role === 'parent' && (
                  <div className="space-y-1.5 animate-in zoom-in-95 duration-200">
                    <label className="text-sm font-medium text-slate-700 flex items-center justify-between block">
                      <span>Student Link Code</span>
                      <span className="text-xs font-normal text-slate-400">Required</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="e.g. std_101"
                        value={formData.studentId}
                        onChange={(e) => setFormData({...formData, studentId: e.target.value})}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Ask your student to provide their unique link code.</p>
                  </div>
                )}
              </div>
            )}

            {/* Email Input (Always visible) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 block">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all"
                />
              </div>
            </div>

            {/* Password Input (Always visible) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 block">Password</label>
                {!isRegister && (
                  <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-500">Forgot password?</a>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-2.5 rounded-lg transition-colors mt-6 shadow-sm flex justify-center items-center gap-2"
            >
              {isRegister ? 'Create StudySync Account' : 'Sign In'}
            </button>
          </form>

          {/* Toggle between Sign In and Register */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-600">
              {isRegister ? "Already have an account? " : "Don't have an account yet? "}
              <button 
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  // Reset form data when toggling
                  setFormData({name: '', email: '', password: '', studentId: ''});
                }}
                className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
              >
                {isRegister ? "Sign In" : "Create one"}
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}