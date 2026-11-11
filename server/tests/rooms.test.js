const request = require('supertest');
const app = require('../src/app');
const env = require('../src/config/env');
const { setupTestDB } = require('./setup');

describe('Rooms Subsystem Integration Tests', () => {
  setupTestDB();

  let hostCookie;
  let memberCookie;

  beforeEach(async () => {
    // Register host (Alice)
    const hostRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'room_host',
        email: 'host@studyroom.test',
        password: 'Password123',
      });
    hostCookie = hostRes.headers['set-cookie'][0];

    // Register non-host (Bob)
    const memberRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'room_member',
        email: 'member@studyroom.test',
        password: 'Password123',
      });
    memberCookie = memberRes.headers['set-cookie'][0];
  });

  test('Non-host cannot PATCH or DELETE a room (403)', async () => {
    // Host creates room
    const createRes = await request(app)
      .post('/api/rooms')
      .set('Cookie', hostCookie)
      .send({ name: 'Algorithms Workshop', subject: 'Computer Science' })
      .expect(201);

    const roomId = createRes.body.data.room._id;

    // Member attempts PATCH -> 403
    const patchRes = await request(app)
      .patch(`/api/rooms/${roomId}`)
      .set('Cookie', memberCookie)
      .send({ name: 'Hijacked Room Name' })
      .expect(403);
    expect(patchRes.body.success).toBe(false);

    // Member attempts DELETE -> 403
    const deleteRes = await request(app)
      .delete(`/api/rooms/${roomId}`)
      .set('Cookie', memberCookie)
      .expect(403);
    expect(deleteRes.body.success).toBe(false);
  });

  test('Joining a room twice does not duplicate the participant', async () => {
    const createRes = await request(app)
      .post('/api/rooms')
      .set('Cookie', hostCookie)
      .send({ name: 'Physics Collab', subject: 'Physics' })
      .expect(201);

    const roomId = createRes.body.data.room._id;

    // Join first time
    const join1 = await request(app)
      .post(`/api/rooms/${roomId}/join`)
      .set('Cookie', memberCookie)
      .expect(200);
    expect(join1.body.data.room.participants.length).toBe(2);

    // Join second time
    const join2 = await request(app)
      .post(`/api/rooms/${roomId}/join`)
      .set('Cookie', memberCookie)
      .expect(200);
    expect(join2.body.data.room.participants.length).toBe(2);
  });

  test('Private room requires joinCode and never leaks code to non-hosts', async () => {
    const createRes = await request(app)
      .post('/api/rooms')
      .set('Cookie', hostCookie)
      .send({ name: 'Private Seminar', subject: 'Quantum Computing', isPrivate: true })
      .expect(201);

    const roomId = createRes.body.data.room._id;
    const joinCode = createRes.body.data.room.joinCode;
    expect(joinCode).toBeDefined();
    expect(joinCode.length).toBe(6);

    // Member attempts to join without code -> 403
    await request(app)
      .post(`/api/rooms/${roomId}/join`)
      .set('Cookie', memberCookie)
      .send({})
      .expect(403);

    // Member joins with valid joinCode
    const joinRes = await request(app)
      .post(`/api/rooms/${roomId}/join`)
      .set('Cookie', memberCookie)
      .send({ joinCode })
      .expect(200);

    // Verify non-host does not receive joinCode in returned payload
    expect(joinRes.body.data.room.joinCode).toBeUndefined();
  });
});

