import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserProfile, RegisterDTO, LoginDTO } from '@null/shared';
import { MobileApiClient } from '../api/client';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (data: LoginDTO) => Promise<void>;
  register: (data: RegisterDTO) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const login = async (data: LoginDTO) => {
    setIsLoading(true);
    try {
      const res = await MobileApiClient.post<{ user: UserProfile; tokens: { accessToken: string } }>(
        '/api/auth/login',
        data
      );
      MobileApiClient.setToken(res.tokens.accessToken);
      setToken(res.tokens.accessToken);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterDTO) => {
    setIsLoading(true);
    try {
      const res = await MobileApiClient.post<{ user: UserProfile; tokens: { accessToken: string } }>(
        '/api/auth/register',
        data
      );
      MobileApiClient.setToken(res.tokens.accessToken);
      setToken(res.tokens.accessToken);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await MobileApiClient.post('/api/auth/logout');
    } catch (e) {}
    MobileApiClient.setToken(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
