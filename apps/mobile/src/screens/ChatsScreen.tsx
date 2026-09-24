import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Conversation } from '@null/shared';
import { MobileApiClient } from '../api/client';

export const ChatsScreen: React.FC<{ onSelectChat: (conv: Conversation) => void }> = ({ onSelectChat }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = async () => {
    try {
      const data = await MobileApiClient.get<Conversation[]>('/api/conversations');
      setConversations(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const isRoom = item.type === 'ROOM';
    const title = isRoom ? item.title : item.recipient?.displayName || item.recipient?.username;
    const isOnline = !isRoom && item.recipient?.isOnline;

    return (
      <TouchableOpacity style={styles.item} onPress={() => onSelectChat(item)}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{isRoom ? '#' : (title?.slice(0, 2).toUpperCase() || 'DM')}</Text>
          {!isRoom && (
            <View style={[styles.presenceDot, { backgroundColor: isOnline ? '#10B981' : '#5A5E69' }]} />
          )}
        </View>

        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemTitle}>{title}</Text>
            <Text style={styles.itemTime}>
              {item.lastMessage ? new Date(item.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </Text>
          </View>

          <View style={styles.itemFooter}>
            <Text style={styles.itemSnippet} numberOfLines={1}>
              {item.lastMessage
                ? item.lastMessage.isDeleted
                  ? 'Message deleted'
                  : item.lastMessage.content || 'Shared attachment'
                : isRoom
                ? `${item.members.length} members`
                : `@${item.recipient?.username}`}
            </Text>
            {item.unreadCount ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unreadCount}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F0F1F3" />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No active transmissions</Text>
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
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderColor: '#1E2026',
  },
  avatar: {
    width: 44,
    height: 44,
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
    fontSize: 14,
    fontFamily: 'monospace',
  },
  presenceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#0B0C0E',
    position: 'absolute',
    bottom: -1,
    right: -1,
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemTitle: {
    color: '#F0F1F3',
    fontSize: 14,
    fontWeight: '600',
  },
  itemTime: {
    color: '#5A5E69',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemSnippet: {
    color: '#8E929B',
    fontSize: 12,
    flex: 1,
  },
  badge: {
    backgroundColor: '#F0F1F3',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 8,
  },
  badgeText: {
    color: '#0B0C0E',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#5A5E69',
    fontSize: 13,
  },
});
