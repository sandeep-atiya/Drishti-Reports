import { useState } from 'react';
import { BarChart2, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuth }      from '../../../context/AuthContext';
import { loginRequest } from '../services/auth.api';

export default function LoginPage() {
  const { login }                       = useAuth();
  const [identifier, setIdentifier]     = useState('');
  const [password,   setPassword]       = useState('');
  const [showPass,   setShowPass]       = useState(false);
  const [loading,    setLoading]        = useState(false);
  const [error,      setError]          = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;

    setLoading(true);
    setError('');

    try {
      const data = await loginRequest({ login: identifier.trim(), password });
      login(data.token, data.user);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 mb-4">
            <BarChart2 size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Drishti Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to access the dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 shadow-sm px-8 py-8">

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Username / Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Username or Email
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter username or email"
                autoComplete="username"
                autoFocus
                disabled={loading}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 bg-white text-slate-800 placeholder-slate-400
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           disabled:bg-slate-50 disabled:text-slate-400 transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 pr-10 text-sm border border-slate-200 bg-white text-slate-800 placeholder-slate-400
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             disabled:bg-slate-50 disabled:text-slate-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !identifier.trim() || !password}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold
                         hover:bg-blue-700 active:bg-blue-800 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </button>

          </form>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">
          v{import.meta.env.VITE_APP_VERSION} · Drishti Reports
        </p>
      </div>
    </div>
  );
}
