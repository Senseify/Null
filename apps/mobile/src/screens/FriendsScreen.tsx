import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Friend, Conversation } from '@null/shared';
import { MobileApiClient } from '../api/client';

export const FriendsScreen: React.FC<{ onStartChat: (conv: Conversation) => void }> = ({ onStartChat }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [targetUsername, setTargetUsername] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const loadFriends = async () => {
    try {
      const data = await MobileApiClient.get<Friend[]>('/api/friends/list');
      setFriends(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadFriends();
  }, []);

  const handleSendRequest = async () => {
    if (!targetUsername.trim()) return;
    try {
      await MobileApiClient.post('/api/friends/request', { targetUsername: targetUsername.trim() });
      setStatusMsg(`Request sent to @${targetUsername.trim()}`);
      setTargetUsername('');
    } catch (err: any) {
      setStatusMsg(err.message || 'Failed to send request');
    }
  };

  const handleOpenChat = async (userId: string) => {
    try {
      const conv = await MobileApiClient.post<Conversation>('/api/conversations/direct', { targetUserId: userId });
      onStartChat(conv);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <View style={styles.container}>
      {/* Search / Add Bar */}
      <View style={styles.addBar}>
        <TextInput
          style={styles.addInput}
          placeholder="Send friend request by @username..."
          placeholderTextColor="#5A5E69"
          value={targetUsername}
          onChangeText={setTargetUsername}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.addButton} onPress={handleSendRequest}>
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {statusMsg ? <Text style={styles.statusText}>{statusMsg}</Text> : null}

      {/* Friends List */}
      <FlatList
        data={friends}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => handleOpenChat(item.user.id)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.user.username.slice(0, 2).toUpperCase()}</Text>
              <View
                style={[
                  styles.presenceDot,
                  { backgroundColor: item.user.isOnline ? '#10B981' : '#5A5E69' },
                ]}
              />
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.user.displayName}</Text>
              <Text style={styles.handle}>@{item.user.username}</Text>
            </View>
            <Text style={styles.actionText}>Chat →</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No connected operators yet</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0C0E',
  },
  addBar: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#1E2026',
    backgroundColor: '#121316',
  },
  addInput: {
    flex: 1,
    backgroundColor: '#1E2026',
    borderColor: '#252830',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#F0F1F3',
    fontSize: 12,
  },
  addButton: {
    marginLeft: 8,
    backgroundColor: '#F0F1F3',
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 6,
  },
  addButtonText: {
    color: '#0B0C0E',
    fontWeight: 'bold',
    fontSize: 12,
  },
  statusText: {
    color: '#10B981',
    fontSize: 11,
    fontFamily: 'monospace',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#1E2026',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#1E2026',
    borderWidth: 1,
    borderColor: '#252830',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarText: {
    color: '#F0F1F3',
    fontWeight: 'bold',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  presenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#0B0C0E',
    position: 'absolute',
    bottom: -1,
    right: -1,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    color: '#F0F1F3',
    fontSize: 13,
    fontWeight: '600',
  },
  handle: {
    color: '#5A5E69',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  actionText: {
    color: '#8E929B',
    fontSize: 12,
  },
  empty: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#5A5E69',
    fontSize: 12,
  },
});
