import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { MobileApiClient } from '../api/client';

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [statusMessage, setStatusMessage] = useState(user?.statusMessage || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await MobileApiClient.put('/api/auth/profile', {
        displayName: displayName.trim(),
        statusMessage: statusMessage.trim() || null,
      });
      Alert.alert('Profile', 'Profile updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.username.slice(0, 2).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user?.displayName}</Text>
        <Text style={styles.handle}>@{user?.username}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Callsign / Display Name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Display Name"
          placeholderTextColor="#5A5E69"
        />

        <Text style={styles.label}>Transmission / Status Bio</Text>
        <TextInput
          style={styles.input}
          value={statusMessage}
          onChangeText={setStatusMessage}
          placeholder="Status message..."
          placeholderTextColor="#5A5E69"
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Profile'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>Log Out Session</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0C0E',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderColor: '#1E2026',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#1E2026',
    borderWidth: 1,
    borderColor: '#252830',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#F0F1F3',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  name: {
    color: '#F0F1F3',
    fontSize: 16,
    fontWeight: 'bold',
  },
  handle: {
    color: '#5A5E69',
    fontSize: 12,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  form: {
    marginTop: 20,
  },
  label: {
    color: '#8E929B',
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#121316',
    borderColor: '#252830',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    color: '#F0F1F3',
    fontSize: 13,
    marginBottom: 14,
  },
  saveBtn: {
    backgroundColor: '#F0F1F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#0B0C0E',
    fontWeight: 'bold',
    fontSize: 13,
  },
  logoutBtn: {
    backgroundColor: '#1E2026',
    borderColor: '#EF4444',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
});
