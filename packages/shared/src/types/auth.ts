import { User, UserProfile } from './user';

export interface RegisterDTO {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginDTO {
  login: string; // username or email
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: UserProfile;
  tokens: AuthTokens;
}

export interface UpdateProfileDTO {
  displayName?: string;
  avatarUrl?: string | null;
  statusMessage?: string | null;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}
