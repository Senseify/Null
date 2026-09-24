import { Request, Response } from 'express';
import { getDatabaseClient } from '@null/database';
import { Message, SendMessageDTO } from '@null/shared';
import { getSocketManager } from '../sockets/socket.manager';
import { SOCKET_EVENTS } from '@null/shared';

export async function getMessages(req: Request, res: Response): Promise<void> {
  const currentUserId = req.user!.id;
  const conversationId = req.query.conversationId as string;
  const limit = Math.min(parseInt(req.query.limit as string || '50', 10), 100);
  const before = req.query.before as string | undefined;

  if (!conversationId) {
    res.status(400).json({ success: false, error: 'conversationId is required.', statusCode: 400 });
    return;
  }

  const db = getDatabaseClient();

  // Verify membership
  const memberCheck = await db.query(
    'SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, currentUserId]
  );

  if (memberCheck.rows.length === 0) {
    res.status(403).json({ success: false, error: 'You are not a member of this conversation.', statusCode: 403 });
    return;
  }

  // Fetch messages
  let query = `
    SELECT m.id, m.conversation_id, m.sender_id, m.content, m.type,
           m.attachment_url, m.attachment_name, m.attachment_size, m.attachment_mime,
           m.is_deleted, m.deleted_at, m.created_at, m.updated_at,
           u.id AS u_id, u.username, u.display_name, u.avatar_url, u.status_message, u.is_online, u.last_seen_at, u.created_at AS u_created
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = $1
  `;
  const params: any[] = [conversationId];

  if (before) {
    query += ` AND m.created_at < $2`;
    params.push(before);
  }

  query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const result = await db.query(query, params);

  // Update member's last_read_at
  await db.query(
    'UPDATE conversation_members SET last_read_at = CURRENT_TIMESTAMP WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, currentUserId]
  );

  // Format messages (reverse so they are in chronological order ASC)
  const rows = result.rows.reverse();

  // Fetch read receipts for retrieved messages
  const messageIds = rows.map((r) => r.id);
  let readMap: Record<string, string[]> = {};

  if (messageIds.length > 0) {
    const readsRes = await db.query(
      `SELECT message_id, user_id FROM message_reads WHERE message_id = ANY($1::uuid[])`,
      [messageIds]
    );
    for (const r of readsRes.rows) {
      if (!readMap[r.message_id]) readMap[r.message_id] = [];
      readMap[r.message_id].push(r.user_id);
    }
  }

  const messages: Message[] = rows.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.is_deleted ? 'This message was deleted' : row.content,
    type: row.type,
    attachment: row.attachment_url
      ? {
          url: row.attachment_url,
          name: row.attachment_name,
          size: Number(row.attachment_size),
          mimeType: row.attachment_mime,
        }
      : null,
    isDeleted: row.is_deleted,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deliveryStatus: 'READ',
    readBy: readMap[row.id] || [],
    sender: {
      id: row.u_id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      statusMessage: row.status_message,
      isOnline: row.is_online,
      presenceStatus: row.is_online ? 'ONLINE' : 'OFFLINE',
      lastSeenAt: row.last_seen_at,
      createdAt: row.u_created,
    },
  }));

  res.status(200).json({
    success: true,
    data: messages,
  });
}

