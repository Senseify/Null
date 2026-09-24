import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

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
    return { status: res.status, ok: res.ok, headers: res.headers, data: json };
  } else {
    const buffer = Buffer.from(await res.arrayBuffer());
    return { status: res.status, ok: res.ok, headers: res.headers, data: buffer };
  }
}

async function runStorageVerification() {
  console.log('===========================================================');
  console.log('       NULL STORAGE & ATTACHMENT VERIFICATION SUITE       ');
  console.log(`       Target: ${PROD_URL}`);
  console.log('===========================================================\n');

  // STEP 0: Check Health
  const healthRes = await apiCall('/api/health');
  if (!healthRes.ok) {
    throw new Error(`Backend not accessible: ${healthRes.status}`);
  }
  console.log(`✔ Backend Health: 200 OK (Uptime: ${healthRes.data.uptimeSeconds}s)`);

  // STEP 1: Authorization Check (Unauthenticated upload must fail)
  console.log('\n▶ [TEST 4A] Testing Authorization on Upload Endpoint...');
  const unauthFormData = new FormData();
  const dummyBlob = new Blob(['unauthorized test payload']);
  (unauthFormData as any).append('file', dummyBlob, 'unauth.txt');

  const unauthRes = await apiCall('/api/attachments/upload', 'POST', unauthFormData, undefined, true);
  if (unauthRes.status === 401) {
    console.log('✔ Unauthenticated upload rejected with HTTP 401 Unauthorized (PASS)');
  } else {
    throw new Error(`Expected 401 Unauthorized for unauthenticated upload, got ${unauthRes.status}`);
  }

  // Register an authenticated operator
  console.log('\n▶ Registering operator for authenticated storage operations...');
  const testUser = `storage_tester_${Date.now()}`;
  const regRes = await apiCall('/api/auth/register', 'POST', {
    username: testUser,
    displayName: 'Storage Test Operator',
    email: `${testUser}@null.storage`,
    password: 'StoragePassword123!',
  });
  if (!regRes.ok) throw new Error(`Operator registration failed: ${JSON.stringify(regRes.data)}`);
  const token = regRes.data.data.tokens.accessToken;
  console.log(`✔ Operator authenticated: @${testUser}`);

  // STEP 2: TEST 1 - Upload Real Test Attachment
  console.log('\n▶ [TEST 1] Uploading Real Attachment via Production API...');
  const originalContent = Buffer.from(
    'NULL Protocol Verified Storage Test File Payload\n' +
    'Timestamp: ' + new Date().toISOString() + '\n' +
    'Unique Entropy: ' + crypto.randomBytes(32).toString('hex') + '\n' +
    'Integrity Check: NULL-SUPABASE-S3-PERSISTENCE-PASS\n'
  );
  const originalSha256 = crypto.createHash('sha256').update(originalContent).digest('hex');
  const originalSize = originalContent.length;

  console.log(`  File size: ${originalSize} bytes`);
  console.log(`  Original SHA-256: ${originalSha256}`);

  const uploadFormData = new FormData();
  const fileBlob = new Blob([originalContent.toString('utf-8')]);
  (uploadFormData as any).append('file', fileBlob, 'null_persistence_test.txt');

  const uploadRes = await apiCall('/api/attachments/upload', 'POST', uploadFormData, token, true);
  if (!uploadRes.ok || !uploadRes.data.success) {
    throw new Error(`Attachment upload failed: ${JSON.stringify(uploadRes.data)}`);
  }

  const uploadedData = uploadRes.data.data;
  const attachmentUrl = uploadedData.url;
  const filename = path.basename(attachmentUrl);
  console.log(`✔ Upload succeeded!`);
  console.log(`  Assigned URL: ${attachmentUrl}`);
  console.log(`  Stored Object Key: ${filename}`);

  // Save details to scratch file for post-restart verification
  const recordPath = path.resolve(process.cwd(), 'data', 'latest_uploaded_attachment.json');
  fs.mkdirSync(path.dirname(recordPath), { recursive: true });
  fs.writeFileSync(
    recordPath,
    JSON.stringify(
      {
        url: attachmentUrl,
        filename,
        sha256: originalSha256,
        size: originalSize,
        uploadedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log(`✔ Attachment record saved locally to: ${recordPath}`);

  // STEP 3: TEST 2 - Retrieval and Byte Integrity
  console.log('\n▶ [TEST 2] Retrieving Attachment through Production API...');
  const retrieveRes = await apiCall(attachmentUrl, 'GET');
  if (!retrieveRes.ok) {
    throw new Error(`Failed to retrieve uploaded file: ${retrieveRes.status}`);
  }

  const contentType = retrieveRes.headers.get('content-type');
  const contentLength = retrieveRes.headers.get('content-length');
  console.log(`✔ HTTP Retrieval Success: status ${retrieveRes.status}`);
  console.log(`  Content-Type: ${contentType}`);
  console.log(`  Content-Length: ${contentLength}`);

  const downloadedBuffer: Buffer = retrieveRes.data;
  const downloadedSha256 = crypto.createHash('sha256').update(downloadedBuffer).digest('hex');
  console.log(`  Downloaded SHA-256: ${downloadedSha256}`);

  if (downloadedSha256 !== originalSha256) {
    throw new Error(`Byte integrity mismatch! Original: ${originalSha256}, Downloaded: ${downloadedSha256}`);
  }
  console.log('✔ Byte Integrity: 100% MATCH (PASS)');

  // STEP 4: TEST 4B - Nonexistent/404 handling
  console.log('\n▶ [TEST 4B] Testing Nonexistent File Access (404 Handling)...');
  const nonExistentRes = await apiCall('/api/attachments/nonexistent_file_0000000000000000.txt', 'GET');
  if (nonExistentRes.status === 404) {
    console.log('✔ Nonexistent attachment correctly returns HTTP 404 File Not Found (PASS)');
  } else {
    throw new Error(`Expected 404 for nonexistent file, got ${nonExistentRes.status}`);
  }

  console.log('\n===========================================================');
  console.log('       INITIAL STORAGE TESTS 1, 2 & 4 COMPLETED SUCCESSFULLY!  ');
  console.log('===========================================================\n');
}

runStorageVerification().catch((err) => {
  console.error('\n❌ STORAGE VERIFICATION FAILED:', err);
  process.exit(1);
});
