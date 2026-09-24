import { Request, Response } from 'express';
import { getDatabaseClient } from '@null/database';
import { Conversation, ConversationMember, UserProfile, Message } from '@null/shared';
import { getSocketManager } from '../sockets/socket.manager';
import { SOCKET_EVENTS } from '@null/shared';

export async function listConversations(req: Request, res: Response): Promise<void> {
  const currentUserId = req.user!.id;
  const db = getDatabaseClient();

  // Find conversations user is part of
  const convRes = await db.query(
    `SELECT c.id, c.type, c.title, c.description, c.created_by, c.created_at, c.updated_at,
            cm.last_read_at, cm.role AS user_role
     FROM conversations c
     JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = $1
     ORDER BY c.updated_at DESC`,
    [currentUserId]
  );

  const conversations: Conversation[] = [];

  for (const c of convRes.rows) {
    // Get members
    const membersRes = await db.query(
      `SELECT cm.id, cm.conversation_id, cm.user_id, cm.role, cm.joined_at, cm.last_read_at,
              u.id AS u_id, u.username, u.display_name, u.avatar_url, u.status_message, u.is_online, u.last_seen_at, u.created_at AS u_created
       FROM conversation_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.conversation_id = $1`,
      [c.id]
    );

    const members: ConversationMember[] = membersRes.rows.map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      userId: m.user_id,
      role: m.role,
      joinedAt: m.joined_at,
      lastReadAt: m.last_read_at,
      user: {
        id: m.u_id,
        username: m.username,
        displayName: m.display_name,
        avatarUrl: m.avatar_url,
        statusMessage: m.status_message,
        isOnline: m.is_online,
        presenceStatus: m.is_online ? 'ONLINE' : 'OFFLINE',
        lastSeenAt: m.last_seen_at,
        createdAt: m.u_created,
      },
    }));

    // Find recipient for DIRECT chat
    let recipient: UserProfile | undefined = undefined;
    if (c.type === 'DIRECT') {
      const otherMember = members.find((m) => m.userId !== currentUserId);
      if (otherMember?.user) {
        recipient = otherMember.user;
      }
    }

    // Get last message
    const lastMsgRes = await db.query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.type,
              m.attachment_url, m.attachment_name, m.attachment_size, m.attachment_mime,
              m.is_deleted, m.deleted_at, m.created_at, m.updated_at,
              u.id AS u_id, u.username, u.display_name, u.avatar_url, u.status_message, u.is_online, u.last_seen_at, u.created_at AS u_created
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at DESC
       LIMIT 1`,
      [c.id]
    );

    let lastMessage: Message | null = null;
    if (lastMsgRes.rows.length > 0) {
      const msg = lastMsgRes.rows[0];
      lastMessage = {
        id: msg.id,
        conversationId: msg.conversation_id,
        senderId: msg.sender_id,
        content: msg.is_deleted ? 'This message was deleted' : msg.content,
        type: msg.type,
        attachment: msg.attachment_url
          ? {
              url: msg.attachment_url,
              name: msg.attachment_name,
              size: Number(msg.attachment_size),
              mimeType: msg.attachment_mime,
            }
          : null,
        isDeleted: msg.is_deleted,
        deletedAt: msg.deleted_at,
        createdAt: msg.created_at,
        updatedAt: msg.updated_at,
        sender: {
          id: msg.u_id,
          username: msg.username,
          displayName: msg.display_name,
          avatarUrl: msg.avatar_url,
          statusMessage: msg.status_message,
          isOnline: msg.is_online,
          presenceStatus: msg.is_online ? 'ONLINE' : 'OFFLINE',
          lastSeenAt: msg.last_seen_at,
          createdAt: msg.u_created,
        },
      };
    }

    // Count unread messages
    const unreadRes = await db.query(
      `SELECT COUNT(*)::int AS unread
       FROM messages
       WHERE conversation_id = $1
         AND sender_id <> $2
         AND created_at > $3
         AND is_deleted = FALSE`,
      [c.id, currentUserId, c.last_read_at]
    );

    const unreadCount = unreadRes.rows[0]?.unread || 0;

    conversations.push({
      id: c.id,
      type: c.type,
      title: c.title,
      description: c.description,
      createdBy: c.created_by,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      members,
      recipient,
      lastMessage,
      unreadCount,
    });
  }

  // Sort by lastMessage.createdAt DESC or updatedAt DESC
  conversations.sort((a, b) => {
    const timeA = a.lastMessage?.createdAt || a.updatedAt;
    const timeB = b.lastMessage?.createdAt || b.updatedAt;
    return new Date(timeB).getTime() - new Date(timeA).getTime();
  });

  res.status(200).json({
    success: true,
    data: conversations,
  });
}

export async function getOrCreateDirect(req: Request, res: Response): Promise<void> {
  const currentUserId = req.user!.id;
  const { targetUserId } = req.body;

  if (!targetUserId) {
    res.status(400).json({ success: false, error: 'targetUserId is required.', statusCode: 400 });
    return;
  }

  if (targetUserId === currentUserId) {
    res.status(400).json({ success: false, error: 'Cannot create a direct conversation with yourself.', statusCode: 400 });
    return;
  }

  const db = getDatabaseClient();

  // Check target user exists
  const targetCheck = await db.query('SELECT id, username FROM users WHERE id = $1', [targetUserId]);
  if (targetCheck.rows.length === 0) {
    res.status(404).json({ success: false, error: 'Target user does not exist.', statusCode: 404 });
    return;
  }

  // Check existing DIRECT conversation
  const existingRes = await db.query(
    `SELECT c.id FROM conversations c
     JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = $1
     JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = $2
     WHERE c.type = 'DIRECT'
     LIMIT 1`,
    [currentUserId, targetUserId]
  );

  let convId: string;

  if (existingRes.rows.length > 0) {
    convId = existingRes.rows[0].id;
  } else {
    // Create new DIRECT conversation inside transaction
    convId = await db.transaction(async (tx) => {
      const insRes = await tx.query(
        "INSERT INTO conversations (type, created_by) VALUES ('DIRECT', $1) RETURNING id",
        [currentUserId]
      );
      const newId = insRes.rows[0].id;

      await tx.query(
        `INSERT INTO conversation_members (conversation_id, user_id, role)
         VALUES ($1, $2, 'MEMBER'), ($1, $3, 'MEMBER')`,
        [newId, currentUserId, targetUserId]
      );

      return newId;
    });
  }

  // Fetch full conversation details
  req.params = { conversationId: convId };
  await getConversation(req, res);
}

export async function createRoom(req: Request, res: Response): Promise<void> {
  const currentUserId = req.user!.id;
  const { title, description, memberUsernames } = req.body;

  if (!title || !title.trim()) {
    res.status(400).json({ success: false, error: 'Room title is required.', statusCode: 400 });
    return;
  }

  const cleanTitle = title.trim();
  const db = getDatabaseClient();

  const convId = await db.transaction(async (tx) => {
    // Create conversation of type ROOM
    const cRes = await tx.query(
      "INSERT INTO conversations (type, title, description, created_by) VALUES ('ROOM', $1, $2, $3) RETURNING id",
      [cleanTitle, description ? description.trim() : null, currentUserId]
    );
    const id = cRes.rows[0].id;

    // Add creator as OWNER
    await tx.query(
      "INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'OWNER')",
      [id, currentUserId]
    );

    // Add initial members if usernames provided
    if (Array.isArray(memberUsernames) && memberUsernames.length > 0) {
      for (const u of memberUsernames) {
        const cleanU = (u || '').trim().toLowerCase();
        if (!cleanU) continue;

        const uRes = await tx.query('SELECT id FROM users WHERE LOWER(username) = $1', [cleanU]);
        if (uRes.rows.length > 0 && uRes.rows[0].id !== currentUserId) {
          await tx.query(
            "INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'MEMBER') ON CONFLICT DO NOTHING",
            [id, uRes.rows[0].id]
          );
        }
      }
    }

    return id;
  });

  // Notify socket manager to join creator
  try {
    const socketMgr = getSocketManager();
    socketMgr.joinConversationRoom(currentUserId, convId);
  } catch (err) {}

  req.params = { conversationId: convId };
  await getConversation(req, res);
}

export async function getConversation(req: Request, res: Response): Promise<void> {
  const currentUserId = req.user!.id;
  const { conversationId } = req.params;

  if (!conversationId) {
    res.status(400).json({ success: false, error: 'conversationId is required.', statusCode: 400 });
    return;
  }

  const db = getDatabaseClient();

  // Check user is member
  const memberCheck = await db.query(
    'SELECT role, last_read_at FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, currentUserId]
  );

  if (memberCheck.rows.length === 0) {
    res.status(403).json({ success: false, error: 'You are not a member of this conversation.', statusCode: 403 });
    return;
  }

  const convRes = await db.query(
    'SELECT id, type, title, description, created_by, created_at, updated_at FROM conversations WHERE id = $1',
    [conversationId]
  );

  if (convRes.rows.length === 0) {
    res.status(404).json({ success: false, error: 'Conversation not found.', statusCode: 404 });
    return;
  }

  const c = convRes.rows[0];

  // Get members
  const membersRes = await db.query(
    `SELECT cm.id, cm.conversation_id, cm.user_id, cm.role, cm.joined_at, cm.last_read_at,
            u.id AS u_id, u.username, u.display_name, u.avatar_url, u.status_message, u.is_online, u.last_seen_at, u.created_at AS u_created
     FROM conversation_members cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.conversation_id = $1`,
    [c.id]
  );

  const members: ConversationMember[] = membersRes.rows.map((m) => ({
    id: m.id,
    conversationId: m.conversation_id,
    userId: m.user_id,
    role: m.role,
    joinedAt: m.joined_at,
    lastReadAt: m.last_read_at,
    user: {
      id: m.u_id,
      username: m.username,
      displayName: m.display_name,
      avatarUrl: m.avatar_url,
      statusMessage: m.status_message,
      isOnline: m.is_online,
      presenceStatus: m.is_online ? 'ONLINE' : 'OFFLINE',
      lastSeenAt: m.last_seen_at,
      createdAt: m.u_created,
    },
  }));

  let recipient: UserProfile | undefined = undefined;
  if (c.type === 'DIRECT') {
    const otherMember = members.find((m) => m.userId !== currentUserId);
    if (otherMember?.user) {
      recipient = otherMember.user;
    }
  }

  const conversation: Conversation = {
    id: c.id,
    type: c.type,
    title: c.title,
    description: c.description,
    createdBy: c.created_by,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    members,
    recipient,
  };

  res.status(200).json({
    success: true,
    data: conversation,
  });
}

export async function inviteMember(req: Request, res: Response): Promise<void> {
  const currentUserId = req.user!.id;
  const { conversationId } = req.params;
  const { username } = req.body;

  if (!username) {
    res.status(400).json({ success: false, error: 'Username is required.', statusCode: 400 });
    return;
  }

  const db = getDatabaseClient();

  // Check room & membership
  const memberCheck = await db.query(
    `SELECT c.type, cm.role FROM conversations c
     JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = $1
     WHERE c.id = $2`,
    [currentUserId, conversationId]
  );

  if (memberCheck.rows.length === 0) {
    res.status(403).json({ success: false, error: 'You are not a member of this conversation.', statusCode: 403 });
    return;
  }

  if (memberCheck.rows[0].type !== 'ROOM') {
    res.status(400).json({ success: false, error: 'Members can only be invited to group rooms.', statusCode: 400 });
    return;
  }

  // Find target user
  const uRes = await db.query('SELECT id, username, display_name, avatar_url FROM users WHERE LOWER(username) = $1', [
    username.trim().toLowerCase(),
  ]);

  if (uRes.rows.length === 0) {
    res.status(404).json({ success: false, error: 'User not found.', statusCode: 404 });
    return;
  }

  const targetUser = uRes.rows[0];

  // Insert membership
  await db.query(
    "INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'MEMBER') ON CONFLICT DO NOTHING",
    [conversationId, targetUser.id]
  );

  // Notify socket
  try {
    const socketMgr = getSocketManager();
    socketMgr.emitToConversation(conversationId, SOCKET_EVENTS.ROOM_MEMBER_JOINED, {
      conversationId,
      user: targetUser,
    });
    socketMgr.emitToUser(targetUser.id, SOCKET_EVENTS.CONVERSATION_NEW, {
      conversationId,
    });
  } catch (err) {}

  res.status(200).json({
    success: true,
    message: `@${targetUser.username} added to the room.`,
  });
}

export async function leaveRoom(req: Request, res: Response): Promise<void> {
  const currentUserId = req.user!.id;
  const { conversationId } = req.params;

  const db = getDatabaseClient();

  const convRes = await db.query(
    'SELECT type FROM conversations WHERE id = $1',
    [conversationId]
  );

  if (convRes.rows.length === 0) {
    res.status(404).json({ success: false, error: 'Room not found.', statusCode: 404 });
    return;
  }

  if (convRes.rows[0].type !== 'ROOM') {
    res.status(400).json({ success: false, error: 'Cannot leave a direct message conversation.', statusCode: 400 });
    return;
  }

  await db.query(
    'DELETE FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, currentUserId]
  );

  // Notify socket
  try {
    const socketMgr = getSocketManager();
    socketMgr.emitToConversation(conversationId, SOCKET_EVENTS.ROOM_MEMBER_LEFT, {
      conversationId,
      userId: currentUserId,
    });
  } catch (err) {}

  res.status(200).json({
    success: true,
    message: 'Left room successfully.',
  });
}