export async function sendMessage(req: Request, res: Response): Promise<void> {
  const currentUserId = req.user!.id;
  const { conversationId, content, type = 'TEXT', attachment, clientTempId }: SendMessageDTO = req.body;

  if (!conversationId) {
    res.status(400).json({ success: false, error: 'conversationId is required.', statusCode: 400 });
    return;
  }

  if (!content && !attachment) {
    res.status(400).json({ success: false, error: 'Message content or attachment is required.', statusCode: 400 });
    return;
  }

  const db = getDatabaseClient();

  // Verify membership
  const memberCheck = await db.query(
    'SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, currentUserId]
  );

  if (memberCheck.rows.length === 0) {
    res.status(403).json({ success: false, error: 'You are not a member of this conversation.', statusCode: 403 });
    return;
  }

  // Insert message inside transaction and update conversation timestamp
  const msgRow = await db.transaction(async (tx) => {
    const insertRes = await tx.query(
      `INSERT INTO messages (conversation_id, sender_id, content, type, attachment_url, attachment_name, attachment_size, attachment_mime)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, conversation_id, sender_id, content, type, attachment_url, attachment_name, attachment_size, attachment_mime,
                 is_deleted, deleted_at, created_at, updated_at`,
      [
        conversationId,
        currentUserId,
        (content || '').trim(),
        type,
        attachment?.url || null,
        attachment?.name || null,
        attachment?.size || null,
        attachment?.mimeType || null,
      ]
    );

    // Update conversation updated_at
    await tx.query('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [conversationId]);

    // Update sender's last_read_at
    await tx.query(
      'UPDATE conversation_members SET last_read_at = CURRENT_TIMESTAMP WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, currentUserId]
    );

    return insertRes.rows[0];
  });

  const fullMessage: Message = {
    id: msgRow.id,
    conversationId: msgRow.conversation_id,
    senderId: msgRow.sender_id,
    content: msgRow.content,
    type: msgRow.type,
    attachment: msgRow.attachment_url
      ? {
          url: msgRow.attachment_url,
          name: msgRow.attachment_name,
          size: Number(msgRow.attachment_size),
          mimeType: msgRow.attachment_mime,
        }
      : null,
    isDeleted: false,
    deletedAt: null,
    createdAt: msgRow.created_at,
    updatedAt: msgRow.updated_at,
    sender: req.user,
    deliveryStatus: 'SENT',
    readBy: [currentUserId],
  };

  // Broadcast via Socket.IO
  try {
    const socketMgr = getSocketManager();
    socketMgr.emitToConversation(conversationId, SOCKET_EVENTS.MESSAGE_NEW, {
      message: fullMessage,
      clientTempId,
    });
  } catch (err) {}

  res.status(201).json({
    success: true,
    data: fullMessage,
  });
}

export async function deleteMessage(req: Request, res: Response): Promise<void> {
  const currentUserId = req.user!.id;
  const { messageId } = req.params;

  if (!messageId) {
    res.status(400).json({ success: false, error: 'messageId is required.', statusCode: 400 });
    return;
  }

  const db = getDatabaseClient();

  const msgRes = await db.query(
    'SELECT id, conversation_id, sender_id, is_deleted FROM messages WHERE id = $1',
    [messageId]
  );

  if (msgRes.rows.length === 0) {
    res.status(404).json({ success: false, error: 'Message not found.', statusCode: 404 });
    return;
  }

  const msg = msgRes.rows[0];

  if (msg.sender_id !== currentUserId) {
    res.status(403).json({ success: false, error: 'You can only delete your own messages.', statusCode: 403 });
    return;
  }

  if (msg.is_deleted) {
    res.status(200).json({ success: true, message: 'Message is already deleted.' });
    return;
  }

  await db.query(
    `UPDATE messages
     SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP, content = 'This message was deleted',
         attachment_url = NULL, attachment_name = NULL
     WHERE id = $1`,
    [messageId]
  );

  // Broadcast deletion via Socket.IO
  try {
    const socketMgr = getSocketManager();
    socketMgr.emitToConversation(msg.conversation_id, SOCKET_EVENTS.MESSAGE_DELETED, {
      conversationId: msg.conversation_id,
      messageId,
      deletedAt: new Date().toISOString(),
    });
  } catch (err) {}

  res.status(200).json({
    success: true,
    message: 'Message deleted successfully.',
  });
}

export async function markAsRead(req: Request, res: Response): Promise<void> {
  const currentUserId = req.user!.id;
  const { conversationId } = req.params;

  if (!conversationId) {
    res.status(400).json({ success: false, error: 'conversationId is required.', statusCode: 400 });
    return;
  }

  const db = getDatabaseClient();

  // Update last_read_at
  await db.query(
    'UPDATE conversation_members SET last_read_at = CURRENT_TIMESTAMP WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, currentUserId]
  );

  // Find unread messages and record in message_reads
  const unreadMsgs = await db.query(
    `SELECT id FROM messages WHERE conversation_id = $1 AND sender_id <> $2`,
    [conversationId, currentUserId]
  );

  for (const m of unreadMsgs.rows) {
    await db.query(
      `INSERT INTO message_reads (message_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [m.id, currentUserId]
    );
  }

  // Notify socket
  try {
    const socketMgr = getSocketManager();
    socketMgr.emitToConversation(conversationId, SOCKET_EVENTS.MESSAGE_READ, {
      conversationId,
      userId: currentUserId,
      readAt: new Date().toISOString(),
    });
  } catch (err) {}

  res.status(200).json({
    success: true,
    message: 'Conversation marked as read.',
  });
}
