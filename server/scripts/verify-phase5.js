const http = require('http');
const { server } = require('../src/server');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const StudySession = require('../src/models/StudySession');
const FocusEvent = require('../src/models/FocusEvent');
const BreakReason = require('../src/models/BreakReason');
const env = require('../src/config/env');

const runVerification = async () => {
  console.log('Connecting to DB for Phase 5 verification...');
  await connectDB();

  await User.deleteMany({ email: { $in: ['phase5_alice@studyroom.test', 'phase5_bob@studyroom.test'] } });

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
    // 1. Register Alice & Bob
    const aliceReg = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { username: 'phase5_alice', email: 'phase5_alice@studyroom.test', password: 'Password123' }
    );
    const aliceCookie = aliceReg.cookies.find((c) => c.startsWith(`${env.COOKIE_NAME}=`)).split(';')[0];

    const bobReg = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { username: 'phase5_bob', email: 'phase5_bob@studyroom.test', password: 'Password123' }
    );
    const bobCookie = bobReg.cookies.find((c) => c.startsWith(`${env.COOKIE_NAME}=`)).split(';')[0];

    // 2. Alice starts study session
    const startRes = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: '/api/sessions', method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: aliceCookie } },
      { subject: 'Physics', plannedMinutes: 25, goal: 'Master Thermodynamics' }
    );
    console.log('2. Alice start session response:', startRes.statusCode, startRes.body.data.session.subject);
    if (startRes.statusCode !== 201 || !startRes.body.data.session) {
      throw new Error('Start session failed');
    }
    const sessionId = startRes.body.data.session._id;

    // 3. Alice tries to start a SECOND active session -> 409
    const secondStartRes = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: '/api/sessions', method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: aliceCookie } },
      { subject: 'Chemistry', plannedMinutes: 30 }
    );
    console.log('3. Second active session response:', secondStartRes.statusCode, secondStartRes.body.message);
    if (secondStartRes.statusCode !== 409) {
      throw new Error('Concurrent active session did not return 409');
    }

    // 4. Bob tries to end Alice's session -> 403
    const bobEndRes = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: `/api/sessions/${sessionId}/end`, method: 'PATCH', headers: { Cookie: bobCookie } }
    );
    console.log('4. Bob end Alice session response:', bobEndRes.statusCode);
    if (bobEndRes.statusCode !== 403) {
      throw new Error('Cross-user session end did not return 403');
    }

    // 5. Alice logs focus event (tab switch)
    const eventRes = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: `/api/sessions/${sessionId}/events`, method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: aliceCookie } },
      { type: 'tab_switch', durationSec: 15 }
    );
    console.log('5. Alice log event response:', eventRes.statusCode, eventRes.body.data.event.type, 'planned:', eventRes.body.data.event.planned);
    if (eventRes.statusCode !== 201 || eventRes.body.data.event.planned !== false) {
      throw new Error('Log focus event failed');
    }
    const eventId = eventRes.body.data.event._id;

    // 6. Alice logs planned break
    const plannedEventRes = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: `/api/sessions/${sessionId}/events`, method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: aliceCookie } },
      { type: 'planned_break', durationSec: 300 }
    );
    console.log('6. Alice log planned break response:', plannedEventRes.statusCode, 'planned:', plannedEventRes.body.data.event.planned);
    if (plannedEventRes.statusCode !== 201 || plannedEventRes.body.data.event.planned !== true) {
      throw new Error('Log planned break failed');
    }

    // 7. Bob attempts to add break reason to Alice's event -> 403
    const bobReasonRes = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: `/api/events/${eventId}/reason`, method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: bobCookie } },
      { category: 'phone' }
    );
    console.log('7. Bob reason for Alice event response:', bobReasonRes.statusCode);
    if (bobReasonRes.statusCode !== 403) {
      throw new Error('Cross-user break reason did not return 403');
    }

    // 8. Alice submits break reason for her event -> 201
    const aliceReasonRes = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: `/api/events/${eventId}/reason`, method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: aliceCookie } },
      { category: 'notification', note: 'Slack ping from colleague' }
    );
    console.log('8. Alice break reason response:', aliceReasonRes.statusCode, aliceReasonRes.body.data.reason.category);
    if (aliceReasonRes.statusCode !== 201) {
      throw new Error('Alice break reason submission failed');
    }

    // 9. Alice submits duplicate reason for same event -> 409
    const dupReasonRes = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: `/api/events/${eventId}/reason`, method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: aliceCookie } },
      { category: 'phone' }
    );
    console.log('9. Duplicate reason response:', dupReasonRes.statusCode, dupReasonRes.body.message);
    if (dupReasonRes.statusCode !== 409) {
      throw new Error('Duplicate break reason did not return 409');
    }

    // 10. Alice fetches session events -> 200, 2 events
    const getEventsRes = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: `/api/sessions/${sessionId}/events`, method: 'GET', headers: { Cookie: aliceCookie } }
    );
    console.log('10. Alice events count:', getEventsRes.body.data.events.length);
    if (getEventsRes.statusCode !== 200 || getEventsRes.body.data.events.length !== 2) {
      throw new Error('Fetching session events failed');
    }

    // 11. Bob tries to fetch Alice's session events -> 403
    const bobGetEventsRes = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: `/api/sessions/${sessionId}/events`, method: 'GET', headers: { Cookie: bobCookie } }
    );
    console.log('11. Bob fetch Alice events response:', bobGetEventsRes.statusCode);
    if (bobGetEventsRes.statusCode !== 403) {
      throw new Error('Cross-user event list did not return 403');
    }

    // 12. Alice ends her session
    const endRes = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: `/api/sessions/${sessionId}/end`, method: 'PATCH', headers: { Cookie: aliceCookie } }
    );
    console.log('12. End session response:', endRes.statusCode, 'endedAt:', endRes.body.data.session.endedAt);
    if (endRes.statusCode !== 200 || !endRes.body.data.session.endedAt) {
      throw new Error('Ending session failed');
    }

    // 13. Alice tries to record event on ended session -> 400
    const endedEventRes = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: `/api/sessions/${sessionId}/events`, method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: aliceCookie } },
      { type: 'idle' }
    );
    console.log('13. Event on ended session response:', endedEventRes.statusCode);
    if (endedEventRes.statusCode !== 400) {
      throw new Error('Event on ended session did not return 400');
    }

    // 14. GET /api/sessions/active returns null
    const activeRes = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: '/api/sessions/active', method: 'GET', headers: { Cookie: aliceCookie } }
    );
    console.log('14. Active session after ending:', activeRes.body.data.session);
    if (activeRes.statusCode !== 200 || activeRes.body.data.session !== null) {
      throw new Error('Active session check after ending did not return null');
    }

    console.log('\nAll Phase 5 verifications PASSED!\n');
  } catch (err) {
    console.error('Phase 5 verification FAILED:', err);
    process.exitCode = 1;
  } finally {
    const userIds = (await User.find({ email: { $in: ['phase5_alice@studyroom.test', 'phase5_bob@studyroom.test'] } })).map((u) => u._id);
    const sessionIds = (await StudySession.find({ userId: { $in: userIds } })).map((s) => s._id);
    const eventIds = (await FocusEvent.find({ sessionId: { $in: sessionIds } })).map((e) => e._id);
    await BreakReason.deleteMany({ eventId: { $in: eventIds } });
    await FocusEvent.deleteMany({ _id: { $in: eventIds } });
    await StudySession.deleteMany({ _id: { $in: sessionIds } });
    await User.deleteMany({ _id: { $in: userIds } });
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  }
};

runVerification();

