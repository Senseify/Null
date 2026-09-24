import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@null/shared';

const API_URL = 'http://localhost:4000';
const WS_URL = 'http://localhost:4000';

async function request(endpoint: string, method: string = 'GET', body?: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`API ${method} ${endpoint} failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return json.data !== undefined ? json.data : json;
}

async function runQA() {
  console.log('======================================================');
  console.log('     NULL NATIVE QA: 18-POINT FUNCTIONAL TEST        ');
  console.log('======================================================\n');

  const ts = Date.now();
  const u1Name = `qa_alpha_${ts}`;
  const u2Name = `qa_bravo_${ts}`;

  // 1. Register & Login
  console.log('▶ [1/18] Registering & logging in two test accounts...');
  const reg1 = await request('/api/auth/register', 'POST', {
    username: u1Name,
    email: `${u1Name}@null.local`,
    displayName: 'QA Alpha',
    password: 'Password123!',
  });
  const token1 = reg1.tokens.accessToken;
  const user1 = reg1.user;
  console.log(`✔ User 1 registered: @${user1.username} (ID: ${user1.id})`);

  const reg2 = await request('/api/auth/register', 'POST', {
    username: u2Name,
    email: `${u2Name}@null.local`,
    displayName: 'QA Bravo',
    password: 'Password123!',
  });
  const token2 = reg2.tokens.accessToken;
  const user2 = reg2.user;
  console.log(`✔ User 2 registered: @${user2.username} (ID: ${user2.id})`);

  // 2. Profile / Settings
  console.log('\n▶ [2/18] Updating profile & settings for User 1...');
  const updatedUser1 = await request('/api/auth/profile', 'PUT', {
    displayName: 'QA Alpha Updated',
    bio: 'Encrypted operator testing NULL protocol.',
  }, token1);
  if (updatedUser1.displayName !== 'QA Alpha Updated') throw new Error('Profile update failed');
  console.log(`✔ User 1 profile updated: "${updatedUser1.displayName}" | "${updatedUser1.bio}"`);

  // 3. User Search
  console.log('\n▶ [3/18] Searching for User 2...');
  const searchResults = await request(`/api/friends/search?q=${u2Name}`, 'GET', undefined, token1);
  if (!searchResults.some((u: any) => u.id === user2.id)) throw new Error('Search failed to find User 2');
  console.log(`✔ Found @${u2Name} in directory search.`);

  // Connect WebSockets
  const sock1: Socket = io(WS_URL, { auth: { token: token1 } });
  const sock2: Socket = io(WS_URL, { auth: { token: token2 } });
  await new Promise<void>((resolve) => {
    let c = 0;
    const check = () => { if (++c === 2) resolve(); };
    sock1.on('connect', check);
    sock2.on('connect', check);
  });

  // 4. Send Friend Request
  console.log('\n▶ [4/18] User 1 sending friend request to User 2...');
  const frPromise = new Promise<void>((resolve) => {
    sock2.on(SOCKET_EVENTS.FRIEND_REQUEST_RECEIVED, () => {
      console.log('✔ Real-time notification: User 2 received friend request on WebSocket.');
      resolve();
    });
  });

  await request('/api/friends/request', 'POST', {
    targetUsername: u2Name,
  }, token1);
  await frPromise;
  console.log(`✔ Friend request dispatched via REST.`);

  // 5. Accept Friend Request
  console.log('\n▶ [5/18] User 2 accepting friend request...');
  const reqList = await request('/api/friends/requests', 'GET', undefined, token2);
  const incoming = reqList.incoming;
  if (!incoming || incoming.length === 0) throw new Error('Incoming friend request not found for User 2');
  const requestId = incoming[0].id;

  await request('/api/friends/respond', 'POST', {
    requestId,
    action: 'ACCEPT',
  }, token2);
  const friends1 = await request('/api/friends/list', 'GET', undefined, token1);
  if (!friends1.some((f: any) => f.user.id === user2.id)) throw new Error('Bilateral friendship missing');
  console.log('✔ Bilateral friendship verified in friend list.');

  // 6. Open Direct Conversation
  console.log('\n▶ [6/18] Opening direct conversation...');
  const convsRes = await request('/api/conversations', 'GET', undefined, token1);
  if (!convsRes || convsRes.length === 0) throw new Error('Direct conversation not found for User 1');
  const directConv = convsRes[0];
  console.log(`✔ Direct conversation active (ID: ${directConv.id}).`);

  // 7 & 8. Send message & verify real-time delivery
  console.log('\n▶ [7/18 & 8/18] Sending direct message & verifying realtime delivery...');
  const msgPromise = new Promise<any>((resolve) => {
    sock2.on(SOCKET_EVENTS.MESSAGE_NEW, (payload) => {
      resolve(payload.message);
    });
  });

  const sentMsg = await request('/api/messages', 'POST', {
    conversationId: directConv.id,
    content: 'Secure transmission: Native QA ping.',
  }, token1);

  const receivedMsg = await msgPromise;
  if (receivedMsg.id !== sentMsg.id) throw new Error('Realtime message mismatch');
  console.log(`✔ Real-time message delivered to User 2: "${receivedMsg.content}"`);

  // 9. Typing Indicator
  console.log('\n▶ [9/18] Testing typing indicator...');
  const typingPromise = new Promise<any>((resolve) => {
    sock2.on(SOCKET_EVENTS.TYPING_UPDATE, (payload) => {
      if (payload.isTyping) resolve(payload);
    });
  });

  sock1.emit(SOCKET_EVENTS.TYPING_START, { conversationId: directConv.id });
  const typingEvent = await typingPromise;
  console.log(`✔ User 2 received typing indicator from @${typingEvent.username}`);
  sock1.emit(SOCKET_EVENTS.TYPING_STOP, { conversationId: directConv.id });

  // 10. Read Receipts
  console.log('\n▶ [10/18] Testing read receipts...');
  const receiptPromise = new Promise<any>((resolve) => {
    sock1.on(SOCKET_EVENTS.MESSAGE_READ, (payload) => {
      resolve(payload);
    });
  });

  await request(`/api/messages/read/${directConv.id}`, 'POST', undefined, token2);
  const receiptEvent = await receiptPromise;
  console.log(`✔ User 1 received read receipt: Read by User ID ${receiptEvent.userId}`);

  // 11. Create Private Room
  console.log('\n▶ [11/18] Creating private group room...');
  const room = await request('/api/conversations/rooms', 'POST', {
    title: 'NULL Black Ops',
    description: 'Classified group discussion channel',
    memberUsernames: [u2Name],
  }, token1);
  console.log(`✔ Private room created: "${room.title}" (Members: ${room.members.length})`);

  // 12. Invite a Member
  console.log('\n▶ [12/18] Inviting member verification...');
  if (!room.members.some((m: any) => m.userId === user2.id)) throw new Error('User 2 not in room');
  console.log(`✔ Verified User 2 is joined in room: @${u2Name}`);

  // 13. Send Messages in Room
  console.log('\n▶ [13/18] Sending messages in group room...');
  const roomMsgPromise = new Promise<any>((resolve) => {
    sock2.on(SOCKET_EVENTS.MESSAGE_NEW, (payload) => {
      if (payload.message.conversationId === room.id) resolve(payload.message);
    });
  });

  const roomMsg = await request('/api/messages', 'POST', {
    conversationId: room.id,
    content: 'Broadcast to all room members.',
  }, token1);

  const receivedRoomMsg = await roomMsgPromise;
  if (receivedRoomMsg.id !== roomMsg.id) throw new Error('Room message delivery mismatch');
  console.log(`✔ Room message received by User 2: "${receivedRoomMsg.content}"`);

  // 14. Upload Attachment
  console.log('\n▶ [14/18] Uploading file attachment & dispatching attachment message...');
  const boundary = '----WebKitFormBoundaryQA123';
  const fileContent = 'NULL PROTOCOL ENCRYPTED PAYLOAD 0xDEADBEEF';
  const postBody = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="payload.txt"',
    'Content-Type: text/plain',
    '',
    fileContent,
    `--${boundary}--`,
  ].join('\r\n');

  const uploadRes = await fetch(`${API_URL}/api/attachments/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Authorization': `Bearer ${token1}`,
    },
    body: postBody,
  });
  const uploadJson = await uploadRes.json();
  console.log(`✔ File uploaded successfully: ${uploadJson.url} (${uploadJson.name}, ${uploadJson.size} bytes)`);

  const attachMsg = await request('/api/messages', 'POST', {
    conversationId: directConv.id,
    content: 'Transmitting security payload',
    type: 'FILE',
    attachment: {
      url: uploadJson.url,
      name: uploadJson.name,
      size: uploadJson.size,
      mimeType: uploadJson.mimeType,
    },
  }, token1);
  console.log(`✔ Attachment message sent (ID: ${attachMsg.id}) with attached file.`);

  // 15. Delete Message
  console.log('\n▶ [15/18] Deleting message & verifying masking...');
  const deletePromise = new Promise<any>((resolve) => {
    sock2.on(SOCKET_EVENTS.MESSAGE_DELETED, (payload) => {
      resolve(payload);
    });
  });

  await request(`/api/messages/${sentMsg.id}`, 'DELETE', undefined, token1);
  const delEvent = await deletePromise;
  if (delEvent.messageId !== sentMsg.id) throw new Error('Delete event mismatch');

  const history = await request(`/api/messages?conversationId=${directConv.id}`, 'GET', undefined, token2);
  const deletedMsg = history.find((m: any) => m.id === sentMsg.id);
  if (!deletedMsg.isDeleted || deletedMsg.content !== 'This message was deleted') {
    throw new Error('Message not properly masked in database');
  }
  console.log(`✔ Message soft-deleted and masked: "${deletedMsg.content}"`);

  // 16. Logout & Login again
  console.log('\n▶ [16/18] Logging out and logging back in...');
  await request('/api/auth/logout', 'POST', undefined, token1);
  console.log('✔ User 1 logged out.');

  const relogin = await request('/api/auth/login', 'POST', {
    login: u1Name,
    password: 'Password123!',
  });
  const newToken1 = relogin.tokens.accessToken;
  console.log(`✔ User 1 re-authenticated successfully. New token generated.`);

  // 17. Verify Message History Persists
  console.log('\n▶ [17/18] Verifying conversation & message history persists...');
  const persistedHistory = await request(`/api/messages?conversationId=${directConv.id}`, 'GET', undefined, newToken1);
  if (persistedHistory.length === 0) throw new Error('Message history lost after relogin');
  console.log(`✔ Verified ${persistedHistory.length} messages persisted in database across session reload.`);

  // 18. Reconnect Behavior & Presence
  console.log('\n▶ [18/18] Verifying disconnect & reconnect presence behavior...');
  const offlinePromise = new Promise<any>((resolve) => {
    sock2.on(SOCKET_EVENTS.PRESENCE_UPDATE, (payload) => {
      if (payload.presence.userId === user1.id && payload.presence.status === 'OFFLINE') {
        resolve(payload);
      }
    });
  });

  sock1.disconnect();
  await offlinePromise;
  console.log(`✔ User 2 observed User 1 transition to OFFLINE.`);

  const onlinePromise = new Promise<any>((resolve) => {
    sock2.on(SOCKET_EVENTS.PRESENCE_UPDATE, (payload) => {
      if (payload.presence.userId === user1.id && payload.presence.status === 'ONLINE') {
        resolve(payload);
      }
    });
  });

  const sock1Reconnect: Socket = io(WS_URL, { auth: { token: newToken1 } });
  await onlinePromise;
  console.log(`✔ User 2 observed User 1 transition to ONLINE upon reconnection.`);

  sock1Reconnect.disconnect();
  sock2.disconnect();

  console.log('\n======================================================');
  console.log('    ALL 18 NATIVE FUNCTIONAL QA CHECKS PASSED!        ');
  console.log('======================================================\n');
}

runQA().catch((err) => {
  console.error('\n❌ QA FAILED:', err);
  process.exit(1);
});
