import { Request, Response } from 'express';
import { getDatabaseClient } from '@null/database';
import { UserProfile, Friend, FriendRequest } from '@null/shared';
import { getSocketManager } from '../sockets/socket.manager';
import { SOCKET_EVENTS } from '@null/shared';

export async function searchUsers(req: Request, res: Response): Promise<void> {
  const currentUserId = req.user!.id;
  const query = (req.query.q as string || '').trim().toLowerCase();

  if (!query || query.length < 2) {
    res.status(200).json({ success: true, data: [] });
    return;
  }

  const db = getDatabaseClient();
  const result = await db.query(
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.status_message, u.is_online, u.last_seen_at, u.created_at,
            EXISTS (
              SELECT 1 FROM friendships f WHERE f.user_id = $1 AND f.friend_id = u.id
            ) AS is_friend,
            (
              SELECT fr.status FROM friend_requests fr
              WHERE (fr.sender_id = $1 AND fr.receiver_id = u.id)
                 OR (fr.sender_id = u.id AND fr.receiver_id = $1)
              ORDER BY fr.created_at DESC LIMIT 1
            ) AS request_status,
            (
              SELECT fr.sender_id FROM friend_requests fr
              WHERE (fr.sender_id = $1 AND fr.receiver_id = u.id)
                 OR (fr.sender_id = u.id AND fr.receiver_id = $1)
              ORDER BY fr.created_at DESC LIMIT 1
            ) AS request_sender_id
     FROM users u
     WHERE u.id <> $1
       AND (LOWER(u.username) LIKE $2 OR LOWER(u.display_name) LIKE $2)
     LIMIT 20`,
    [currentUserId, `%${query}%`]
  );

  const users = result.rows.map((row) => ({
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    statusMessage: row.status_message,
    isOnline: row.is_online,
    presenceStatus: row.is_online ? 'ONLINE' : 'OFFLINE',
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    isFriend: Boolean(row.is_friend),
    requestStatus: row.request_status || null,
    isRequestSender: row.request_sender_id === currentUserId,
  }));

  res.status(200).json({
    success: true,
    data: users,
  });
}

export async function getFriends(req: Request, res: Response): Promise<void> {
  const currentUserId = req.user!.id;
  const db = getDatabaseClient();

  const result = await db.query(
    `SELECT f.id AS friendship_id, f.created_at AS since,
            u.id, u.username, u.display_name, u.avatar_url, u.status_message, u.is_online, u.last_seen_at, u.created_at
     FROM friendships f
     JOIN users u ON u.id = f.friend_id
     WHERE f.user_id = $1
     ORDER BY u.is_online DESC, u.username ASC`,
    [currentUserId]
  );

  const friends: Friend[] = result.rows.map((row) => ({
    id: row.friendship_id,
    since: row.since,
    user: {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      statusMessage: row.status_message,
      isOnline: row.is_online,
      presenceStatus: row.is_online ? 'ONLINE' : 'OFFLINE',
      lastSeenAt: row.last_seen_at,
      createdAt: row.created_at,
    },
  }));

  res.status(200).json({
    success: true,
    data: friends,
  });
}

export async function getFriendRequests(req: Request, res: Response): Promise<void> {
  const currentUserId = req.user!.id;
  const db = getDatabaseClient();

  // Incoming
  const incomingRes = await db.query(
    `SELECT fr.id, fr.sender_id, fr.receiver_id, fr.status, fr.created_at, fr.updated_at,
            u.id AS u_id, u.username, u.display_name, u.avatar_url, u.status_message, u.is_online, u.last_seen_at, u.created_at AS u_created
     FROM friend_requests fr
     JOIN users u ON u.id = fr.sender_id
     WHERE fr.receiver_id = $1 AND fr.status = 'PENDING'
     ORDER BY fr.created_at DESC`,
    [currentUserId]
  );

  // Outgoing
  const outgoingRes = await db.query(
    `SELECT fr.id, fr.sender_id, fr.receiver_id, fr.status, fr.created_at, fr.updated_at,
            u.id AS u_id, u.username, u.display_name, u.avatar_url, u.status_message, u.is_online, u.last_seen_at, u.created_at AS u_created
     FROM friend_requests fr
     JOIN users u ON u.id = fr.receiver_id
     WHERE fr.sender_id = $1 AND fr.status = 'PENDING'
     ORDER BY fr.created_at DESC`,
    [currentUserId]
  );

  const mapRequest = (row: any, isIncoming: boolean): FriendRequest => ({
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sender: isIncoming
      ? {
          id: row.u_id,
          username: row.username,
          displayName: row.display_name,
          avatarUrl: row.avatar_url,
          statusMessage: row.status_message,
          isOnline: row.is_online,
          presenceStatus: row.is_online ? 'ONLINE' : 'OFFLINE',
          lastSeenAt: row.last_seen_at,
          createdAt: row.u_created,
        }
      : undefined,
    receiver: !isIncoming
      ? {
          id: row.u_id,
          username: row.username,
          displayName: row.display_name,
          avatarUrl: row.avatar_url,
          statusMessage: row.status_message,
          isOnline: row.is_online,
          presenceStatus: row.is_online ? 'ONLINE' : 'OFFLINE',
          lastSeenAt: row.last_seen_at,
          createdAt: row.u_created,
        }
      : undefined,
  });

  res.status(200).json({
    success: true,
    data: {
      incoming: incomingRes.rows.map((r) => mapRequest(r, true)),
      outgoing: outgoingRes.rows.map((r) => mapRequest(r, false)),
    },
  });
}

export async function sendFriendRequest(req: Request, res: Response): Promise<void> {
  const currentUserId = req.user!.id;
  const { targetUsername } = req.body;

  if (!targetUsername) {
    res.status(400).json({ success: false, error: 'Target username is required.', statusCode: 400 });
    return;
  }

  const cleanTarget = targetUsername.trim().toLowerCase();
  const db = getDatabaseClient();

  // Find target user
  const targetUserRes = await db.query(
    'SELECT id, username, display_name, avatar_url FROM users WHERE LOWER(username) = $1',
    [cleanTarget]
  );

  if (targetUserRes.rows.length === 0) {
    res.status(404).json({ success: false, error: 'User does not exist.', statusCode: 404 });
    return;
  }

  const targetUser = targetUserRes.rows[0];
  if (targetUser.id === currentUserId) {
    res.status(400).json({ success: false, error: 'Cannot send friend request to yourself.', statusCode: 400 });
    return;
  }

  // Check if already friends
  const alreadyFriends = await db.query(
    'SELECT 1 FROM friendships WHERE user_id = $1 AND friend_id = $2',
    [currentUserId, targetUser.id]
  );

  if (alreadyFriends.rows.length > 0) {
    res.status(400).json({ success: false, error: 'You are already friends with this user.', statusCode: 400 });
    return;
  }

  // Check if request already exists
  const existingRequest = await db.query(
    `SELECT id, status, sender_id FROM friend_requests
     WHERE (sender_id = $1 AND receiver_id = $2)
        OR (sender_id = $2 AND receiver_id = $1)`,
    [currentUserId, targetUser.id]
  );

  if (existingRequest.rows.length > 0) {
    const existing = existingRequest.rows[0];
    if (existing.status === 'PENDING') {
      if (existing.sender_id === currentUserId) {
        res.status(400).json({ success: false, error: 'Friend request is already pending.', statusCode: 400 });
        return;
      } else {
        // Automatically accept reverse request!
        req.body = { requestId: existing.id, action: 'ACCEPT' };
        await respondFriendRequest(req, res);
        return;
      }
    } else {
      // Reopen rejected / cancelled request
      await db.query(
        `UPDATE friend_requests
         SET sender_id = $1, receiver_id = $2, status = 'PENDING', updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [currentUserId, targetUser.id, existing.id]
      );
    }
  } else {
    // Insert new request
    await db.query(
      `INSERT INTO friend_requests (sender_id, receiver_id, status)
       VALUES ($1, $2, 'PENDING')`,
      [currentUserId, targetUser.id]
    );
  }

  // Real-time notification via Socket.IO
  try {
    const socketMgr = getSocketManager();
    socketMgr.emitToUser(targetUser.id, SOCKET_EVENTS.FRIEND_REQUEST_RECEIVED, {
      sender: req.user,
    });
  } catch (err) {
    // Non-fatal if socket manager not initialized
  }

  res.status(200).json({
    success: true,
    message: `Friend request sent to @${targetUser.username}.`,
  });
}

