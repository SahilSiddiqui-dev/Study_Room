const http = require('http');
const { server } = require('../src/server');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const env = require('../src/config/env');

const runVerification = async () => {
  console.log('Connecting to DB for Phase 3 verification...');
  await connectDB();

  await User.deleteMany({ email: 'phase3_user@studyroom.test' });

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
    // 1. GET /api/users/avatars (public)
    const avatarsRes = await makeRequest({
      hostname: '127.0.0.1',
      port: env.PORT,
      path: '/api/users/avatars',
      method: 'GET',
    });
    console.log('1. Avatars response:', avatarsRes.statusCode, avatarsRes.body);
    if (avatarsRes.statusCode !== 200 || !Array.isArray(avatarsRes.body.data.avatars)) {
      throw new Error('Get avatars failed');
    }

    // 2. Register user for tests
    const regRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: env.PORT,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        username: 'phase3_user',
        email: 'phase3_user@studyroom.test',
        password: 'Password123',
        avatar: 'owl',
      }
    );
    const authCookie = regRes.cookies.find((c) => c.startsWith(`${env.COOKIE_NAME}=`)).split(';')[0];

    // 3. GET /api/users/me (protected)
    const meRes = await makeRequest({
      hostname: '127.0.0.1',
      port: env.PORT,
      path: '/api/users/me',
      method: 'GET',
      headers: { Cookie: authCookie },
    });
    console.log('3. GET /users/me response:', meRes.statusCode, meRes.body);
    if (meRes.statusCode !== 200 || meRes.body.data.user.username !== 'phase3_user') {
      throw new Error('GET /users/me failed');
    }

    // 4. PATCH /api/users/me (update avatar and timezone)
    const updateRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: env.PORT,
        path: '/api/users/me',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      },
      {
        avatar: 'fox',
        timezone: 'America/New_York',
      }
    );
    console.log('4. PATCH /users/me response:', updateRes.statusCode, updateRes.body);
    if (
      updateRes.statusCode !== 200 ||
      updateRes.body.data.user.avatar !== 'fox' ||
      updateRes.body.data.user.timezone !== 'America/New_York'
    ) {
      throw new Error('PATCH /users/me failed');
    }

    // 5. PATCH /api/users/me with invalid avatar -> 400
    const invalidAvatarRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: env.PORT,
        path: '/api/users/me',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      },
      {
        avatar: 'dragon',
      }
    );
    console.log('5. Invalid avatar response:', invalidAvatarRes.statusCode, invalidAvatarRes.body);
    if (invalidAvatarRes.statusCode !== 400) {
      throw new Error('Invalid avatar did not return 400');
    }

    // 6. PATCH /api/users/me/password with wrong current password -> 400
    const wrongPassRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: env.PORT,
        path: '/api/users/me/password',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      },
      {
        currentPassword: 'WrongPassword1',
        newPassword: 'NewPassword123',
      }
    );
    console.log('6. Wrong current password response:', wrongPassRes.statusCode, wrongPassRes.body);
    if (wrongPassRes.statusCode !== 400) {
      throw new Error('Wrong current password did not return 400');
    }

    // 7. PATCH /api/users/me/password with valid passwords -> 200
    const changePassRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: env.PORT,
        path: '/api/users/me/password',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      },
      {
        currentPassword: 'Password123',
        newPassword: 'NewPassword123',
      }
    );
    console.log('7. Change password response:', changePassRes.statusCode, changePassRes.body);
    if (changePassRes.statusCode !== 200) {
      throw new Error('Change password failed');
    }

    // 8. Verify login with new password succeeds
    const newLoginRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: env.PORT,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        email: 'phase3_user@studyroom.test',
        password: 'NewPassword123',
      }
    );
    console.log('8. Login with new password response:', newLoginRes.statusCode, newLoginRes.body);
    if (newLoginRes.statusCode !== 200) {
      throw new Error('Login with new password failed');
    }

    // 9. GET /api/users/phase3_user (public profile: username, avatar, createdAt only)
    const pubRes = await makeRequest({
      hostname: '127.0.0.1',
      port: env.PORT,
      path: '/api/users/phase3_user',
      method: 'GET',
    });
    console.log('9. Public profile response:', pubRes.statusCode, pubRes.body);
    if (pubRes.statusCode !== 200 || !pubRes.body.data.profile) {
      throw new Error('Public profile failed');
    }
    const profile = pubRes.body.data.profile;
    if (profile.email || profile.role || profile.passwordHash || !profile.username || !profile.avatar || !profile.createdAt) {
      throw new Error('Public profile leaked sensitive fields or missing expected fields');
    }

    // 10. GET /api/users/non_existent -> 404
    const notFoundRes = await makeRequest({
      hostname: '127.0.0.1',
      port: env.PORT,
      path: '/api/users/non_existent_user',
      method: 'GET',
    });
    console.log('10. Non-existent user response:', notFoundRes.statusCode, notFoundRes.body);
    if (notFoundRes.statusCode !== 404) {
      throw new Error('Non-existent user did not return 404');
    }

    console.log('\nAll Phase 3 verifications PASSED!\n');
  } catch (err) {
    console.error('Phase 3 verification FAILED:', err);
    process.exitCode = 1;
  } finally {
    await User.deleteMany({ email: 'phase3_user@studyroom.test' });
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  }
};

runVerification();

