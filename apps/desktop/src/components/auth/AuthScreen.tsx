import React, { useState } from 'react';
import { Shield, KeyRound, User, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AuthScreen: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);

  // Form fields
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const currentGateway = (typeof window !== 'undefined' && localStorage.getItem('null_server_url')) || import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const [gatewayInput, setGatewayInput] = useState(currentGateway);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!username || !email || !password) {
          throw new Error('Please fill in all required fields.');
        }
        await register({
          username: username.trim(),
          displayName: displayName.trim() || undefined,
          email: email.trim(),
          password,
        });
      } else {
        if (!identifier || !password) {
          throw new Error('Please enter your username/email and password.');
        }
        await login({
          login: identifier.trim(),
          password,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-null-bg flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
      {/* Background ambient grid / dots */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e2026_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-sm bg-null-charcoal border border-null-border rounded-xl shadow-2xl p-6 relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-xl bg-null-surface border border-null-border flex items-center justify-center shadow-lg p-2 overflow-hidden">
            <img
              src="/logo.png"
              alt="NULL"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-sm font-mono font-bold tracking-widest text-null-text uppercase">
            NULL COMMUNICATIONS
          </h1>
          <p className="text-[11px] font-mono text-null-ash">
            {isRegister ? 'OPERATOR ENROLLMENT PROTOCOL' : 'SECURE OPERATOR ACCESS'}
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3 bg-null-danger/10 border border-null-danger/30 rounded-lg text-xs text-null-danger leading-relaxed">
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister ? (
            <>
              <div>
                <label className="text-[10px] font-mono text-null-muted uppercase tracking-wider block mb-1">
                  Operator Handle (Username) *
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-null-ash" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. shadow_01"
                    required
                    minLength={3}
                    maxLength={30}
                    className="w-full bg-null-surface border border-null-border rounded-lg pl-9 pr-3 py-2 text-xs text-null-text placeholder-null-ash focus:outline-none focus:border-null-borderLight"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-null-muted uppercase tracking-wider block mb-1">
                  Display Callsign (Optional)
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Shadow"
                  className="w-full bg-null-surface border border-null-border rounded-lg px-3 py-2 text-xs text-null-text placeholder-null-ash focus:outline-none focus:border-null-borderLight"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-null-muted uppercase tracking-wider block mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-null-ash" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@null.network"
                    required
                    className="w-full bg-null-surface border border-null-border rounded-lg pl-9 pr-3 py-2 text-xs text-null-text placeholder-null-ash focus:outline-none focus:border-null-borderLight"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="text-[10px] font-mono text-null-muted uppercase tracking-wider block mb-1">
                Username or Email
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-null-ash" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter handle or email"
                  required
                  className="w-full bg-null-surface border border-null-border rounded-lg pl-9 pr-3 py-2 text-xs text-null-text placeholder-null-ash focus:outline-none focus:border-null-borderLight"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] font-mono text-null-muted uppercase tracking-wider block mb-1">
              Passphrase *
            </label>
            <div className="relative">
              <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-null-ash" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                minLength={8}
                className="w-full bg-null-surface border border-null-border rounded-lg pl-9 pr-3 py-2 text-xs text-null-text placeholder-null-ash focus:outline-none focus:border-null-borderLight"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-null-text text-null-bg hover:opacity-90 disabled:opacity-50 rounded-lg text-xs font-semibold null-transition flex items-center justify-center space-x-2 mt-4"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin text-null-bg" />
            ) : (
              <>
                <span>{isRegister ? 'Enroll Account' : 'Authenticate Session'}</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        {/* Switch Mode Toggle & Gateway Settings */}
        <div className="flex flex-col items-center space-y-2 pt-2 border-t border-null-border">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-null-muted hover:text-null-text null-transition"
          >
            {isRegister ? 'Already registered? Log in.' : "No credentials? Create account."}
          </button>

          <button
            type="button"
            onClick={() => setShowGatewayModal(true)}
            className="text-[10px] font-mono text-null-ash hover:text-null-muted null-transition flex items-center space-x-1"
          >
            <span>Gateway: {currentGateway}</span>
          </button>
        </div>
      </div>

      {/* Gateway Configuration Modal */}
      {showGatewayModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-null-charcoal border border-null-border rounded-xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-null-text uppercase tracking-wider">
                Server Gateway Settings
              </span>
              <button
                onClick={() => setShowGatewayModal(false)}
                className="text-null-muted hover:text-null-text"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-null-ash leading-relaxed">
              Configure the remote NULL production server URL to connect with friends over the internet.
            </p>
            <div>
              <label className="text-[10px] font-mono text-null-muted block mb-1">
                SERVER GATEWAY URL
              </label>
              <input
                type="text"
                value={gatewayInput}
                onChange={(e) => setGatewayInput(e.target.value)}
                placeholder="https://null-server.onrender.com"
                className="w-full bg-null-surface border border-null-border rounded-lg px-3 py-2 text-xs text-null-text focus:outline-none focus:border-null-borderLight"
              />
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('null_server_url');
                  window.location.reload();
                }}
                className="px-3 py-1.5 rounded text-xs text-null-muted hover:text-null-text hover:bg-null-surface"
              >
                Reset Default
              </button>
              <button
                type="button"
                onClick={() => {
                  const trimmed = gatewayInput.trim().replace(/\/$/, '');
                  if (trimmed) {
                    localStorage.setItem('null_server_url', trimmed);
                  } else {
                    localStorage.removeItem('null_server_url');
                  }
                  window.location.reload();
                }}
                className="px-3 py-1.5 rounded bg-null-text text-null-bg text-xs font-semibold hover:opacity-90"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
