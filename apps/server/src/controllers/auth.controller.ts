import { Request, Response } from 'express';
import { getDatabaseClient } from '@null/database';
import {
  hashPassword,
  comparePassword,
  generateTokens,
  hashToken,
} from '../utils/security';
import { RegisterDTO, LoginDTO, UpdateProfileDTO, ChangePasswordDTO, UserProfile } from '@null/shared';

export async function register(req: Request, res: Response): Promise<void> {
  const { username, email, password, displayName }: RegisterDTO = req.body;

  // Validation
  if (!username || !email || !password) {
    res.status(400).json({
      success: false,
      error: 'Username, email, and password are required.',
      statusCode: 400,
    });
    return;
  }

  const cleanUsername = username.trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();

  if (cleanUsername.length < 3 || cleanUsername.length > 30) {
    res.status(400).json({
      success: false,
      error: 'Username must be between 3 and 30 characters.',
      statusCode: 400,
    });
    return;
  }

  if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
    res.status(400).json({
      success: false,
      error: 'Username can only contain alphanumeric characters and underscores.',
      statusCode: 400,
    });
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    res.status(400).json({
      success: false,
      error: 'Please provide a valid email address.',
      statusCode: 400,
    });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters long.',
      statusCode: 400,
    });
    return;
  }

  const db = getDatabaseClient();

  // Check uniqueness
  const existingUser = await db.query(
    'SELECT id, username, email FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $2',
    [cleanUsername, cleanEmail]
  );

  if (existingUser.rows.length > 0) {
    const existing = existingUser.rows[0];
    const field = existing.username.toLowerCase() === cleanUsername ? 'Username' : 'Email';
    res.status(409).json({
      success: false,
      error: `${field} is already registered.`,
      statusCode: 409,
    });
    return;
  }

  // Hash password
  const passwordHash = await hashPassword(password);
  const finalDisplayName = (displayName && displayName.trim()) || username.trim();

  // Insert user
  const result = await db.query(
    `INSERT INTO users (username, display_name, email, password_hash, is_online)
     VALUES ($1, $2, $3, $4, TRUE)
     RETURNING id, username, display_name, email, avatar_url, status_message, is_online, last_seen_at, created_at`,
    [cleanUsername, finalDisplayName, cleanEmail, passwordHash]
  );

  const newUser = result.rows[0];
  const tokens = generateTokens(newUser.id, newUser.username);

  // Store session
  const tokenHash = hashToken(tokens.refreshToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await db.query(
    `INSERT INTO sessions (user_id, token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [newUser.id, tokenHash, req.headers['user-agent'] || null, req.ip || null, expiresAt]
  );

  const userProfile: UserProfile = {
    id: newUser.id,
    username: newUser.username,
    displayName: newUser.display_name,
    avatarUrl: newUser.avatar_url,
    statusMessage: newUser.status_message,
    isOnline: true,
    presenceStatus: 'ONLINE',
    lastSeenAt: newUser.last_seen_at,
    createdAt: newUser.created_at,
  };

  res.status(201).json({
    success: true,
    data: {
      user: userProfile,
      tokens,
    },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { login: identifier, password }: LoginDTO = req.body;

  if (!identifier || !password) {
    res.status(400).json({
      success: false,
      error: 'Username/email and password are required.',
      statusCode: 400,
    });
    return;
  }

  const cleanIdentifier = identifier.trim().toLowerCase();
  const db = getDatabaseClient();

  const result = await db.query(
    `SELECT id, username, display_name, email, password_hash, avatar_url, status_message, is_online, last_seen_at, created_at
     FROM users
     WHERE LOWER(username) = $1 OR LOWER(email) = $1`,
    [cleanIdentifier]
  );

  if (result.rows.length === 0) {
    res.status(401).json({
      success: false,
      error: 'Invalid username/email or password.',
      statusCode: 401,
    });
    return;
  }

  const user = result.rows[0];
  const isMatch = await comparePassword(password, user.password_hash);

  if (!isMatch) {
    res.status(401).json({
      success: false,
      error: 'Invalid username/email or password.',
      statusCode: 401,
    });
    return;
  }

  // Update online status
  await db.query('UPDATE users SET is_online = TRUE, last_seen_at = CURRENT_TIMESTAMP WHERE id = $1', [
    user.id,
  ]);

  const tokens = generateTokens(user.id, user.username);
  const tokenHash = hashToken(tokens.refreshToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.query(
    `INSERT INTO sessions (user_id, token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [user.id, tokenHash, req.headers['user-agent'] || null, req.ip || null, expiresAt]
  );

  const userProfile: UserProfile = {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    statusMessage: user.status_message,
    isOnline: true,
    presenceStatus: 'ONLINE',
    lastSeenAt: new Date().toISOString(),
    createdAt: user.created_at,
  };

  res.status(200).json({
    success: true,
    data: {
      user: userProfile,
      tokens,
    },
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(200).json({ success: true, message: 'Logged out.' });
    return;
  }

  const db = getDatabaseClient();
  await db.query('UPDATE users SET is_online = FALSE, last_seen_at = CURRENT_TIMESTAMP WHERE id = $1', [
    userId,
  ]);

  // Clean up sessions for this user
  await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);

  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
}

export async function me(req: Request, res: Response): Promise<void> {
  res.status(200).json({
    success: true,
    data: req.user,
  });
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized', statusCode: 401 });
    return;
  }

  const { displayName, avatarUrl, statusMessage }: UpdateProfileDTO = req.body;
  const db = getDatabaseClient();

  const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
  const values: any[] = [];
  let paramIdx = 1;

  if (displayName !== undefined) {
    updates.push(`display_name = $${paramIdx++}`);
    values.push(displayName.trim());
  }

  if (avatarUrl !== undefined) {
    updates.push(`avatar_url = $${paramIdx++}`);
    values.push(avatarUrl);
  }

  if (statusMessage !== undefined) {
    updates.push(`status_message = $${paramIdx++}`);
    values.push(statusMessage);
  }

  values.push(userId);

  const query = `
    UPDATE users
    SET ${updates.join(', ')}
    WHERE id = $${paramIdx}
    RETURNING id, username, display_name, email, avatar_url, status_message, is_online, last_seen_at, created_at
  `;

  const result = await db.query(query, values);
  const updated = result.rows[0];

  const profile: UserProfile = {
    id: updated.id,
    username: updated.username,
    displayName: updated.display_name,
    avatarUrl: updated.avatar_url,
    statusMessage: updated.status_message,
    isOnline: updated.is_online,
    presenceStatus: updated.is_online ? 'ONLINE' : 'OFFLINE',
    lastSeenAt: updated.last_seen_at,
    createdAt: updated.created_at,
  };

  res.status(200).json({
    success: true,
    data: profile,
  });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: 'Unauthorized', statusCode: 401 });
    return;
  }

  const { currentPassword, newPassword }: ChangePasswordDTO = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ success: false, error: 'Current and new password are required.', statusCode: 400 });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ success: false, error: 'New password must be at least 8 characters.', statusCode: 400 });
    return;
  }

  const db = getDatabaseClient();
  const userRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (userRes.rows.length === 0) {
    res.status(404).json({ success: false, error: 'User not found.', statusCode: 404 });
    return;
  }

  const isMatch = await comparePassword(currentPassword, userRes.rows[0].password_hash);
  if (!isMatch) {
    res.status(400).json({ success: false, error: 'Incorrect current password.', statusCode: 400 });
    return;
  }

  const newHash = await hashPassword(newPassword);
  await db.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
    newHash,
    userId,
  ]);

  res.status(200).json({
    success: true,
    message: 'Password updated successfully.',
  });
}
