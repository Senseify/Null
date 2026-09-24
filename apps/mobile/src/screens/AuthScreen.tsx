import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';

export const AuthScreen: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (isRegister) {
        if (!username || !email || !password) throw new Error('All fields are required');
        await register({ username, email, password, displayName: displayName || username });
      } else {
        if (!identifier || !password) throw new Error('Enter username/email and password');
        await login({ login: identifier, password });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.brandTitle}>NULL</Text>
        <Text style={styles.brandSubtitle}>
          {isRegister ? 'OPERATOR ENROLLMENT' : 'SECURE ACCESS'}
        </Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {isRegister ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#5A5E69"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Display Name"
              placeholderTextColor="#5A5E69"
              value={displayName}
              onChangeText={setDisplayName}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#5A5E69"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </>
        ) : (
          <TextInput
            style={styles.input}
            placeholder="Username or Email"
            placeholderTextColor="#5A5E69"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#5A5E69"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#0B0C0E" />
          ) : (
            <Text style={styles.buttonText}>{isRegister ? 'Register' : 'Log In'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsRegister(!isRegister)} style={styles.switchButton}>
          <Text style={styles.switchText}>
            {isRegister ? 'Existing operator? Log In' : 'No account? Create one'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0C0E',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#121316',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#252830',
    padding: 24,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    color: '#F0F1F3',
    textAlign: 'center',
    letterSpacing: 3,
  },
  brandSubtitle: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#5A5E69',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#1E2026',
    borderColor: '#252830',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: '#F0F1F3',
    fontSize: 14,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#F0F1F3',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#0B0C0E',
    fontSize: 14,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchText: {
    color: '#8E929B',
    fontSize: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
});
