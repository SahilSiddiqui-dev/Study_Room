const http = require('http');
const { server } = require('../src/server');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Room = require('../src/models/Room');
const env = require('../src/config/env');

const runVerification = async () => {
  console.log('Connecting to DB for Phase 4 verification...');
  await connectDB();

  await User.deleteMany({ email: { $in: ['phase4_alice@studyroom.test', 'phase4_bob@studyroom.test'] } });
  await Room.deleteMany({ name: { $in: ['Algorithms Study', 'Deep Learning Seminar', 'Algorithms & Data Structures'] } });

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

  try {
    // 1. Register Alice and Bob
    const aliceReg = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { username: 'phase4_alice', email: 'phase4_alice@studyroom.test', password: 'Password123' }
    );
    const aliceCookie = aliceReg.cookies.find((c) => c.startsWith(`${env.COOKIE_NAME}=`)).split(';')[0];

    const bobReg = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { username: 'phase4_bob', email: 'phase4_bob@studyroom.test', password: 'Password123' }
    );
    const bobCookie = bobReg.cookies.find((c) => c.startsWith(`${env.COOKIE_NAME}=`)).split(';')[0];

    // 2. Alice creates public room
    const pubRoomRes = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: '/api/rooms', method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: aliceCookie } },
      { name: 'Algorithms Study', subject: 'Computer Science', isPrivate: false }
    );
    console.log('2. Alice public room create response:', pubRoomRes.statusCode, pubRoomRes.body.data.room.name);
    if (pubRoomRes.statusCode !== 201 || pubRoomRes.body.data.room.isPrivate !== false) {
      throw new Error('Public room creation failed');
    }
    const pubRoomId = pubRoomRes.body.data.room._id;

    // 3. Alice creates private room
    const privRoomRes = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: '/api/rooms', method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: aliceCookie } },
      { name: 'Deep Learning Seminar', subject: 'AI', isPrivate: true }
    );
    console.log('3. Alice private room create response:', privRoomRes.statusCode, 'joinCode:', privRoomRes.body.data.room.joinCode);
    if (privRoomRes.statusCode !== 201 || !privRoomRes.body.data.room.joinCode || privRoomRes.body.data.room.joinCode.length !== 6) {
      throw new Error('Private room creation failed or joinCode missing for host');
    }
    const privRoomId = privRoomRes.body.data.room._id;
    const joinCode = privRoomRes.body.data.room.joinCode;

    // 4. Bob lists rooms (should see public room, but NOT private room)
    const bobRoomsRes = await makeRequest({
      hostname: '127.0.0.1', port: env.PORT, path: '/api/rooms', method: 'GET', headers: { Cookie: bobCookie }
    });
    console.log('4. Bob lists rooms count:', bobRoomsRes.body.data.rooms.length);
    const sawPrivateRoom = bobRoomsRes.body.data.rooms.some((r) => r._id === privRoomId);
    if (sawPrivateRoom) {
      throw new Error('Bob can see a private room he does not belong to');
    }

    // 5. Bob tries to PATCH Alice's room -> 403
    const bobPatchRes = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: `/api/rooms/${pubRoomId}`, method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: bobCookie } },
      { name: 'Bob Hacked This Room' }
    );
    console.log('5. Bob PATCH Alice room response:', bobPatchRes.statusCode, bobPatchRes.body.message);
    if (bobPatchRes.statusCode !== 403) {
      throw new Error('Non-host PATCH did not return 403');
    }

    // 6. Bob tries to DELETE Alice's room -> 403
    const bobDeleteRes = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: `/api/rooms/${pubRoomId}`, method: 'DELETE', headers: { Cookie: bobCookie } }
    );
    console.log('6. Bob DELETE Alice room response:', bobDeleteRes.statusCode, bobDeleteRes.body.message);
    if (bobDeleteRes.statusCode !== 403) {
      throw new Error('Non-host DELETE did not return 403');
    }

    // 7. Bob joins private room with wrong joinCode -> 403
    const bobWrongJoinRes = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: `/api/rooms/${privRoomId}/join`, method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: bobCookie } },
      { joinCode: 'WRONG1' }
    );
    console.log('7. Bob wrong join code response:', bobWrongJoinRes.statusCode);
    if (bobWrongJoinRes.statusCode !== 403) {
      throw new Error('Wrong join code did not return 403');
    }

    // 8. Bob joins private room with correct joinCode -> 200
    const bobJoinRes = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: `/api/rooms/${privRoomId}/join`, method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: bobCookie } },
      { joinCode }
    );
    console.log('8. Bob join response:', bobJoinRes.statusCode, 'Bob received joinCode?', bobJoinRes.body.data.room.joinCode);
    if (bobJoinRes.statusCode !== 200 || bobJoinRes.body.data.room.joinCode !== undefined) {
      throw new Error('Join private room failed or leaked joinCode to non-host');
    }

    // 9. Bob joins AGAIN -> 200, participants not duplicated
    const bobRepeatJoinRes = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: `/api/rooms/${privRoomId}/join`, method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: bobCookie } },
      { joinCode }
    );
    const participantCount = bobRepeatJoinRes.body.data.room.participants.length;
    console.log('9. Repeat join participant count:', participantCount);
    if (participantCount !== 2) {
      throw new Error(`Repeat join duplicated participant! Expected 2, got ${participantCount}`);
    }

    // 10. Alice updates public room
    const aliceUpdateRes = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: `/api/rooms/${pubRoomId}`, method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: aliceCookie } },
      { name: 'Algorithms & Data Structures' }
    );
    console.log('10. Alice update room response:', aliceUpdateRes.statusCode, aliceUpdateRes.body.data.room.name);
    if (aliceUpdateRes.statusCode !== 200 || aliceUpdateRes.body.data.room.name !== 'Algorithms & Data Structures') {
      throw new Error('Host update room failed');
    }

    // 11. Alice deletes public room (sets status closed)
    const aliceDeleteRes = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: `/api/rooms/${pubRoomId}`, method: 'DELETE', headers: { Cookie: aliceCookie } }
    );
    console.log('11. Alice delete room response:', aliceDeleteRes.statusCode, aliceDeleteRes.body.message);
    if (aliceDeleteRes.statusCode !== 200) {
      throw new Error('Host delete room failed');
    }

    // 12. Bob fetches closed room -> 404
    const getClosedRes = await makeRequest({
      hostname: '127.0.0.1', port: env.PORT, path: `/api/rooms/${pubRoomId}`, method: 'GET', headers: { Cookie: bobCookie }
    });
    console.log('12. Fetch closed room response:', getClosedRes.statusCode);
    if (getClosedRes.statusCode !== 404) {
      throw new Error('Fetching closed room did not return 404');
    }

    console.log('\nAll Phase 4 verifications PASSED!\n');
  } catch (err) {
    console.error('Phase 4 verification FAILED:', err);
    process.exitCode = 1;
  } finally {
    await User.deleteMany({ email: { $in: ['phase4_alice@studyroom.test', 'phase4_bob@studyroom.test'] } });
    await Room.deleteMany({ name: { $in: ['Algorithms Study', 'Deep Learning Seminar', 'Algorithms & Data Structures'] } });
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  }
};

runVerification();

