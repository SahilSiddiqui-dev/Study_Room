const http = require('http');
const { server } = require('../src/server');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Room = require('../src/models/Room');
const StudySession = require('../src/models/StudySession');
const FocusEvent = require('../src/models/FocusEvent');
const BreakReason = require('../src/models/BreakReason');
const Intervention = require('../src/models/Intervention');
const env = require('../src/config/env');

const runEndToEndVerification = async () => {
  console.log('--- Starting End-to-End Verification Flow ---');
  await connectDB();

  const testEmail = 'e2e_student@studyroom.test';
  const testUsername = 'e2e_student';

  // Clean up any existing records for this user
  const existingUser = await User.findOne({ email: testEmail });
  if (existingUser) {
    const userId = existingUser._id;
    const sessions = await StudySession.find({ userId });
    const sessionIds = sessions.map((s) => s._id);
    await BreakReason.deleteMany({ userId });
    await FocusEvent.deleteMany({ sessionId: { $in: sessionIds } });
    await StudySession.deleteMany({ userId });
    await Room.deleteMany({ hostId: userId });
    await Intervention.deleteMany({ userId });
    await User.deleteOne({ _id: userId });
  }

  const port = env.PORT || 5000;
  await new Promise((resolve) => server.listen(port, resolve));
  console.log(`Server listening on port ${port}`);

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

  let sessionCookie = '';

  const parseCookieHeader = (setCookieArr) => {
    return setCookieArr.map((c) => c.split(';')[0]).join('; ');
  };

  try {
    // 1. REGISTER
    console.log('\n[1/10] Registering new student user...');
    const regRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        username: testUsername,
        email: testEmail,
        password: 'Password@123',
        avatar: 'fox',
        timezone: 'UTC',
      }
    );
    console.log('Register response:', regRes.statusCode, regRes.body);
    if (regRes.statusCode !== 201) throw new Error(`Register failed with ${regRes.statusCode}`);

    // 2. LOGIN
    console.log('\n[2/10] Logging in student user...');
    const loginRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        email: testEmail,
        password: 'Password@123',
      }
    );
    console.log('Login response:', loginRes.statusCode, loginRes.body);
    if (loginRes.statusCode !== 200) throw new Error(`Login failed with ${loginRes.statusCode}`);
    sessionCookie = parseCookieHeader(loginRes.cookies);
    console.log('Captured Session Cookie:', sessionCookie);

    // 3. CREATE ROOM
    console.log('\n[3/10] Creating a study room...');
    const roomRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/rooms',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
      },
      {
        name: 'Distributed Systems Collab',
        subject: 'Computer Science',
        isPrivate: false,
        pomodoro: { focusMin: 25, breakMin: 5 },
      }
    );
    console.log('Create Room response:', roomRes.statusCode, roomRes.body);
    if (roomRes.statusCode !== 201) throw new Error(`Create Room failed with ${roomRes.statusCode}`);
    const roomId = roomRes.body.data.room._id;

    // 4. START SESSION
    console.log('\n[4/10] Starting a study session...');
    const sessRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/sessions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
      },
      {
        subject: 'Computer Science',
        roomId,
        plannedMinutes: 25,
      }
    );
    console.log('Start Session response:', sessRes.statusCode, sessRes.body);
    if (sessRes.statusCode !== 201) throw new Error(`Start Session failed with ${sessRes.statusCode}`);
    const sessionId = sessRes.body.data.session._id;

    // 5. LOG INTERRUPTION
    console.log('\n[5/10] Logging a focus interruption event...');
    const eventRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port,
        path: `/api/sessions/${sessionId}/events`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
      },
      {
        type: 'tab_switch',
        durationSec: 45,
      }
    );
    console.log('Log Interruption response:', eventRes.statusCode, eventRes.body);
    if (eventRes.statusCode !== 201) throw new Error(`Log Interruption failed with ${eventRes.statusCode}`);
    const eventId = eventRes.body.data.event._id;

    // 6. LOG BREAK REASON
    console.log('\n[6/10] Attaching a break reason to the interruption...');
    const reasonRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port,
        path: `/api/events/${eventId}/reason`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
      },
      {
        category: 'phone',
        note: 'Call from group partner',
      }
    );
    console.log('Log Break Reason response:', reasonRes.statusCode, reasonRes.body);
    if (reasonRes.statusCode !== 201) throw new Error(`Log Break Reason failed with ${reasonRes.statusCode}`);

    // 7. END SESSION
    console.log('\n[7/10] Ending study session...');
    const endRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port,
        path: `/api/sessions/${sessionId}/end`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
      },
      {
        notes: 'Covered Paxos and Raft overview',
      }
    );
    console.log('End Session response:', endRes.statusCode, endRes.body);
    if (endRes.statusCode !== 200) throw new Error(`End Session failed with ${endRes.statusCode}`);

    // 8. VIEW SUMMARY
    console.log('\n[8/10] Viewing analytics summary...');
    const summaryRes = await makeRequest({
      hostname: '127.0.0.1',
      port,
      path: '/api/analytics/summary?range=7d',
      method: 'GET',
      headers: { Cookie: sessionCookie },
    });
    console.log('Analytics Summary response:', summaryRes.statusCode, summaryRes.body);
    if (summaryRes.statusCode !== 200) throw new Error(`Analytics Summary failed with ${summaryRes.statusCode}`);

    // 9. VIEW COACH SUGGESTIONS
    console.log('\n[9/10] Viewing coach suggestions...');
    const coachRes = await makeRequest({
      hostname: '127.0.0.1',
      port,
      path: '/api/analytics/coach',
      method: 'GET',
      headers: { Cookie: sessionCookie },
    });
    console.log('Coach Suggestions response:', coachRes.statusCode, coachRes.body);
    if (coachRes.statusCode !== 200) throw new Error(`Coach Suggestions failed with ${coachRes.statusCode}`);

    // 10. CREATE INTERVENTION AND VIEW INTERVENTIONS REPORT
    console.log('\n[10/10] Creating intervention and viewing interventions report...');
    const intRes = await makeRequest(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/interventions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
      },
      {
        ruleId: 'dominant_break_reason',
        suggestedAction: 'Keep phone in airplane mode during study blocks',
      }
    );
    console.log('Create Intervention response:', intRes.statusCode, intRes.body);
    if (intRes.statusCode !== 201) throw new Error(`Create Intervention failed with ${intRes.statusCode}`);

    const reportRes = await makeRequest({
      hostname: '127.0.0.1',
      port,
      path: '/api/interventions/report',
      method: 'GET',
      headers: { Cookie: sessionCookie },
    });
    console.log('Interventions Report response:', reportRes.statusCode, reportRes.body);
    if (reportRes.statusCode !== 200) throw new Error(`Interventions Report failed with ${reportRes.statusCode}`);

    console.log('\n======================================================');
    console.log('   ALL 10 END-TO-END FLOW STEPS COMPLETED WITH 200/201!   ');
    console.log('======================================================\n');
  } catch (err) {
    console.error('End-to-End Verification FAILED:', err);
    process.exit(1);
  } finally {
    server.close();
    await disconnectDB();
  }
};

runEndToEndVerification();
