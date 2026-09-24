import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Conversation } from '@null/shared';
import { MobileApiClient } from '../api/client';

export const RoomsScreen: React.FC<{ onSelectRoom: (conv: Conversation) => void }> = ({ onSelectRoom }) => {
  const [rooms, setRooms] = useState<Conversation[]>([]);
  const [roomTitle, setRoomTitle] = useState('');
  const [roomDesc, setRoomDesc] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const loadRooms = async () => {
    try {
      const data = await MobileApiClient.get<Conversation[]>('/api/conversations');
      setRooms(data.filter((c) => c.type === 'ROOM'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleCreate = async () => {
    if (!roomTitle.trim()) return;
    try {
      const newRoom = await MobileApiClient.post<Conversation>('/api/conversations/rooms', {
        title: roomTitle.trim(),
        description: roomDesc.trim() || undefined,
      });
      setRoomTitle('');
      setRoomDesc('');
      setShowCreate(false);
      onSelectRoom(newRoom);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create room');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.headerText}>Private Rooms</Text>
        <TouchableOpacity style={styles.newButton} onPress={() => setShowCreate(!showCreate)}>
          <Text style={styles.newButtonText}>{showCreate ? 'Close' : '+ New Room'}</Text>
        </TouchableOpacity>
      </View>

      {showCreate && (
        <View style={styles.createCard}>
          <TextInput
            style={styles.input}
            placeholder="Room Title..."
            placeholderTextColor="#5A5E69"
            value={roomTitle}
            onChangeText={setRoomTitle}
          />
          <TextInput
            style={styles.input}
            placeholder="Description..."
            placeholderTextColor="#5A5E69"
            value={roomDesc}
            onChangeText={setRoomDesc}
          />
          <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
            <Text style={styles.createBtnText}>Establish Room</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => onSelectRoom(item)}>
            <View style={styles.hashBadge}>
              <Text style={styles.hashText}>#</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.desc}>{item.description || `${item.members.length} members`}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No private rooms joined</Text>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderColor: '#1E2026',
    backgroundColor: '#121316',
  },
  headerText: {
    color: '#F0F1F3',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
  },
  newButton: {
    backgroundColor: '#1E2026',
    borderWidth: 1,
    borderColor: '#252830',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  newButtonText: {
    color: '#F0F1F3',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  createCard: {
    padding: 14,
    backgroundColor: '#121316',
    borderBottomWidth: 1,
    borderColor: '#252830',
  },
  input: {
    backgroundColor: '#1E2026',
    borderColor: '#252830',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#F0F1F3',
    fontSize: 12,
    marginBottom: 8,
  },
  createBtn: {
    backgroundColor: '#F0F1F3',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  createBtnText: {
    color: '#0B0C0E',
    fontWeight: 'bold',
    fontSize: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderColor: '#1E2026',
  },
  hashBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1E2026',
    borderWidth: 1,
    borderColor: '#252830',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hashText: {
    color: '#8E929B',
    fontWeight: 'bold',
    fontSize: 16,
  },
  info: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    color: '#F0F1F3',
    fontSize: 13,
    fontWeight: '600',
  },
  desc: {
    color: '#5A5E69',
    fontSize: 11,
    marginTop: 2,
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
