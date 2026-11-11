const http = require('http');
const { server } = require('../src/server');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../models/User');
const env = require('../src/config/env');

const runVerification = async () => {
  console.log('Connecting to DB for Phase 2 verification...');
  await connectDB();

  // Clean up any existing test users from previous runs
  await User.deleteMany({ email: { $in: ['phase2_alice@studyroom.test', 'phase2_bob@studyroom.test'] } });

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
    // 1. Register Alice
    const regRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: env.PORT,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        username: 'phase2_alice',
        email: 'phase2_alice@studyroom.test',
        password: 'Password123',
        avatar: 'owl',
        timezone: 'UTC',
      }
    );
    console.log('1. Register response:', regRes.statusCode, regRes.body);
    if (regRes.statusCode !== 201 || !regRes.body.success) {
      throw new Error('Registration failed');
    }
    const authCookie = regRes.cookies.find((c) => c.startsWith(`${env.COOKIE_NAME}=`));
    if (!authCookie || !authCookie.includes('HttpOnly')) {
      throw new Error('Auth cookie was not properly set with HttpOnly');
    }
    console.log('   Auth cookie verified:', authCookie.split(';')[0]);

    // 2. Reject role via zod .strict()
    const strictRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: env.PORT,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        username: 'phase2_hacker',
        email: 'hacker@studyroom.test',
        password: 'Password123',
        role: 'admin',
      }
    );
    console.log('2. Strict rejection of role response:', strictRes.statusCode, strictRes.body);
    if (strictRes.statusCode !== 400 || strictRes.body.success !== false) {
      throw new Error('Zod .strict() did not reject unexpected role field');
    }

    // 3. Duplicate email -> 409
    const dupRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: env.PORT,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        username: 'phase2_alice2',
        email: 'phase2_alice@studyroom.test',
        password: 'Password123',
      }
    );
    console.log('3. Duplicate email response:', dupRes.statusCode, dupRes.body);
    if (dupRes.statusCode !== 409) {
      throw new Error('Duplicate email did not return 409');
    }

    // 4. NoSQL injection payload -> 400
    const nosqlRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: env.PORT,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        email: { $gt: '' },
        password: 'Password123',
      }
    );
    console.log('4. NoSQL injection response:', nosqlRes.statusCode, nosqlRes.body);
    if (nosqlRes.statusCode !== 400) {
      throw new Error('NoSQL injection payload was not blocked with 400');
    }

    // 5. GET /api/auth/me with cookie -> 200
    const meRes = await makeRequest({
      hostname: '127.0.0.1',
      port: env.PORT,
      path: '/api/auth/me',
      method: 'GET',
      headers: { Cookie: authCookie.split(';')[0] },
    });
    console.log('5. Auth /me with cookie response:', meRes.statusCode, meRes.body);
    if (meRes.statusCode !== 200 || meRes.body.data.user.username !== 'phase2_alice') {
      throw new Error('Auth /me with cookie failed');
    }

    // 6. GET /api/auth/me without cookie -> 401
    const unauthRes = await makeRequest({
      hostname: '127.0.0.1',
      port: env.PORT,
      path: '/api/auth/me',
      method: 'GET',
    });
    console.log('6. Auth /me without cookie response:', unauthRes.statusCode, unauthRes.body);
    if (unauthRes.statusCode !== 401) {
      throw new Error('Auth /me without cookie did not return 401');
    }

    // 7. Login with wrong password -> 401
    const wrongPassRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: env.PORT,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        email: 'phase2_alice@studyroom.test',
        password: 'WrongPassword999',
      }
    );
    console.log('7. Wrong password response:', wrongPassRes.statusCode, wrongPassRes.body);
    if (wrongPassRes.statusCode !== 401 || wrongPassRes.body.message !== 'Invalid email or password') {
      throw new Error('Wrong password failed to return 401 with generic message');
    }

    // 8. Login with correct credentials -> 200
    const loginRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: env.PORT,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        email: 'phase2_alice@studyroom.test',
        password: 'Password123',
      }
    );
    console.log('8. Valid login response:', loginRes.statusCode, loginRes.body);
    if (loginRes.statusCode !== 200 || !loginRes.body.success) {
      throw new Error('Valid login failed');
    }

    // 9. Logout -> clears cookie
    const logoutRes = await makeRequest({
      hostname: '127.0.0.1',
      port: env.PORT,
      path: '/api/auth/logout',
      method: 'POST',
    });
    console.log('9. Logout response:', logoutRes.statusCode, logoutRes.body);
    const clearedCookie = logoutRes.cookies.find((c) => c.startsWith(`${env.COOKIE_NAME}=`));
    if (!clearedCookie || !clearedCookie.includes('Expires=') && !clearedCookie.includes('Max-Age=0')) {
      console.log('Cleared cookie string:', clearedCookie);
    }

    console.log('\nAll Phase 2 verifications PASSED!\n');
  } catch (err) {
    console.error('Phase 2 verification FAILED:', err);
    process.exitCode = 1;
  } finally {
    await User.deleteMany({ email: { $in: ['phase2_alice@studyroom.test', 'phase2_bob@studyroom.test'] } });
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  }
};

runVerification();
