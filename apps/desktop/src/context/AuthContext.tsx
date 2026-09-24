import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, RegisterDTO, LoginDTO, UpdateProfileDTO } from '@null/shared';
import { ApiClient } from '../api/client';
import { socketService } from '../services/socket.service';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (data: LoginDTO) => Promise<void>;
  register: (data: RegisterDTO) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfileDTO) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(ApiClient.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore authenticated session on mount
  useEffect(() => {
    async function initAuth() {
      const storedToken = ApiClient.getToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const userProfile = await ApiClient.get<UserProfile>('/api/auth/me');
        setUser(userProfile);
        setToken(storedToken);
        socketService.connect(storedToken);
      } catch (err) {
        console.warn('[Auth] Stored session invalid, logging out');
        ApiClient.setToken(null);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (data: LoginDTO) => {
    setIsLoading(true);
    try {
      const res = await ApiClient.post<{ user: UserProfile; tokens: { accessToken: string } }>(
        '/api/auth/login',
        data
      );
      ApiClient.setToken(res.tokens.accessToken);
      setToken(res.tokens.accessToken);
      setUser(res.user);
      socketService.connect(res.tokens.accessToken);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterDTO) => {
    setIsLoading(true);
    try {
      const res = await ApiClient.post<{ user: UserProfile; tokens: { accessToken: string } }>(
        '/api/auth/register',
        data
      );
      ApiClient.setToken(res.tokens.accessToken);
      setToken(res.tokens.accessToken);
      setUser(res.user);
      socketService.connect(res.tokens.accessToken);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await ApiClient.post('/api/auth/logout');
    } catch (e) {}
    socketService.disconnect();
    ApiClient.setToken(null);
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data: UpdateProfileDTO) => {
    const updated = await ApiClient.put<UserProfile>('/api/auth/profile', data);
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
