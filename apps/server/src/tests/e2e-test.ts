import http from 'http';
import express from 'express';
import cors from 'cors';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { runMigrations, getDatabaseClient } from '@null/database';
import apiRoutes from '../routes';
import { getSocketManager } from '../sockets/socket.manager';
import { SOCKET_EVENTS } from '@null/shared';

const TEST_PORT = 4100;
const TEST_HOST = '127.0.0.1';
const BASE_URL = `http://${TEST_HOST}:${TEST_PORT}`;

// Helper fetch wrapper
async function apiCall(endpoint: string, method: string = 'GET', body?: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  return { status: res.status, ok: res.ok, data: json };
}

async function runE2ETest() {
  console.log('\n======================================================');
  console.log('       NULL PROTOCOL: END-TO-END VERIFICATION         ');
  console.log('======================================================\n');

  // 1. Run migrations
  console.log('▶ Step 1: Running database migrations...');
  await runMigrations();
  console.log('✔ Migrations verified.\n');

  // 2. Start test server
  console.log('▶ Step 2: Bootstrapping test server & Socket.IO...');
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', apiRoutes);

  const server = http.createServer(app);
  const socketMgr = getSocketManager();
  socketMgr.initialize(server);

  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, TEST_HOST, () => {
      console.log(`✔ Test server listening on ${BASE_URL}`);
      resolve();
    });
  });

  // Verify health endpoint
  const healthRes = await apiCall('/api/health');
  if (!healthRes.ok || healthRes.data.status !== 'ok') {
    throw new Error('Health check failed');
  }
  console.log('✔ Health endpoint verified:', healthRes.data.database.engine, '\n');

  // 3. User Registration
  console.log('▶ Step 3: Registering Operator Alpha & Operator Bravo...');
  const alphaUser = `alpha_${Date.now()}`;
  const bravoUser = `bravo_${Date.now()}`;

  const regA = await apiCall('/api/auth/register', 'POST', {
    username: alphaUser,
    displayName: 'Operator Alpha',
    email: `${alphaUser}@null.test`,
    password: 'password123',
  });
  if (!regA.ok) throw new Error(`Alpha registration failed: ${JSON.stringify(regA.data)}`);
  const tokenA = regA.data.data.tokens.accessToken;
  const userAId = regA.data.data.user.id;
  console.log(`✔ Operator Alpha registered: @${alphaUser} (ID: ${userAId})`);

  const regB = await apiCall('/api/auth/register', 'POST', {
    username: bravoUser,
    displayName: 'Operator Bravo',
    email: `${bravoUser}@null.test`,
    password: 'password123',
  });
  if (!regB.ok) throw new Error(`Bravo registration failed: ${JSON.stringify(regB.data)}`);
  const tokenB = regB.data.data.tokens.accessToken;
  const userBId = regB.data.data.user.id;
  console.log(`✔ Operator Bravo registered: @${bravoUser} (ID: ${userBId})\n`);

  // 4. Connect WebSockets
  console.log('▶ Step 4: Connecting real WebSockets for both operators...');
  const socketA: ClientSocketType = ClientSocket(BASE_URL, {
    auth: { token: tokenA },
    transports: ['websocket'],
  });

  const socketB: ClientSocketType = ClientSocket(BASE_URL, {
    auth: { token: tokenB },
    transports: ['websocket'],
  });

  await Promise.all([
    new Promise<void>((res) => socketA.on('connect', () => res())),
    new Promise<void>((res) => socketB.on('connect', () => res())),
  ]);
  console.log('✔ Sockets authenticated and connected.\n');

  // 5. User Search & Friend Request Flow
  console.log('▶ Step 5: User Search & Friend Request...');
  const searchRes = await apiCall(`/api/friends/search?q=${bravoUser}`, 'GET', undefined, tokenA);
  if (!searchRes.ok || searchRes.data.data.length === 0) {
    throw new Error('Operator search failed');
  }
  console.log(`✔ Operator Alpha found @${bravoUser} via search.`);

  // Listen for friend request on Bravo socket
  const frPromise = new Promise<void>((resolve) => {
    socketB.on(SOCKET_EVENTS.FRIEND_REQUEST_RECEIVED, () => {
      console.log('✔ Real-time notification: Operator Bravo received friend request on WebSocket.');
      resolve();
    });
  });

  const sendFrRes = await apiCall('/api/friends/request', 'POST', { targetUsername: bravoUser }, tokenA);
  if (!sendFrRes.ok) throw new Error(`Send friend request failed: ${JSON.stringify(sendFrRes.data)}`);
  console.log('✔ Friend request sent via REST.');
  await frPromise;

  // Bravo checks pending requests
  const pendingRes = await apiCall('/api/friends/requests', 'GET', undefined, tokenB);
  const incoming = pendingRes.data.data.incoming;
  if (!incoming || incoming.length === 0) throw new Error('Pending request not listed for Bravo');
  const requestId = incoming[0].id;

  // Bravo accepts request
  const acceptRes = await apiCall('/api/friends/respond', 'POST', { requestId, action: 'ACCEPT' }, tokenB);
  if (!acceptRes.ok) throw new Error('Accepting friend request failed');
  console.log('✔ Operator Bravo accepted friend request (bilateral friendship formed).\n');

  // 6. Direct Messaging Flow & Real-time Sockets
  console.log('▶ Step 6: Direct Messaging & Real-time Delivery...');
  const convsRes = await apiCall('/api/conversations', 'GET', undefined, tokenA);
  if (!convsRes.ok || convsRes.data.data.length === 0) {
    throw new Error('Direct conversation not found for Alpha');
  }
  const directConv = convsRes.data.data[0];
  console.log(`✔ Direct conversation active (ID: ${directConv.id})`);

  // Bravo verifies typing indicator
  const typingPromise = new Promise<void>((resolve) => {
    socketB.on(SOCKET_EVENTS.TYPING_UPDATE, (data: any) => {
      if (data.isTyping && data.username === alphaUser) {
        console.log('✔ Real-time typing indicator received by Operator Bravo.');
        resolve();
      }
    });
  });

  // Alpha sends typing indicator
  socketA.emit(SOCKET_EVENTS.TYPING_START, { conversationId: directConv.id });
  await typingPromise;

  // Alpha transmits message to Bravo
  const msgText1 = 'Transmission 01: Secure channel established.';
  const msgPromise1 = new Promise<any>((resolve) => {
    socketB.on(SOCKET_EVENTS.MESSAGE_NEW, (payload: any) => {
      console.log('✔ Real-time message delivered to Operator Bravo:', payload.message.content);
      resolve(payload.message);
    });
  });

  const sendMsgRes1 = await apiCall(
    '/api/messages',
    'POST',
    { conversationId: directConv.id, content: msgText1 },
    tokenA
  );
  if (!sendMsgRes1.ok) throw new Error('Failed to send message 1');
  const msg1 = await msgPromise1;

  // Bravo replies to Alpha
  const msgText2 = 'Transmission 02: Acknowledged. Link operational.';
  const msgPromise2 = new Promise<any>((resolve) => {
    socketA.on(SOCKET_EVENTS.MESSAGE_NEW, (payload: any) => {
      console.log('✔ Real-time reply delivered to Operator Alpha:', payload.message.content);
      resolve(payload.message);
    });
  });

  const sendMsgRes2 = await apiCall(
    '/api/messages',
    'POST',
    { conversationId: directConv.id, content: msgText2 },
    tokenB
  );
  if (!sendMsgRes2.ok) throw new Error('Failed to send message 2');
  const msg2 = await msgPromise2;

  // 7. Message History & Persistence Verification
  console.log('\n▶ Step 7: Verifying Database Message History & Ordering...');
  const historyRes = await apiCall(`/api/messages?conversationId=${directConv.id}`, 'GET', undefined, tokenA);
  if (!historyRes.ok || historyRes.data.data.length < 2) {
    throw new Error('Message history retrieval failed');
  }
  const history = historyRes.data.data;
  console.log(`✔ Retrieved ${history.length} messages from database.`);
  console.log(`  [1] ${history[0].sender.username}: "${history[0].content}"`);
  console.log(`  [2] ${history[1].sender.username}: "${history[1].content}"`);

  // 8. Read Receipt Verification
  console.log('\n▶ Step 8: Read Receipts...');
  const readPromise = new Promise<void>((resolve) => {
    socketA.on(SOCKET_EVENTS.MESSAGE_READ, (data: any) => {
      console.log(`✔ Read receipt broadcast received by Alpha (read by: ${data.userId})`);
      resolve();
    });
  });
  await apiCall(`/api/messages/read/${directConv.id}`, 'POST', undefined, tokenB);
  await readPromise;

  // 9. Message Deletion Verification
  console.log('\n▶ Step 9: Message Deletion...');
  const deletePromise = new Promise<void>((resolve) => {
    socketB.on(SOCKET_EVENTS.MESSAGE_DELETED, (data: any) => {
      if (data.messageId === msg1.id) {
        console.log(`✔ Real-time message deletion event received by Bravo for message ${data.messageId}`);
        resolve();
      }
    });
  });

  const delRes = await apiCall(`/api/messages/${msg1.id}`, 'DELETE', undefined, tokenA);
  if (!delRes.ok) throw new Error('Failed to delete message');
  await deletePromise;

  const historyAfterDel = await apiCall(`/api/messages?conversationId=${directConv.id}`, 'GET', undefined, tokenA);
  const deletedMsg = historyAfterDel.data.data.find((m: any) => m.id === msg1.id);
  if (!deletedMsg.isDeleted || deletedMsg.content !== 'This message was deleted') {
    throw new Error('Message not properly marked deleted in database');
  }
  console.log('✔ Message state in database verified: isDeleted = true, content masked.\n');

  // 10. Private Group Room Verification
  console.log('▶ Step 10: Private Group Rooms...');
  const roomRes = await apiCall(
    '/api/conversations/rooms',
    'POST',
    {
      title: 'Null Ops Citadel',
      description: 'Tactical Coordination',
      memberUsernames: [bravoUser],
    },
    tokenA
  );
  if (!roomRes.ok) throw new Error(`Room creation failed: ${JSON.stringify(roomRes.data)}`);
  const room = roomRes.data.data;
  console.log(`✔ Private room created: "${room.title}" (Members: ${room.members.length})`);

  // Verify Bravo sees the room
  const bravoRooms = await apiCall('/api/conversations', 'GET', undefined, tokenB);
  const foundRoom = bravoRooms.data.data.find((c: any) => c.id === room.id);
  if (!foundRoom) throw new Error('Bravo did not find invited room');
  console.log('✔ Operator Bravo verified membership in room.\n');

  // 11. Presence & Disconnection Verification
  console.log('▶ Step 11: Real-time Presence & Disconnect Handling...');
  const presencePromise = new Promise<void>((resolve) => {
    socketB.on(SOCKET_EVENTS.PRESENCE_UPDATE, (data: any) => {
      if (data.presence.userId === userAId && data.presence.status === 'OFFLINE') {
        console.log('✔ Operator Bravo received OFFLINE presence broadcast for Operator Alpha.');
        resolve();
      }
    });
  });

  socketA.disconnect();
  await presencePromise;

  // Cleanup
  socketB.disconnect();
  await new Promise<void>((res) => server.close(() => res()));
  const db = getDatabaseClient();
  await db.close();

  console.log('\n======================================================');
  console.log('     ALL 11 END-TO-END VERIFICATION SUITES PASSED!     ');
  console.log('======================================================\n');
}

runE2ETest().catch((err) => {
  console.error('\n❌ E2E VERIFICATION FAILED:', err);
  process.exit(1);
});