export async function respondFriendRequest(req: Request, res: Response): Promise<void> {
  const currentUserId = req.user!.id;
  const { requestId, action } = req.body;

  if (!requestId || !action || !['ACCEPT', 'REJECT'].includes(action)) {
    res.status(400).json({ success: false, error: 'Valid requestId and action (ACCEPT/REJECT) are required.', statusCode: 400 });
    return;
  }

  const db = getDatabaseClient();
  const requestRes = await db.query(
    'SELECT id, sender_id, receiver_id, status FROM friend_requests WHERE id = $1',
    [requestId]
  );

  if (requestRes.rows.length === 0) {
    res.status(404).json({ success: false, error: 'Friend request not found.', statusCode: 404 });
    return;
  }

  const request = requestRes.rows[0];
  if (request.receiver_id !== currentUserId) {
    res.status(403).json({ success: false, error: 'Not authorized to respond to this request.', statusCode: 403 });
    return;
  }

  if (action === 'ACCEPT') {
    await db.transaction(async (tx) => {
      // Update request status
      await tx.query(
        "UPDATE friend_requests SET status = 'ACCEPTED', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [requestId]
      );

      // Create bilateral friendship
      await tx.query(
        `INSERT INTO friendships (user_id, friend_id)
         VALUES ($1, $2), ($2, $1)
         ON CONFLICT DO NOTHING`,
        [request.sender_id, currentUserId]
      );

      // Create or ensure DIRECT conversation exists between them
      const existingConv = await tx.query(
        `SELECT c.id FROM conversations c
         JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = $1
         JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = $2
         WHERE c.type = 'DIRECT' LIMIT 1`,
        [request.sender_id, currentUserId]
      );

      if (existingConv.rows.length === 0) {
        const newConv = await tx.query(
          "INSERT INTO conversations (type, created_by) VALUES ('DIRECT', $1) RETURNING id",
          [currentUserId]
        );
        const convId = newConv.rows[0].id;

        await tx.query(
          `INSERT INTO conversation_members (conversation_id, user_id, role)
           VALUES ($1, $2, 'MEMBER'), ($1, $3, 'MEMBER')`,
          [convId, currentUserId, request.sender_id]
        );
      }
    });

    // Real-time socket notification to both parties
    try {
      const socketMgr = getSocketManager();
      socketMgr.emitToUser(request.sender_id, SOCKET_EVENTS.FRIEND_REQUEST_UPDATED, {
        requestId,
        status: 'ACCEPTED',
        user: req.user,
      });
      socketMgr.emitToUser(currentUserId, SOCKET_EVENTS.FRIEND_REQUEST_UPDATED, {
        requestId,
        status: 'ACCEPTED',
      });
    } catch (err) {}

    res.status(200).json({
      success: true,
      message: 'Friend request accepted.',
    });
  } else {
    // REJECT
    await db.query(
      "UPDATE friend_requests SET status = 'REJECTED', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [requestId]
    );

    res.status(200).json({
      success: true,
      message: 'Friend request rejected.',
    });
  }
}

export async function removeFriend(req: Request, res: Response): Promise<void> {
  const currentUserId = req.user!.id;
  const { friendId } = req.params;

  if (!friendId) {
    res.status(400).json({ success: false, error: 'Friend ID is required.', statusCode: 400 });
    return;
  }

  const db = getDatabaseClient();
  await db.query(
    'DELETE FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
    [currentUserId, friendId]
  );

  // Notify socket
  try {
    const socketMgr = getSocketManager();
    socketMgr.emitToUser(friendId, SOCKET_EVENTS.FRIEND_REMOVED, { friendId: currentUserId });
    socketMgr.emitToUser(currentUserId, SOCKET_EVENTS.FRIEND_REMOVED, { friendId });
  } catch (err) {}

  res.status(200).json({
    success: true,
    message: 'Friend removed successfully.',
  });
}
