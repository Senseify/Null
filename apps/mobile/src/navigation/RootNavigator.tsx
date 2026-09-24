import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { AuthScreen } from '../screens/AuthScreen';
import { ChatsScreen } from '../screens/ChatsScreen';
import { ChatDetailScreen } from '../screens/ChatDetailScreen';
import { FriendsScreen } from '../screens/FriendsScreen';
import { RoomsScreen } from '../screens/RoomsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { Conversation } from '@null/shared';

export const RootNavigator: React.FC = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<'chats' | 'friends' | 'rooms' | 'profile'>('chats');
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#0B0C0E" />
        <AuthScreen />
      </SafeAreaView>
    );
  }

  if (activeChat) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#121316" />
        <ChatDetailScreen conversation={activeChat} onBack={() => setActiveChat(null)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0C0E" />
      <View style={styles.content}>
        {currentTab === 'chats' && <ChatsScreen onSelectChat={(c) => setActiveChat(c)} />}
        {currentTab === 'friends' && <FriendsScreen onStartChat={(c) => setActiveChat(c)} />}
        {currentTab === 'rooms' && <RoomsScreen onSelectRoom={(c) => setActiveChat(c)} />}
        {currentTab === 'profile' && <ProfileScreen />}
      </View>

      {/* Mobile Bottom Navigation Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, currentTab === 'chats' && styles.activeTab]}
          onPress={() => setCurrentTab('chats')}
        >
          <Text style={[styles.tabText, currentTab === 'chats' && styles.activeTabText]}>Chats</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, currentTab === 'friends' && styles.activeTab]}
          onPress={() => setCurrentTab('friends')}
        >
          <Text style={[styles.tabText, currentTab === 'friends' && styles.activeTabText]}>Friends</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, currentTab === 'rooms' && styles.activeTab]}
          onPress={() => setCurrentTab('rooms')}
        >
          <Text style={[styles.tabText, currentTab === 'rooms' && styles.activeTabText]}>Rooms</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, currentTab === 'profile' && styles.activeTab]}
          onPress={() => setCurrentTab('profile')}
        >
          <Text style={[styles.tabText, currentTab === 'profile' && styles.activeTabText]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0B0C0E',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    height: 54,
    backgroundColor: '#121316',
    borderTopWidth: 1,
    borderColor: '#252830',
    flexDirection: 'row',
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTab: {
    borderTopWidth: 2,
    borderTopColor: '#F0F1F3',
  },
  tabText: {
    color: '#8E929B',
    fontSize: 12,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#F0F1F3',
    fontWeight: 'bold',
  },
});
