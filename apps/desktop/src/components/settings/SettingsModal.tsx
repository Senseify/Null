import React, { useState } from 'react';
import { X, User, Key, LogOut, Shield, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ApiClient } from '../../api/client';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { user, updateProfile, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'network'>('profile');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [statusMessage, setStatusMessage] = useState(user?.statusMessage || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Network tab state
  const currentServerUrl = (typeof window !== 'undefined' && localStorage.getItem('null_server_url')) || import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const [serverUrlInput, setServerUrlInput] = useState(currentServerUrl);

  // Security tab state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityMsg, setSecurityMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim() || null,
        statusMessage: statusMessage.trim() || null,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMsg(null);

    if (newPassword !== confirmPassword) {
      setSecurityMsg({ text: 'New passwords do not match.', isError: true });
      return;
    }

    if (newPassword.length < 8) {
      setSecurityMsg({ text: 'New password must be at least 8 characters.', isError: true });
      return;
    }

    try {
      await ApiClient.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setSecurityMsg({ text: 'Password successfully updated.', isError: false });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setSecurityMsg({ text: err.message || 'Failed to change password.', isError: true });
    }
  };

  const handleLogout = async () => {
    if (confirm('Terminate session and log out of NULL?')) {
      await logout();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg bg-null-charcoal border border-null-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-null-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold tracking-wider text-null-text uppercase">
              Operator Settings
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-null-muted hover:text-null-text hover:bg-null-surface null-transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Nav */}
        <div className="flex border-b border-null-border px-4 pt-2 space-x-4 bg-null-charcoal">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2 text-xs font-medium border-b-2 null-transition ${
              activeTab === 'profile'
                ? 'border-null-text text-null-text'
                : 'border-transparent text-null-muted hover:text-null-text'
            }`}
          >
            Identity & Bio
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-2 text-xs font-medium border-b-2 null-transition ${
              activeTab === 'security'
                ? 'border-null-text text-null-text'
                : 'border-transparent text-null-muted hover:text-null-text'
            }`}
          >
            Security & Passwords
          </button>
          <button
            onClick={() => setActiveTab('network')}
            className={`pb-2 text-xs font-medium border-b-2 null-transition ${
              activeTab === 'network'
                ? 'border-null-text text-null-text'
                : 'border-transparent text-null-muted hover:text-null-text'
            }`}
          >
            Server & Gateway
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto null-scrollbar space-y-4">
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center space-x-4 p-3 bg-null-surface rounded-lg border border-null-border">
                <div className="w-14 h-14 rounded-lg bg-null-panel border border-null-border flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-base font-mono font-bold text-null-text uppercase">
                      {user?.username.slice(0, 2)}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-null-text">@{user?.username}</p>
                  <p className="text-[10px] font-mono text-null-ash">Account UUID: {user?.id.slice(0, 8)}...</p>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-null-muted uppercase tracking-wider block mb-1">
                  Callsign / Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  className="w-full bg-null-surface border border-null-border rounded-lg px-3 py-2 text-xs text-null-text placeholder-null-ash focus:outline-none focus:border-null-borderLight"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-null-muted uppercase tracking-wider block mb-1">
                  Avatar Image URL
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.png"
                  className="w-full bg-null-surface border border-null-border rounded-lg px-3 py-2 text-xs text-null-text placeholder-null-ash focus:outline-none focus:border-null-borderLight"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-null-muted uppercase tracking-wider block mb-1">
                  Status Transmission / Bio
                </label>
                <input
                  type="text"
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  placeholder="e.g. Operating in the shadows"
                  maxLength={120}
                  className="w-full bg-null-surface border border-null-border rounded-lg px-3 py-2 text-xs text-null-text placeholder-null-ash focus:outline-none focus:border-null-borderLight"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                {saveSuccess && (
                  <span className="text-xs font-mono text-null-online flex items-center space-x-1">
                    <Check size={14} />
                    <span>Profile saved</span>
                  </span>
                )}
                <div className="ml-auto">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-null-text text-null-bg hover:opacity-90 disabled:opacity-30 null-transition"
                  >
                    {isSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              {securityMsg && (
                <div
                  className={`p-2.5 rounded text-xs border ${
                    securityMsg.isError
                      ? 'bg-null-danger/10 border-null-danger/30 text-null-danger'
                      : 'bg-null-online/10 border-null-online/30 text-null-online'
                  }`}
                >
                  {securityMsg.text}
                </div>
              )}

              <div>
                <label className="text-[10px] font-mono text-null-muted uppercase tracking-wider block mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full bg-null-surface border border-null-border rounded-lg px-3 py-2 text-xs text-null-text placeholder-null-ash focus:outline-none focus:border-null-borderLight"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-null-muted uppercase tracking-wider block mb-1">
                  New Password (min 8 chars)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full bg-null-surface border border-null-border rounded-lg px-3 py-2 text-xs text-null-text placeholder-null-ash focus:outline-none focus:border-null-borderLight"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-null-muted uppercase tracking-wider block mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-null-surface border border-null-border rounded-lg px-3 py-2 text-xs text-null-text placeholder-null-ash focus:outline-none focus:border-null-borderLight"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-null-text text-null-bg hover:opacity-90 null-transition"
                >
                  Update Password
                </button>
              </div>
            </form>
          )}

          {activeTab === 'network' && (
            <div className="space-y-4">
              <div className="p-3 bg-null-surface rounded-lg border border-null-border space-y-1">
                <span className="text-[10px] font-mono text-null-muted uppercase tracking-wider block">
                  Current Remote Gateway
                </span>
                <p className="text-xs font-mono text-null-text break-all">
                  {currentServerUrl}
                </p>
              </div>

              <div>
                <label className="text-[10px] font-mono text-null-muted uppercase tracking-wider block mb-1">
                  Change Production Server URL
                </label>
                <input
                  type="text"
                  value={serverUrlInput}
                  onChange={(e) => setServerUrlInput(e.target.value)}
                  placeholder="https://null-server.onrender.com"
                  className="w-full bg-null-surface border border-null-border rounded-lg px-3 py-2 text-xs text-null-text focus:outline-none focus:border-null-borderLight"
                />
                <span className="text-[10px] text-null-ash mt-1 block">
                  Point your NULL client to any hosted backend over the internet.
                </span>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('null_server_url');
                    window.location.reload();
                  }}
                  className="px-3 py-2 rounded text-xs text-null-muted hover:text-null-text hover:bg-null-surface"
                >
                  Reset Default
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const clean = serverUrlInput.trim().replace(/\/$/, '');
                    if (clean) {
                      localStorage.setItem('null_server_url', clean);
                    } else {
                      localStorage.removeItem('null_server_url');
                    }
                    window.location.reload();
                  }}
                  className="px-4 py-2 rounded bg-null-text text-null-bg text-xs font-semibold hover:opacity-90"
                >
                  Apply & Reload
                </button>
              </div>
            </div>
          )}

          {/* Danger Zone: Logout */}
          <div className="pt-4 border-t border-null-border">
            <button
              onClick={handleLogout}
              className="w-full py-2 px-3 rounded-lg bg-null-surface hover:bg-null-panel text-null-danger border border-null-border hover:border-null-danger/50 flex items-center justify-center space-x-2 text-xs font-medium null-transition"
            >
              <LogOut size={14} />
              <span>Terminate Session & Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
