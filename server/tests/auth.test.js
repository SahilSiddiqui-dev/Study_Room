const request = require('supertest');
const app = require('../src/app');
const env = require('../src/config/env');
const User = require('../src/models/User');
const { setupTestDB } = require('./setup');

describe('Authentication & Security Integration Tests', () => {
  setupTestDB();

  const validUser = {
    username: 'auth_alice',
    email: 'auth_alice@studyroom.test',
    password: 'Password123',
    avatar: 'owl',
    timezone: 'UTC',
  };

  test('Full auth lifecycle: register -> login sets httpOnly cookie -> /auth/me works -> logout clears it', async () => {
    // 1. Register
    const regRes = await request(app)
      .post('/api/auth/register')
      .send(validUser)
      .expect(201);

    expect(regRes.body.success).toBe(true);
    expect(regRes.body.data.user.username).toBe(validUser.username);
    expect(regRes.body.data.user.passwordHash).toBeUndefined();

    // Check Set-Cookie on register
    const regCookie = regRes.headers['set-cookie'];
    expect(regCookie).toBeDefined();
    expect(regCookie[0]).toContain(`${env.COOKIE_NAME}=`);
    expect(regCookie[0]).toContain('HttpOnly');

    // 2. Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password })
      .expect(200);

    expect(loginRes.body.success).toBe(true);
    const authCookie = loginRes.headers['set-cookie'];
    expect(authCookie).toBeDefined();
    expect(authCookie[0]).toContain(`${env.COOKIE_NAME}=`);
    expect(authCookie[0]).toContain('HttpOnly');

    // 3. /auth/me with cookie
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', authCookie)
      .expect(200);

    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user.email).toBe(validUser.email);
    expect(meRes.body.data.user.role).toBe('user');

    // 4. Logout clears cookie
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', authCookie)
      .expect(200);

    expect(logoutRes.body.success).toBe(true);
    const clearedCookie = logoutRes.headers['set-cookie'];
    expect(clearedCookie[0]).toMatch(/(Expires=|Max-Age=0)/i);
  });

  test('/auth/me returns 401 without an authentication cookie', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Authentication required');
  });

  test('Duplicate email and duplicate username return 409 Conflict', async () => {
    await request(app)
      .post('/api/auth/register')
      .send(validUser)
      .expect(201);

    // Duplicate email
    const dupEmailRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'different_user',
        email: validUser.email,
        password: 'Password123',
      })
      .expect(409);
    expect(dupEmailRes.body.success).toBe(false);

    // Duplicate username
    const dupUserRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: validUser.username,
        email: 'different@studyroom.test',
        password: 'Password123',
      })
      .expect(409);
    expect(dupUserRes.body.success).toBe(false);
  });

  test('Zod .strict() rejects unexpected role field on register with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'hacker_role',
        email: 'hacker@studyroom.test',
        password: 'Password123',
        role: 'admin',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
  });

  test('NoSQL operator-injection payload on login returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: { $gt: '' },
        password: 'Password123',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
  });

  test('11th login attempt within the window returns 429 Too Many Requests', async () => {
    // Send 10 attempts
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'rate_test@studyroom.test', password: 'WrongPassword1' });
    }

    // 11th attempt must be rate-limited
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rate_test@studyroom.test', password: 'WrongPassword1' })
      .expect(429);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Too many');
  });
});

