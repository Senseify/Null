import React, { useState, useEffect } from 'react';
import { Search, UserCheck, UserX, MessageSquare, Clock, UserPlus, Check, X, Shield } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { ApiClient } from '../../api/client';

export const FriendsView: React.FC = () => {
  const {
    friends,
    friendRequests,
    respondFriendRequest,
    removeFriend,
    startDirectChat,
    sendFriendRequest,
  } = useChat();

  const [subTab, setSubTab] = useState<'online' | 'all' | 'pending' | 'add'>('online');
  const [searchQuery, setSearchQuery] = useState('');
  const [addUsername, setAddUsername] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [requestSentMap, setRequestSentMap] = useState<Record<string, boolean>>({});

  // Online and All friends lists
  const onlineFriends = friends.filter((f) => f.user.isOnline);
  const displayFriends = subTab === 'online' ? onlineFriends : friends;
  const filteredFriends = displayFriends.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.user.displayName.toLowerCase().includes(q) ||
      f.user.username.toLowerCase().includes(q)
    );
  });

  // Search users for Add Friend tab
  useEffect(() => {
    if (subTab !== 'add' || addUsername.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const users = await ApiClient.get<any[]>(`/api/friends/search?q=${encodeURIComponent(addUsername.trim())}`);
        setSearchResults(users);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [addUsername, subTab]);

  const handleSendRequest = async (username: string) => {
    try {
      await sendFriendRequest(username);
      setRequestSentMap((prev) => ({ ...prev, [username]: true }));
    } catch (err: any) {
      alert(err.message || 'Failed to send friend request');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-null-bg overflow-hidden select-none">
      {/* Top Header & Subtabs */}
      <div className="h-14 px-6 bg-null-charcoal border-b border-null-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-6">
          <span className="text-xs font-mono font-bold tracking-wider text-null-text uppercase">
            Friends Directory
          </span>

          <div className="flex items-center space-x-1 bg-null-surface p-1 rounded-lg border border-null-border">
            <button
              onClick={() => setSubTab('online')}
              className={`px-3 py-1 rounded-md text-xs font-medium null-transition ${
                subTab === 'online'
                  ? 'bg-null-panel text-null-text border border-null-borderLight'
                  : 'text-null-muted hover:text-null-text'
              }`}
            >
              Online ({onlineFriends.length})
            </button>
            <button
              onClick={() => setSubTab('all')}
              className={`px-3 py-1 rounded-md text-xs font-medium null-transition ${
                subTab === 'all'
                  ? 'bg-null-panel text-null-text border border-null-borderLight'
                  : 'text-null-muted hover:text-null-text'
              }`}
            >
              All ({friends.length})
            </button>
            <button
              onClick={() => setSubTab('pending')}
              className={`relative px-3 py-1 rounded-md text-xs font-medium null-transition ${
                subTab === 'pending'
                  ? 'bg-null-panel text-null-text border border-null-borderLight'
                  : 'text-null-muted hover:text-null-text'
              }`}
            >
              Pending
              {friendRequests.incoming.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-null-text text-null-bg text-[10px] font-bold rounded-full">
                  {friendRequests.incoming.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setSubTab('add')}
              className={`px-3 py-1 rounded-md text-xs font-medium null-transition ${
                subTab === 'add'
                  ? 'bg-null-text text-null-bg'
                  : 'text-null-text hover:bg-null-panel'
              }`}
            >
              Add Friend
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto null-scrollbar p-6">
        {subTab === 'add' ? (
          /* Add Friend Screen */
          <div className="max-w-xl mx-auto space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-null-text">Add Friend to Network</h3>
              <p className="text-xs text-null-muted">
                You can search and invite other operators using their unique NULL username.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-null-ash" />
              <input
                type="text"
                value={addUsername}
                onChange={(e) => setAddUsername(e.target.value)}
                placeholder="Enter username..."
                className="w-full bg-null-surface border border-null-border rounded-lg pl-9 pr-4 py-2.5 text-xs text-null-text placeholder-null-ash focus:outline-none focus:border-null-borderLight null-transition font-sans"
              />
            </div>

            {/* Search Results */}
            <div className="space-y-2">
              {isSearching && (
                <p className="text-xs text-null-ash font-mono text-center py-4">Scanning user directory...</p>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-null-ash uppercase tracking-wider block">
                    Discovered Peers ({searchResults.length})
                  </span>
                  {searchResults.map((target) => (
                    <div
                      key={target.id}
                      className="p-3 bg-null-charcoal border border-null-border rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-null-surface border border-null-border flex items-center justify-center font-mono font-bold text-xs text-null-text">
                          {target.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-null-text">{target.displayName}</p>
                          <p className="text-[10px] font-mono text-null-ash">@{target.username}</p>
                        </div>
                      </div>

                      {target.isFriend ? (
                        <span className="text-[11px] font-mono text-null-online px-2.5 py-1 bg-null-surface rounded border border-null-border">
                          CONNECTED
                        </span>
                      ) : target.requestStatus === 'PENDING' || requestSentMap[target.username] ? (
                        <span className="text-[11px] font-mono text-null-muted px-2.5 py-1 bg-null-surface rounded border border-null-border flex items-center space-x-1">
                          <Clock size={12} />
                          <span>REQUEST PENDING</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(target.username)}
                          className="px-3 py-1.5 bg-null-text text-null-bg hover:opacity-90 rounded-md text-xs font-medium null-transition flex items-center space-x-1.5"
                        >
                          <UserPlus size={14} />
                          <span>Send Request</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!isSearching && addUsername.trim().length >= 2 && searchResults.length === 0 && (
                <div className="p-8 text-center bg-null-charcoal/50 rounded-lg border border-null-border text-null-muted text-xs">
                  No operator found matching "@{addUsername.trim()}".
                </div>
              )}
            </div>
          </div>
        ) : subTab === 'pending' ? (
          /* Pending Requests Screen */
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Incoming Requests */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-null-ash uppercase tracking-wider block">
                Incoming Requests ({friendRequests.incoming.length})
              </span>

              {friendRequests.incoming.length === 0 ? (
                <p className="text-xs text-null-ash italic py-2">No pending incoming requests.</p>
              ) : (
                friendRequests.incoming.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 bg-null-charcoal border border-null-border rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-null-surface border border-null-border flex items-center justify-center font-mono font-bold text-xs text-null-text">
                        {req.sender?.username?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-null-text">{req.sender?.displayName}</p>
                        <p className="text-[10px] font-mono text-null-ash">@{req.sender?.username}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => respondFriendRequest(req.id, 'ACCEPT')}
                        className="px-3 py-1.5 bg-null-text text-null-bg hover:opacity-90 rounded-md text-xs font-medium null-transition flex items-center space-x-1"
                      >
                        <Check size={14} />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => respondFriendRequest(req.id, 'REJECT')}
                        className="px-3 py-1.5 bg-null-surface hover:bg-null-panel text-null-muted hover:text-null-text border border-null-border rounded-md text-xs font-medium null-transition flex items-center space-x-1"
                      >
                        <X size={14} />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Outgoing Requests */}
            <div className="space-y-3 pt-4 border-t border-null-border">
              <span className="text-[10px] font-mono text-null-ash uppercase tracking-wider block">
                Outgoing Requests ({friendRequests.outgoing.length})
              </span>

              {friendRequests.outgoing.length === 0 ? (
                <p className="text-xs text-null-ash italic py-2">No pending outgoing requests.</p>
              ) : (
                friendRequests.outgoing.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 bg-null-charcoal border border-null-border rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-lg bg-null-surface border border-null-border flex items-center justify-center font-mono font-bold text-xs text-null-text">
                        {req.receiver?.username?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-null-text">{req.receiver?.displayName}</p>
                        <p className="text-[10px] font-mono text-null-ash">@{req.receiver?.username}</p>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono text-null-ash px-2 py-0.5 rounded bg-null-surface border border-null-border flex items-center space-x-1">
                      <Clock size={11} />
                      <span>WAITING RESPONSE</span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Online or All Friends List */
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Filter Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-null-ash" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter network contacts..."
                className="w-full bg-null-surface border border-null-border rounded-lg pl-9 pr-4 py-2 text-xs text-null-text placeholder-null-ash focus:outline-none focus:border-null-borderLight null-transition font-sans"
              />
            </div>

            {filteredFriends.length === 0 ? (
              <div className="p-12 text-center text-null-ash bg-null-charcoal/40 rounded-lg border border-null-border">
                <p className="text-xs text-null-muted">
                  {subTab === 'online' ? 'No friends currently online.' : 'No friends in network.'}
                </p>
                <button
                  onClick={() => setSubTab('add')}
                  className="mt-3 px-3 py-1.5 bg-null-surface hover:bg-null-panel text-null-text rounded border border-null-border text-xs null-transition"
                >
                  Add Friends
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredFriends.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 bg-null-charcoal border border-null-border hover:border-null-borderLight rounded-lg flex items-center justify-between null-transition"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="relative w-10 h-10 rounded-lg bg-null-surface border border-null-border flex items-center justify-center overflow-hidden flex-shrink-0">
                        {f.user.avatarUrl ? (
                          <img src={f.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-mono font-bold text-null-text uppercase">
                            {f.user.username.slice(0, 2)}
                          </span>
                        )}
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-null-charcoal ${
                            f.user.isOnline ? 'bg-null-online' : 'bg-null-ash'
                          }`}
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-null-text truncate">{f.user.displayName}</p>
                        <p className="text-[10px] font-mono text-null-ash">@{f.user.username}</p>
                        {f.user.statusMessage && (
                          <p className="text-[10px] text-null-muted truncate mt-0.5">{f.user.statusMessage}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                      <button
                        onClick={() => startDirectChat(f.user.id)}
                        className="p-2 rounded bg-null-surface hover:bg-null-panel text-null-text border border-null-border hover:border-null-borderLight null-transition"
                        title="Transmit Message"
                      >
                        <MessageSquare size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove @${f.user.username}?`)) {
                            removeFriend(f.user.id);
                          }
                        }}
                        className="p-2 rounded bg-null-surface hover:bg-null-panel text-null-muted hover:text-null-danger border border-null-border null-transition"
                        title="Disconnect Friend"
                      >
                        <UserX size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
