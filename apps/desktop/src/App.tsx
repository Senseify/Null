import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { WindowFrame } from './components/layout/WindowFrame';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { ConversationList } from './components/chat/ConversationList';
import { ChatViewport } from './components/chat/ChatViewport';
import { FriendsView } from './components/friends/FriendsView';
import { SettingsModal } from './components/settings/SettingsModal';
import { CreateRoomModal } from './components/rooms/CreateRoomModal';
import { AuthScreen } from './components/auth/AuthScreen';
import { Loader2 } from 'lucide-react';

const MainShell: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { activeTab } = useChat();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="h-full w-full bg-null-bg flex flex-col items-center justify-center">
        <Loader2 size={32} className="animate-spin text-null-muted mb-3" />
        <span className="text-xs font-mono tracking-widest text-null-ash uppercase">
          INITIALIZING NULL PROTOCOL...
        </span>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* 1. Left Nav Rail */}
      <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* 2. Primary Views based on activeTab */}
      {activeTab === 'friends' ? (
        <FriendsView />
      ) : (
        <>
          <ConversationList onOpenCreateRoom={() => setIsCreateRoomOpen(true)} />
          <ChatViewport />
        </>
      )}

      {/* 3. Modals */}
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
      {isCreateRoomOpen && <CreateRoomModal onClose={() => setIsCreateRoomOpen(false)} />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ChatProvider>
        <div className="h-screen w-screen flex flex-col bg-null-bg overflow-hidden font-sans select-none">
          {/* Custom Window Title Bar */}
          <WindowFrame />

          {/* Main Application Shell */}
          <MainShell />

          {/* Bottom Diagnostics / Status Bar */}
          <StatusBar />
        </div>
      </ChatProvider>
    </AuthProvider>
  );
};

export default App;
