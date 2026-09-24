import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/security';
import { getDatabaseClient } from '@null/database';
import { UserProfile } from '@null/shared';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: UserProfile;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. No token provided.',
      statusCode: 401,
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyAccessToken(token);

  if (!payload) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired session token.',
      statusCode: 401,
    });
    return;
  }

  try {
    const db = getDatabaseClient();
    const result = await db.query(
      `SELECT id, username, display_name, email, avatar_url, status_message, is_online, last_seen_at, created_at
       FROM users WHERE id = $1`,
      [payload.userId]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        error: 'User account not found.',
        statusCode: 401,
      });
      return;
    }

    const row = result.rows[0];
    req.user = {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      statusMessage: row.status_message,
      isOnline: row.is_online,
      presenceStatus: row.is_online ? 'ONLINE' : 'OFFLINE',
      lastSeenAt: row.last_seen_at,
      createdAt: row.created_at,
    };

    next();
  } catch (err) {
    console.error('[Auth Middleware Error]', err);
    res.status(500).json({
      success: false,
      error: 'Failed to authenticate user.',
      statusCode: 500,
    });
  }
}
