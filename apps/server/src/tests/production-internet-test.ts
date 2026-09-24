import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { SOCKET_EVENTS } from '@null/shared';

const PROD_URL = process.env.PROD_URL || 'https://null-server-g543.onrender.com';

async function apiCall(endpoint: string, method: string = 'GET', body?: any, token?: string, isFormData: boolean = false) {
  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${PROD_URL}${endpoint}`, {
    method,
    headers,
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
  });

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await res.json();
    return { status: res.status, ok: res.ok, data: json };
  } else {
    const text = await res.text();
    return { status: res.status, ok: res.ok, data: text };
  }
}

async function runProductionTests() {
  console.log('\n=============================================================');
  console.log('       NULL PROTOCOL: LIVE PRODUCTION INTERNET TEST          ');
  console.log(`       Target: ${PROD_URL}`);
  console.log('=============================================================\n');

  // STEP 0: Health & Database Check
  console.log('▶ [0/18] Health Check & PostgreSQL Verification...');
  const healthRes = await apiCall('/api/health');
  if (!healthRes.ok || healthRes.data.status !== 'ok') {
    throw new Error(`Health check failed: ${JSON.stringify(healthRes.data)}`);
  }
  console.log(`✔ Backend Health: OK (Uptime: ${healthRes.data.uptimeSeconds}s)`);
  console.log(`✔ PostgreSQL Database: ${healthRes.data.database.status} (Engine: ${healthRes.data.database.engine})`);

  // STEP 1 & 2: Client A & Client B Registration
  console.log('\n▶ [1/18 & 2/18] Registering Client A & Client B...');
  const timestamp = Date.now();
  const usernameA = `prod_alpha_${timestamp}`;
  const usernameB = `prod_bravo_${timestamp}`;

  const regA = await apiCall('/api/auth/register', 'POST', {
    username: usernameA,
    displayName: 'Operator Alpha (Prod)',
    email: `${usernameA}@null-prod.network`,
    password: 'SecurePassword123!',
  });
  if (!regA.ok) throw new Error(`Client A registration failed: ${JSON.stringify(regA.data)}`);
  const tokenA = regA.data.data.tokens.accessToken;
  const userAId = regA.data.data.user.id;
  console.log(`✔ Client A registered: @${usernameA} (ID: ${userAId})`);

  const regB = await apiCall('/api/auth/register', 'POST', {
    username: usernameB,
    displayName: 'Operator Bravo (Prod)',
    email: `${usernameB}@null-prod.network`,
    password: 'SecurePassword123!',
  });
  if (!regB.ok) throw new Error(`Client B registration failed: ${JSON.stringify(regB.data)}`);
  const tokenB = regB.data.data.tokens.accessToken;
  const userBId = regB.data.data.user.id;
  console.log(`✔ Client B registered: @${usernameB} (ID: ${userBId})`);

  // Establish live WSS connections
  console.log('\n▶ Establishing live WSS connections to Render...');
  let socketA: ClientSocketType = ClientSocket(PROD_URL, {
    auth: { token: tokenA },
    transports: ['websocket', 'polling'],
  });
  let socketB: ClientSocketType = ClientSocket(PROD_URL, {
    auth: { token: tokenB },
    transports: ['websocket', 'polling'],
  });

  await Promise.all([
    new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Socket A connection timeout')), 15000);
      socketA.on('connect', () => {
        clearTimeout(timer);
        resolve();
      });
      socketA.on('connect_error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    }),
    new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Socket B connection timeout')), 15000);
      socketB.on('connect', () => {
        clearTimeout(timer);
        resolve();
      });
      socketB.on('connect_error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    }),
  ]);
  console.log('✔ Socket.IO / WSS connections established for both clients.');

  // STEP 3: Search users
  console.log('\n▶ [3/18] Searching users...');
  const searchRes = await apiCall(`/api/friends/search?q=${usernameB}`, 'GET', undefined, tokenA);
  if (!searchRes.ok || !searchRes.data.data || searchRes.data.data.length === 0) {
    throw new Error('User search failed on production backend');
  }
  console.log(`✔ Client A successfully found @${usernameB} in search results.`);

  // STEP 4: Friend request
  console.log('\n▶ [4/18] Sending Friend Request...');
  const friendReqPromise = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Friend request notification timeout')), 10000);
    socketB.on(SOCKET_EVENTS.FRIEND_REQUEST_RECEIVED, () => {
      clearTimeout(timer);
      console.log('✔ Real-time WSS notification: Client B received incoming friend request.');
      resolve();
    });
  });

  const sendReqRes = await apiCall('/api/friends/request', 'POST', { targetUsername: usernameB }, tokenA);
  if (!sendReqRes.ok) throw new Error(`Send friend request failed: ${JSON.stringify(sendReqRes.data)}`);
  await friendReqPromise;

  // STEP 5: Accept request
  console.log('\n▶ [5/18] Accepting Friend Request...');
  const pendingReqsRes = await apiCall('/api/friends/requests', 'GET', undefined, tokenB);
  const incoming = pendingReqsRes.data.data.incoming;
  if (!incoming || incoming.length === 0) throw new Error('No incoming friend request found for Client B');
  const requestId = incoming[0].id;

  const acceptRes = await apiCall('/api/friends/respond', 'POST', { requestId, action: 'ACCEPT' }, tokenB);
  if (!acceptRes.ok) throw new Error(`Accept friend request failed: ${JSON.stringify(acceptRes.data)}`);
  console.log('✔ Client B accepted friend request. Bilateral friendship active.');

  // Locate the direct conversation
  const convsRes = await apiCall('/api/conversations', 'GET', undefined, tokenA);
  if (!convsRes.ok || convsRes.data.data.length === 0) {
    throw new Error('Direct conversation not initialized');
  }
  const directConv = convsRes.data.data[0];
  console.log(`✔ Conversation established (ID: ${directConv.id})`);

  // STEP 8: Typing indicator
  console.log('\n▶ [8/18] Testing Typing Indicator over WSS...');
  const typingPromise = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Typing indicator timeout')), 10000);
    socketB.on(SOCKET_EVENTS.TYPING_UPDATE, (data: any) => {
      if (data.isTyping && data.username === usernameA) {
        clearTimeout(timer);
        console.log(`✔ Real-time typing event received by Client B from @${usernameA}.`);
        resolve();
      }
    });
  });
  socketA.emit(SOCKET_EVENTS.TYPING_START, { conversationId: directConv.id });
  await typingPromise;

  // STEP 6: DM A -> B
  console.log('\n▶ [6/18] Sending DM: Client A -> Client B...');
  const msgPromise1 = new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('DM 1 delivery timeout')), 10000);
    socketB.on(SOCKET_EVENTS.MESSAGE_NEW, (payload: any) => {
      if (payload.message && payload.message.content.includes('Message Alpha 01')) {
        clearTimeout(timer);
        resolve(payload.message);
      }
    });
  });

  const sendRes1 = await apiCall(
    '/api/messages',
    'POST',
    { conversationId: directConv.id, content: 'Message Alpha 01: Production link operational.' },
    tokenA
  );
  if (!sendRes1.ok) throw new Error(`Send message 1 failed: ${JSON.stringify(sendRes1.data)}`);
  const deliveredMsg1 = await msgPromise1;
  console.log(`✔ Live message delivered to Client B: "${deliveredMsg1.content}"`);

  // STEP 7: DM B -> A
  console.log('\n▶ [7/18] Sending DM: Client B -> Client A...');
  const msgPromise2 = new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('DM 2 delivery timeout')), 10000);
    socketA.on(SOCKET_EVENTS.MESSAGE_NEW, (payload: any) => {
      if (payload.message && payload.message.content.includes('Message Bravo 02')) {
        clearTimeout(timer);
        resolve(payload.message);
      }
    });
  });

  const sendRes2 = await apiCall(
    '/api/messages',
    'POST',
    { conversationId: directConv.id, content: 'Message Bravo 02: Acknowledged on public internet.' },
    tokenB
  );
  if (!sendRes2.ok) throw new Error(`Send message 2 failed: ${JSON.stringify(sendRes2.data)}`);
  const deliveredMsg2 = await msgPromise2;
  console.log(`✔ Live reply delivered to Client A: "${deliveredMsg2.content}"`);

  // STEP 9: Read receipt
  console.log('\n▶ [9/18] Testing Read Receipts...');
  const readPromise = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Read receipt timeout')), 10000);
    socketA.on(SOCKET_EVENTS.MESSAGE_READ, (data: any) => {
      if (data.userId === userBId) {
        clearTimeout(timer);
        console.log(`✔ Read receipt received by Client A (Marked read by Client B).`);
        resolve();
      }
    });
  });
  await apiCall(`/api/messages/read/${directConv.id}`, 'POST', undefined, tokenB);
  await readPromise;

  // STEP 10: Delete message
  console.log('\n▶ [10/18] Deleting message...');
  const deletePromise = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Message deletion timeout')), 10000);
    socketB.on(SOCKET_EVENTS.MESSAGE_DELETED, (data: any) => {
      if (data.messageId === deliveredMsg1.id) {
        clearTimeout(timer);
        console.log(`✔ Real-time message deletion event received by Client B for ID: ${data.messageId}`);
        resolve();
      }
    });
  });
  const delRes = await apiCall(`/api/messages/${deliveredMsg1.id}`, 'DELETE', undefined, tokenA);
  if (!delRes.ok) throw new Error(`Message deletion failed: ${JSON.stringify(delRes.data)}`);
  await deletePromise;

  // STEP 11 & 12: Create private room & invite user
  console.log('\n▶ [11/18 & 12/18] Creating Private Room & Inviting User...');
  const roomRes = await apiCall(
    '/api/conversations/rooms',
    'POST',
    {
      title: 'NULL Ops Production Citadel',
      description: 'Encrypted group room hosted on Render',
      memberUsernames: [usernameB],
    },
    tokenA
  );
  if (!roomRes.ok) throw new Error(`Room creation failed: ${JSON.stringify(roomRes.data)}`);
  const room = roomRes.data.data;
  console.log(`✔ Private room created: "${room.title}" (ID: ${room.id}, Members: ${room.members.length})`);

  // STEP 13: Room messaging
  console.log('\n▶ [13/18] Sending message in Private Room...');
  const roomMsgPromise = new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Room message timeout')), 15000);
    socketA.on(SOCKET_EVENTS.MESSAGE_NEW, (payload: any) => {
      if (payload.message && payload.message.conversationId === room.id && payload.message.content.includes('Room transmission 01')) {
        clearTimeout(timer);
        resolve(payload.message);
      }
    });
  });
  const sendRoomMsgRes = await apiCall(
    '/api/messages',
    'POST',
    { conversationId: room.id, content: 'Room transmission 01: Multi-member room test.' },
    tokenB
  );
  if (!sendRoomMsgRes.ok) throw new Error('Failed to send room message');
  const deliveredRoomMsg = await roomMsgPromise;
  console.log(`✔ Room message received by Client A: "${deliveredRoomMsg.content}"`);

  // STEP 14: Attachment Upload & Retrieval
  console.log('\n▶ [14/18] Testing Attachment Storage (Upload & Retrieval)...');
  const samplePayload = 'NULL Protocol Attachment Test Verification Payload - ' + Date.now();
  const fileBlob = new Blob([samplePayload]);
  const formData = new FormData();
  (formData as any).append('file', fileBlob, 'null_test_payload.txt');

  const uploadRes = await apiCall('/api/attachments/upload', 'POST', formData, tokenA, true);
  if (!uploadRes.ok || !uploadRes.data.success) {
    throw new Error(`Attachment upload failed: ${JSON.stringify(uploadRes.data)}`);
  }
  const uploadedFile = uploadRes.data.data;
  console.log(`✔ File uploaded successfully: ${uploadedFile.url} (${uploadedFile.size} bytes)`);

  // Verify retrieval
  const fetchFileRes = await apiCall(uploadedFile.url, 'GET');
  if (!fetchFileRes.ok || fetchFileRes.data !== samplePayload) {
    throw new Error('Attachment retrieval mismatch or file not found on disk');
  }
  console.log('✔ Attachment retrieved over HTTPS with 100% byte integrity!');

  // STEP 15, 16 & 17: Close, Reopen, History & Reconnect
  console.log('\n▶ [15/18, 16/18 & 17/18] Testing Disconnect, Reconnect & History Persistence...');
  socketA.disconnect();
  console.log('✔ Client A disconnected (simulating app close).');

  // Verify message history persists in PostgreSQL
  const historyRes = await apiCall(`/api/messages?conversationId=${directConv.id}`, 'GET', undefined, tokenB);
  if (!historyRes.ok || !historyRes.data.data) {
    throw new Error('Failed to retrieve conversation history');
  }
  console.log(`✔ Retrieved ${historyRes.data.data.length} messages from PostgreSQL message history.`);

  // Reconnect Client A
  socketA = ClientSocket(PROD_URL, {
    auth: { token: tokenA },
    transports: ['websocket', 'polling'],
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Reconnection timeout')), 10000);
    socketA.on('connect', () => {
      clearTimeout(timer);
      console.log('✔ Client A reconnected to production WSS successfully.');
      resolve();
    });
  });

  // STEP 18: Presence
  console.log('\n▶ [18/18] Testing Real-time Presence Broadcasts...');
  const presenceOfflinePromise = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Presence offline timeout')), 10000);
    socketA.on(SOCKET_EVENTS.PRESENCE_UPDATE, (data: any) => {
      if (data.presence && data.presence.userId === userBId && data.presence.status === 'OFFLINE') {
        clearTimeout(timer);
        console.log(`✔ Client A received OFFLINE presence broadcast for Client B.`);
        resolve();
      }
    });
  });

  socketB.disconnect();
  await presenceOfflinePromise;

  // Clean disconnect
  socketA.disconnect();

  console.log('\n=============================================================');
  console.log('    ALL 18 PRODUCTION INTERNET VERIFICATION CHECKS PASSED!   ');
  console.log('=============================================================\n');
}

runProductionTests().catch((err) => {
  console.error('\n❌ PRODUCTION TEST ERROR:', err);
  process.exit(1);
});
