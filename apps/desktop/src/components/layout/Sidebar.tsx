import React from 'react';
import { MessageSquare, Users, Hash, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';

interface SidebarProps {
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings }) => {
  const { user } = useAuth();
  const { activeTab, setActiveTab, conversations, friendRequests } = useChat();

  // Calculate total unread count
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const pendingRequestsCount = friendRequests.incoming.length;

  const navItems = [
    {
      id: 'chats',
      label: 'Direct Messages',
      icon: MessageSquare,
      badge: totalUnread > 0 ? totalUnread : null,
    },
    {
      id: 'friends',
      label: 'Friends & Network',
      icon: Users,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : null,
    },
    {
      id: 'rooms',
      label: 'Private Rooms',
      icon: Hash,
      badge: null,
    },
  ];

  return (
    <aside className="w-16 bg-null-charcoal border-r border-null-border flex flex-col items-center py-3 flex-shrink-0 select-none justify-between">
      {/* Top Group: Brand Icon & Navigation */}
      <div className="flex flex-col items-center space-y-4 w-full">
        {/* Brand Geometric Logo */}
        <div className="w-10 h-10 rounded-lg bg-null-surface border border-null-border flex items-center justify-center shadow-md p-1.5 overflow-hidden">
          <img
            src="/logo.png"
            alt="NULL"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-col items-center space-y-2 w-full px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`relative w-11 h-11 rounded-lg flex items-center justify-center null-transition group ${
                  isActive
                    ? 'bg-null-surface text-null-text border border-null-borderLight shadow-sm'
                    : 'text-null-muted hover:text-null-text hover:bg-null-panel'
                }`}
                title={item.label}
              >
                <Icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />

                {/* Badge */}
                {item.badge !== null && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-null-text text-null-bg text-[10px] font-bold rounded-full flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}

                {/* Active Indicator Bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-null-text rounded-r" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Group: Settings & Profile */}
      <div className="flex flex-col items-center space-y-3 w-full px-2">
        <button
          onClick={onOpenSettings}
          className={`w-11 h-11 rounded-lg flex items-center justify-center text-null-muted hover:text-null-text hover:bg-null-panel null-transition ${
            activeTab === 'settings' ? 'bg-null-surface text-null-text border border-null-borderLight' : ''
          }`}
          title="Settings"
        >
          <Settings size={19} />
        </button>

        {/* User Avatar Chip */}
        <button
          onClick={onOpenSettings}
          className="relative w-10 h-10 rounded-lg bg-null-surface border border-null-border overflow-hidden flex items-center justify-center group hover:border-null-borderLight null-transition"
          title={`Signed in as @${user?.username}`}
        >
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-mono font-bold text-null-text uppercase">
              {user?.username?.slice(0, 2) || 'NL'}
            </span>
          )}
          {/* Online Dot */}
          <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-null-online border border-null-charcoal" />
        </button>
      </div>
    </aside>
  );
};
