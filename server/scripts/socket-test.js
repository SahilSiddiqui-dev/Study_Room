const http = require('http');
const ioClient = require('socket.io-client');
const { server } = require('../src/server');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Room = require('../src/models/Room');
const StudySession = require('../src/models/StudySession');
const FocusEvent = require('../src/models/FocusEvent');
const env = require('../src/config/env');

const runSocketTest = async () => {
  console.log('--- StudyRoom Socket.IO Integration Test ---');
  await connectDB();

  // Clean previous socket test data
  const testEmails = ['socket_alice@studyroom.test', 'socket_bob@studyroom.test'];
  const testUsers = await User.find({ email: { $in: testEmails } });
  const testUserIds = testUsers.map((u) => u._id);
  const testSessions = await StudySession.find({ userId: { $in: testUserIds } });
  const testSessionIds = testSessions.map((s) => s._id);
  await FocusEvent.deleteMany({ sessionId: { $in: testSessionIds } });
  await StudySession.deleteMany({ _id: { $in: testSessionIds } });
  await Room.deleteMany({ hostId: { $in: testUserIds } });
  await User.deleteMany({ _id: { $in: testUserIds } });

  await new Promise((resolve) => server.listen(env.PORT, resolve));
  console.log(`Server listening on port ${env.PORT}`);

  const makeRequest = (options, postData) => {
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch (e) {
            parsed = body;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed,
            cookies: res.headers['set-cookie'] || [],
          });
        });
      });
      req.on('error', reject);
      if (postData) req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
      req.end();
    });
  };

  let aliceSocket = null;
  let bobSocket = null;

  try {
    // 1. Register & login Alice (host) and Bob (member)
    console.log('1. Registering Alice and Bob over HTTP...');
    const aliceReg = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { username: 'socket_alice', email: 'socket_alice@studyroom.test', password: 'Password123' }
    );
    const aliceCookie = aliceReg.cookies.find((c) => c.startsWith(`${env.COOKIE_NAME}=`)).split(';')[0];

    const bobReg = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { username: 'socket_bob', email: 'socket_bob@studyroom.test', password: 'Password123' }
    );
    const bobCookie = bobReg.cookies.find((c) => c.startsWith(`${env.COOKIE_NAME}=`)).split(';')[0];

    // 2. Alice creates a room
    const roomRes = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: '/api/rooms', method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: aliceCookie } },
      { name: 'Live Pomodoro Study', subject: 'Calculus' }
    );
    const roomId = roomRes.body.data.room._id;
    console.log('2. Room created with ID:', roomId);

    // 3. Alice starts an active study session
    const sessionRes = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: '/api/sessions', method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: aliceCookie } },
      { roomId, plannedMinutes: 25 }
    );
    console.log('3. Alice active study session started:', sessionRes.body.data.session._id);

    // 4. Connect two Socket.IO clients with their auth cookies
    console.log('4. Connecting Alice and Bob via Socket.IO with cookies...');
    const serverUrl = `http://127.0.0.1:${env.PORT}`;

    aliceSocket = ioClient(serverUrl, {
      extraHeaders: {
        Cookie: aliceCookie,
      },
      transportOptions: {
        polling: {
          extraHeaders: {
            Cookie: aliceCookie,
          },
        },
      },
    });

    bobSocket = ioClient(serverUrl, {
      extraHeaders: {
        Cookie: bobCookie,
      },
      transportOptions: {
        polling: {
          extraHeaders: {
            Cookie: bobCookie,
          },
        },
      },
    });

    await Promise.all([
      new Promise((resolve, reject) => {
        aliceSocket.on('connect', resolve);
        aliceSocket.on('connect_error', (e) => reject(new Error('Alice connect error: ' + e.message)));
      }),
      new Promise((resolve, reject) => {
        bobSocket.on('connect', resolve);
        bobSocket.on('connect_error', (e) => reject(new Error('Bob connect error: ' + e.message)));
      }),
    ]);
    console.log('   Both sockets authenticated & connected successfully.');

    // 5. Test Room Presence
    console.log('5. Testing room:join and presence de-duplication...');
    const presencePromise = new Promise((resolve) => {
      let count = 0;
      bobSocket.on('room:presence', (data) => {
        console.log('   Bob received room:presence update. Participants:', data.participants.map((p) => p.username));
        if (data.participants.length === 2) {
          resolve(data.participants);
        }
      });
    });

    aliceSocket.emit('room:join', { roomId });
    bobSocket.emit('room:join', { roomId });

    const participants = await presencePromise;
    if (participants.length !== 2) {
      throw new Error(`Expected 2 participants in presence, got ${participants.length}`);
    }
    console.log('   Presence verified successfully with 2 distinct members.');

    // 6. Test Timer Start & Sync
    console.log('6. Testing host timer:start and client timer:sync...');
    const timerSyncPromise = new Promise((resolve) => {
      bobSocket.on('timer:sync', (data) => {
        console.log(`   Bob received timer:sync -> Phase: ${data.phase}, Remaining: ${data.remainingSec}s, ServerTime: ${data.serverTime}`);
        resolve(data);
      });
    });

    aliceSocket.emit('timer:start', { roomId, focusMin: 25, breakMin: 5 });
    const timerSync = await timerSyncPromise;
    if (timerSync.phase !== 'focus' || timerSync.remainingSec <= 0) {
      throw new Error('Timer sync verification failed');
    }
    console.log('   Timer sync verified successfully.');

    // 7. Test focus:event with ack callback
    console.log('7. Testing focus:event with ack callback...');
    const ackResult = await new Promise((resolve) => {
      aliceSocket.emit(
        'focus:event',
        { type: 'tab_switch', durationSec: 12 },
        (ack) => resolve(ack)
      );
    });
    console.log('   Alice received focus:event ack:', ackResult);
    if (!ackResult.success || !ackResult.eventId) {
      throw new Error('focus:event ack callback failed');
    }

    console.log('\n--- All Socket.IO Integration Tests PASSED! ---\n');
  } catch (err) {
    console.error('Socket.IO test FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (aliceSocket) aliceSocket.disconnect();
    if (bobSocket) bobSocket.disconnect();

    const testUsers = await User.find({ email: { $in: ['socket_alice@studyroom.test', 'socket_bob@studyroom.test'] } });
    const testUserIds = testUsers.map((u) => u._id);
    const testSessions = await StudySession.find({ userId: { $in: testUserIds } });
    const testSessionIds = testSessions.map((s) => s._id);
    await FocusEvent.deleteMany({ sessionId: { $in: testSessionIds } });
    await StudySession.deleteMany({ _id: { $in: testSessionIds } });
    await Room.deleteMany({ hostId: { $in: testUserIds } });
    await User.deleteMany({ _id: { $in: testUserIds } });

    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  }
};

runSocketTest();
