import React, { useState } from 'react';
import { X, Eye, EyeOff, Lock, Mail, User, GraduationCap, ShieldCheck, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, authModalMode, setAuthModalMode, login } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Student' | 'Researcher'>('Researcher');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  if (!isAuthModalOpen) return null;

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errs.password = 'Password is required.';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }

    if (authModalMode === 'register') {
      if (!name.trim()) errs.name = 'Full name is required.';
      if (password !== confirmPassword) {
        errs.confirmPassword = 'Passwords do not match.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    login(email, authModalMode === 'register' ? name : 'Researcher', role);
  };

  const handleDemoSignIn = (demoRole: 'Student' | 'Researcher') => {
    login(
      demoRole === 'Researcher' ? 'dr.sharma@research.nirf.in' : 'student.ananya@iitb.ac.in',
      demoRole === 'Researcher' ? 'Dr. Priya Sharma' : 'Ananya Rao',
      demoRole
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-b from-blue-50/60 to-white flex items-start justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {authModalMode === 'login' ? 'Sign in to NIRF Insights' : 'Create an Account'}
              </h3>
              <p className="text-xs text-slate-500">
                {authModalMode === 'login'
                  ? 'Access saved comparisons and institutional reports'
                  : 'Join researchers and students analyzing Indian higher education'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prototype Banner Notice */}
        <div className="px-6 py-2 bg-amber-50/70 border-b border-amber-100 flex items-center gap-2 text-[11px] text-amber-800">
          <Info className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
          <span>Demo Authentication Prototype. No real backend credentials required.</span>
        </div>

        {/* Tab switch */}
        <div className="px-6 pt-4 flex gap-4 border-b border-slate-100">
          <button
            onClick={() => {
              setAuthModalMode('login');
              setErrors({});
            }}
            className={`pb-2.5 text-xs font-bold transition-all relative ${
              authModalMode === 'login' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setAuthModalMode('register');
              setErrors({});
            }}
            className={`pb-2.5 text-xs font-bold transition-all relative ${
              authModalMode === 'register' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Register
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {authModalMode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. A. P. J. Kalam"
                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-slate-50 focus:bg-white outline-none focus:ring-2 transition-all ${
                      errors.name ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                    }`}
                  />
                </div>
                {errors.name && <p className="text-[10px] text-rose-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">User Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('Researcher')}
                    className={`px-3 py-2 text-xs font-medium rounded-xl border transition-all text-center ${
                      role === 'Researcher'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Researcher / Faculty
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('Student')}
                    className={`px-3 py-2 text-xs font-medium rounded-xl border transition-all text-center ${
                      role === 'Student'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Student / Aspirant
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu.in"
                className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-slate-50 focus:bg-white outline-none focus:ring-2 transition-all ${
                  errors.email ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                }`}
              />
            </div>
            {errors.email && <p className="text-[10px] text-rose-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">Password</label>
              {authModalMode === 'login' && (
                <button
                  type="button"
                  onClick={() => alert('Demo password reset link simulated for prototype.')}
                  className="text-[11px] text-blue-600 hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-9 pr-9 py-2 text-xs rounded-xl border bg-slate-50 focus:bg-white outline-none focus:ring-2 transition-all ${
                  errors.password ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {errors.password && <p className="text-[10px] text-rose-500 mt-1">{errors.password}</p>}
          </div>

          {authModalMode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-slate-50 focus:bg-white outline-none focus:ring-2 transition-all ${
                    errors.confirmPassword ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-[10px] text-rose-500 mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          {authModalMode === 'login' && (
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                Remember this session
              </label>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            {authModalMode === 'login' ? 'Sign In' : 'Create Free Account'}
          </button>

          {/* Quick Demo Fill Buttons */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-[11px] text-center text-slate-400 mb-2">Or instant sign-in with 1-click demo:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoSignIn('Researcher')}
                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors"
              >
                Demo Researcher
              </button>
              <button
                type="button"
                onClick={() => handleDemoSignIn('Student')}
                className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors"
              >
                Demo Student
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
