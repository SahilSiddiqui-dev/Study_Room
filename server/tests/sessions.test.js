const request = require('supertest');
const app = require('../src/app');
const { setupTestDB } = require('./setup');

describe('Study Sessions & Focus Events Integration Tests', () => {
  setupTestDB();

  let user1Cookie;
  let user2Cookie;

  beforeEach(async () => {
    const res1 = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'session_user1',
        email: 'user1@studyroom.test',
        password: 'Password123',
      });
    user1Cookie = res1.headers['set-cookie'][0];

    const res2 = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'session_user2',
        email: 'user2@studyroom.test',
        password: 'Password123',
      });
    user2Cookie = res2.headers['set-cookie'][0];
  });

  test('User cannot read or write another users session or event (403/404)', async () => {
    // User 1 starts session
    const s1Res = await request(app)
      .post('/api/sessions')
      .set('Cookie', user1Cookie)
      .send({ subject: 'Calculus', plannedMinutes: 25 })
      .expect(201);
    const sessionId = s1Res.body.data.session._id;

    // User 1 logs event
    const evRes = await request(app)
      .post(`/api/sessions/${sessionId}/events`)
      .set('Cookie', user1Cookie)
      .send({ type: 'tab_switch', durationSec: 10 })
      .expect(201);
    const eventId = evRes.body.data.event._id;

    // User 2 attempts to log event on User 1 session -> 403
    await request(app)
      .post(`/api/sessions/${sessionId}/events`)
      .set('Cookie', user2Cookie)
      .send({ type: 'idle' })
      .expect(403);

    // User 2 attempts to read User 1 session events -> 403
    await request(app)
      .get(`/api/sessions/${sessionId}/events`)
      .set('Cookie', user2Cookie)
      .expect(403);

    // User 2 attempts to end User 1 session -> 403
    await request(app)
      .patch(`/api/sessions/${sessionId}/end`)
      .set('Cookie', user2Cookie)
      .expect(403);

    // User 2 attempts to attach break reason to User 1 event -> 403
    await request(app)
      .post(`/api/events/${eventId}/reason`)
      .set('Cookie', user2Cookie)
      .send({ category: 'phone' })
      .expect(403);
  });

  test('Starting a second active session returns 409 Conflict', async () => {
    // First session
    await request(app)
      .post('/api/sessions')
      .set('Cookie', user1Cookie)
      .send({ subject: 'Biology', plannedMinutes: 25 })
      .expect(201);

    // Second session while first is active -> 409
    const secondRes = await request(app)
      .post('/api/sessions')
      .set('Cookie', user1Cookie)
      .send({ subject: 'Chemistry', plannedMinutes: 30 })
      .expect(409);

    expect(secondRes.body.success).toBe(false);
    expect(secondRes.body.message).toContain('active study session');
  });

  test('Cannot record events on an ended study session (400)', async () => {
    const sRes = await request(app)
      .post('/api/sessions')
      .set('Cookie', user1Cookie)
      .send({ subject: 'History', plannedMinutes: 25 })
      .expect(201);
    const sessionId = sRes.body.data.session._id;

    // End session
    await request(app)
      .patch(`/api/sessions/${sessionId}/end`)
      .set('Cookie', user1Cookie)
      .expect(200);

    // Attempt to record event on ended session -> 400
    const errRes = await request(app)
      .post(`/api/sessions/${sessionId}/events`)
      .set('Cookie', user1Cookie)
      .send({ type: 'idle' })
      .expect(400);

    expect(errRes.body.success).toBe(false);
    expect(errRes.body.message).toContain('ended');
  });

  test('Submitting duplicate break reason for the same event returns 409 Conflict', async () => {
    const sRes = await request(app)
      .post('/api/sessions')
      .set('Cookie', user1Cookie)
      .send({ subject: 'Literature', plannedMinutes: 25 })
      .expect(201);
    const sessionId = sRes.body.data.session._id;

    const evRes = await request(app)
      .post(`/api/sessions/${sessionId}/events`)
      .set('Cookie', user1Cookie)
      .send({ type: 'manual_break', durationSec: 60 })
      .expect(201);
    const eventId = evRes.body.data.event._id;

    // First break reason -> 201
    await request(app)
      .post(`/api/events/${eventId}/reason`)
      .set('Cookie', user1Cookie)
      .send({ category: 'phone', note: 'Checked messages' })
      .expect(201);

    // Second break reason for same event -> 409
    const dupRes = await request(app)
      .post(`/api/events/${eventId}/reason`)
      .set('Cookie', user1Cookie)
      .send({ category: 'fatigue' })
      .expect(409);

    expect(dupRes.body.success).toBe(false);
    expect(dupRes.body.message).toContain('already been submitted');
  });
});
