import crypto from 'crypto';
import { io, Socket } from 'socket.io-client';

const PROD_URL = 'https://null-server-g543.onrender.com';

async function request(endpoint: string, method: string = 'GET', body?: any, token?: string, headers: Record<string, string> = {}) {
  const reqHeaders: Record<string, string> = { ...headers };
  if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
  if (body && !(body instanceof FormData) && typeof body === 'object') {
    reqHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${PROD_URL}${endpoint}`, {
    method,
    headers: reqHeaders,
    body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
  });

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await response.json();
    return { status: response.status, data, headers: response.headers };
  } else {
    const buffer = Buffer.from(await response.arrayBuffer());
    return { status: response.status, buffer, headers: response.headers };
  }
}

async function runProductionTests() {
  console.log('======================================================');
  console.log('   NULL PRODUCTION ATTACHMENT & SYSTEM VERIFICATION   ');
  console.log(`   Target: ${PROD_URL}`);
  console.log('======================================================\n');

  // Step 0: Health Check
  console.log('▶ [Pre-check] Verifying production health endpoint...');
  const health = await request('/api/health');
  if (health.status !== 200 || health.data?.status !== 'ok') {
    throw new Error(`Production health check failed: ${JSON.stringify(health.data)}`);
  }
  console.log(`✔ Production is LIVE!`);
  console.log(`  Database status: ${health.data.database.status} (${health.data.database.engine})`);
  console.log(`  Server uptime: ${health.data.uptimeSeconds}s\n`);

  // Step 1: Register two test operators for functional & auth tests
  const ts = Date.now();
  const u1Name = `qa_prod_a_${ts}`;
  const u2Name = `qa_prod_b_${ts}`;

  console.log('▶ [Auth] Registering test operators...');
  const reg1 = await request('/api/auth/register', 'POST', {
    username: u1Name,
    email: `${u1Name}@null.im`,
    password: 'Password123!',
    displayName: 'QA Prod Alpha',
  });
  if (reg1.status !== 201) throw new Error(`Operator 1 registration failed: ${JSON.stringify(reg1.data)}`);
  const token1 = reg1.data.data.tokens.accessToken;
  const user1 = reg1.data.data.user;
  console.log(`✔ Registered Operator 1: @${user1.username} (${user1.id})`);

  const reg2 = await request('/api/auth/register', 'POST', {
    username: u2Name,
    email: `${u2Name}@null.im`,
    password: 'Password123!',
    displayName: 'QA Prod Bravo',
  });
  if (reg2.status !== 201) throw new Error(`Operator 2 registration failed: ${JSON.stringify(reg2.data)}`);
  const token2 = reg2.data.data.tokens.accessToken;
  const user2 = reg2.data.data.user;
  console.log(`✔ Registered Operator 2: @${user2.username} (${user2.id})\n`);

  // ==========================================================
  // TEST 4 — Authorization & Security Checks
  // ==========================================================
  console.log('▶ [TEST 4 — Security & Authorization]');
  
  // 4a. Unauthenticated upload must be rejected
  const testBytes = crypto.randomBytes(4096);
  const testHash = crypto.createHash('sha256').update(testBytes).digest('hex');

  const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');
  const fileHeader = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="qa_secure_test.png"\r\nContent-Type: image/png\r\n\r\n`
  );
  const fileFooter = Buffer.from(`\r\n--${boundary}--\r\n`);
  const multipartBody = Buffer.concat([fileHeader, testBytes, fileFooter]);

  console.log('  Testing unauthenticated upload attempt...');
  const unauthUpload = await fetch(`${PROD_URL}/api/attachments/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: multipartBody,
  });
  if (unauthUpload.status === 401) {
    console.log(`✔ Unauthenticated upload correctly rejected with HTTP 401 Unauthorized.`);
  } else {
    throw new Error(`Security violation: Unauthenticated upload returned status ${unauthUpload.status}`);
  }

  // 4b. Nonexistent attachment retrieval returns 404
  console.log('  Testing nonexistent attachment retrieval...');
  const nonExistent = await request('/api/attachments/nonexistent-key-999999.png');
  if (nonExistent.status === 404) {
    console.log(`✔ Nonexistent attachment correctly returned HTTP 404 Not Found.`);
  } else {
    throw new Error(`Expected 404 for nonexistent file, got ${nonExistent.status}`);
  }
  console.log('✔ TEST 4 Authorization & Security: PASS\n');

  // ==========================================================
  // TEST 1 — Upload
  // ==========================================================
  console.log('▶ [TEST 1 — Upload]');
  console.log(`  Payload: 4096-byte PNG image`);
  console.log(`  Original SHA-256: ${testHash}`);

  const authUploadRes = await fetch(`${PROD_URL}/api/attachments/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token1}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  const uploadResult = await authUploadRes.json();
  if (authUploadRes.status !== 201 || !uploadResult.success) {
    throw new Error(`Upload failed (${authUploadRes.status}): ${JSON.stringify(uploadResult)}`);
  }

  const attachmentData = uploadResult.data;
  const objectKey = attachmentData.url.replace('/api/attachments/', '');
  console.log(`✔ Upload succeeded (HTTP 201)!`);
  console.log(`  Attachment URL: ${attachmentData.url}`);
  console.log(`  Object Key / Filename: ${objectKey}`);
  console.log(`  Reported Name: ${attachmentData.name}`);
  console.log(`  Reported Size: ${attachmentData.size} bytes`);
  console.log(`  Reported MIME: ${attachmentData.mimeType}`);
  console.log(`  Is Image: ${attachmentData.isImage}`);
  console.log('✔ TEST 1 Upload: PASS\n');

  // ==========================================================
  // TEST 2 — Retrieval & Byte Integrity
  // ==========================================================
  console.log('▶ [TEST 2 — Retrieval & Byte Integrity]');
  const retrieveRes = await request(attachmentData.url);
  if (retrieveRes.status !== 200) {
    throw new Error(`Retrieval failed with HTTP ${retrieveRes.status}`);
  }

  const contentType = retrieveRes.headers.get('content-type');
  const contentLength = retrieveRes.headers.get('content-length');
  console.log(`✔ HTTP 200 OK on retrieval.`);
  console.log(`  Received Content-Type: ${contentType}`);
  console.log(`  Received Content-Length: ${contentLength} bytes`);

  if (!contentType?.includes('image/png')) {
    console.warn(`⚠️ Content-Type mismatch: expected image/png, got ${contentType}`);
  }

  const downloadedBytes = retrieveRes.buffer as Buffer;
  const downloadedHash = crypto.createHash('sha256').update(downloadedBytes).digest('hex');
  console.log(`  Downloaded Byte Length: ${downloadedBytes.length} bytes`);
  console.log(`  Downloaded SHA-256:    ${downloadedHash}`);

  if (downloadedBytes.length !== testBytes.length) {
    throw new Error(`Byte length mismatch: sent ${testBytes.length}, received ${downloadedBytes.length}`);
  }
  if (downloadedHash !== testHash) {
    throw new Error(`Byte integrity checksum mismatch!`);
  }
  console.log(`✔ Byte integrity verified 100% (Exact SHA-256 match).`);
  console.log('✔ TEST 2 Retrieval: PASS\n');

  // ==========================================================
  // TEST 5 — Existing NULL Functionality on Production
  // ==========================================================
  console.log('▶ [TEST 5 — Existing NULL Functionality Verification]');

  // 5a. Friends: Send & Accept
  console.log('  Testing Friend request & bilateral friendship...');
  const friendReq = await request('/api/friends/request', 'POST', {
    targetUsername: u2Name,
  }, token1);
  if (friendReq.status !== 200 && friendReq.status !== 201) {
    throw new Error(`Friend request failed: ${JSON.stringify(friendReq.data)}`);
  }

  const pendingList = await request('/api/friends/requests', 'GET', undefined, token2);
  const incoming = pendingList.data?.data?.incoming || pendingList.data?.incoming || [];
  if (incoming.length === 0) throw new Error('Incoming friend request not found on Bravo');
  const targetReq = incoming[0];

  const acceptRes = await request('/api/friends/respond', 'POST', {
    requestId: targetReq.id,
    action: 'ACCEPT',
  }, token2);
  if (acceptRes.status !== 200) throw new Error(`Accept friend request failed: ${JSON.stringify(acceptRes.data)}`);

  const friendsList = await request('/api/friends/list', 'GET', undefined, token1);
  const friends = friendsList.data?.data || friendsList.data || [];
  if (!friends.some((f: any) => f.user?.username === u2Name || f.username === u2Name)) {
    throw new Error('Bilateral friendship not found in friend list');
  }
  console.log('  ✔ Friend request & bilateral friendship verified.');

  // 5b. Direct Messaging & Attachment Message
  console.log('  Testing Direct Messaging with attachment...');
  const convRes = await request('/api/conversations/direct', 'POST', {
    targetUserId: user2.id,
  }, token1);
  if (convRes.status !== 200 && convRes.status !== 201) {
    throw new Error(`Direct conversation failed: ${JSON.stringify(convRes.data)}`);
  }
  const directConv = convRes.data.data;

  // Send message with attachment
  const msgRes = await request('/api/messages', 'POST', {
    conversationId: directConv.id,
    content: 'Attached file for verification',
    type: 'IMAGE',
    attachmentUrl: attachmentData.url,
    attachmentName: attachmentData.name,
    attachmentSize: attachmentData.size,
    attachmentMime: attachmentData.mimeType,
  }, token1);
  if (msgRes.status !== 201) throw new Error(`Send message failed: ${JSON.stringify(msgRes.data)}`);
  console.log(`  ✔ Message with attachment sent (ID: ${msgRes.data.data.id})`);

  // 5c. Private Group Rooms
  console.log('  Testing Private Group Room creation & messaging...');
  const roomRes = await request('/api/conversations/rooms', 'POST', {
    title: 'Prod Storage Citadel',
    memberUsernames: [u2Name],
  }, token1);
  if (roomRes.status !== 200 && roomRes.status !== 201) throw new Error(`Create room failed: ${JSON.stringify(roomRes.data)}`);
  const roomConv = roomRes.data.data;

  const roomMsgRes = await request('/api/messages', 'POST', {
    conversationId: roomConv.id,
    content: 'Testing room communication in production',
    type: 'TEXT',
  }, token2);
  if (roomMsgRes.status !== 200 && roomMsgRes.status !== 201) throw new Error(`Send room message failed: ${JSON.stringify(roomMsgRes.data)}`);
  console.log(`  ✔ Room message dispatched by Bravo in private room`);

  // 5d. Realtime WebSockets over WSS
  console.log('  Testing Real-time WebSockets over HTTPS/WSS...');
  const socketPromise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      sock.disconnect();
      reject(new Error('WebSocket connection timed out'));
    }, 15000);

    const sock: Socket = io(PROD_URL, {
      auth: { token: token1 },
      transports: ['websocket', 'polling'],
    });

    sock.on('connect', () => {
      clearTimeout(timeout);
      console.log(`  ✔ WebSocket connected and authenticated over WSS (Socket ID: ${sock.id})`);
      sock.disconnect();
      resolve();
    });

    sock.on('connect_error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  await socketPromise;
  console.log('✔ TEST 5 Existing NULL Functionality: ALL PASS\n');

  console.log('======================================================');
  console.log('SUMMARY FOR PERSISTENCE CHECK:');
  console.log(`Uploaded Attachment URL: ${PROD_URL}${attachmentData.url}`);
  console.log(`Object Key: ${objectKey}`);
  console.log(`Expected SHA-256: ${testHash}`);
  console.log(`Expected Size: ${testBytes.length} bytes`);
  console.log('======================================================\n');

  return {
    attachmentUrl: attachmentData.url,
    objectKey,
    testHash,
    testBytesLength: testBytes.length,
    initialUptime: health.data.uptimeSeconds,
  };
}

runProductionTests().then((res) => {
  console.log('Initial test run complete. Output info for persistence test:', JSON.stringify(res));
  process.exit(0);
}).catch((err) => {
  console.error('\n❌ PRODUCTION TEST FAILED:', err);
  process.exit(1);
});
