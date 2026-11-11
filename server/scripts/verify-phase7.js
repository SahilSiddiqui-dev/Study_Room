const http = require('http');
const { server } = require('../src/server');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const StudySession = require('../src/models/StudySession');
const FocusEvent = require('../src/models/FocusEvent');
const BreakReason = require('../src/models/BreakReason');
const AnalyticsSnapshot = require('../src/models/AnalyticsSnapshot');
const Intervention = require('../src/models/Intervention');
const env = require('../src/config/env');
const { hashPassword } = require('../src/utils/password');

const runVerification = async () => {
  console.log('Connecting to DB for Phase 7 verification...');
  await connectDB();

  // Cleanup test users
  const testEmails = ['phase7_student@studyroom.test', 'phase7_admin@studyroom.test'];
  const oldUsers = await User.find({ email: { $in: testEmails } });
  const oldUserIds = oldUsers.map((u) => u._id);
  const oldSessions = await StudySession.find({ userId: { $in: oldUserIds } });
  const oldSessionIds = oldSessions.map((s) => s._id);
  await BreakReason.deleteMany({ userId: { $in: oldUserIds } });
  await FocusEvent.deleteMany({ sessionId: { $in: oldSessionIds } });
  await StudySession.deleteMany({ userId: { $in: oldUserIds } });
  await Intervention.deleteMany({ userId: { $in: oldUserIds } });
  await AnalyticsSnapshot.deleteMany({ userId: { $in: oldUserIds } });
  await User.deleteMany({ _id: { $in: oldUserIds } });

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
    // 1. Create student and admin users
    console.log('1. Setting up student and admin test accounts...');
    const passwordHash = await hashPassword('Password123');
    const student = await User.create({
      username: 'phase7_student',
      email: 'phase7_student@studyroom.test',
      passwordHash,
      role: 'user',
      timezone: 'UTC',
    });

    const admin = await User.create({
      username: 'phase7_admin',
      email: 'phase7_admin@studyroom.test',
      passwordHash,
      role: 'admin',
      timezone: 'UTC',
    });

    // Login student
    const studentLogin = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { email: 'phase7_student@studyroom.test', password: 'Password123' }
    );
    const studentCookie = studentLogin.cookies.find((c) => c.startsWith(`${env.COOKIE_NAME}=`)).split(';')[0];

    // Login admin
    const adminLogin = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { email: 'phase7_admin@studyroom.test', password: 'Password123' }
    );
    const adminCookie = adminLogin.cookies.find((c) => c.startsWith(`${env.COOKIE_NAME}=`)).split(';')[0];

    // 2. Seed realistic sessions and events for student (last 5 days)
    console.log('2. Seeding study sessions and events for student...');
    const now = Date.now();
    for (let day = 1; day <= 4; day++) {
      const sessionDate = new Date(now - day * 24 * 3600 * 1000 + 10 * 3600 * 1000); // 10:00 AM
      const sMath = await StudySession.create({
        userId: student._id,
        subject: 'Mathematics',
        plannedMinutes: 50,
        actualMinutes: 48,
        completed: true,
        startedAt: sessionDate,
        endedAt: new Date(sessionDate.getTime() + 48 * 60000),
      });

      // 3 unplanned breaks (mostly phone)
      for (let i = 1; i <= 3; i++) {
        const ev = await FocusEvent.create({
          sessionId: sMath._id,
          userId: student._id,
          type: 'tab_switch',
          durationSec: 60,
          planned: false,
          startedAt: new Date(sessionDate.getTime() + i * 10 * 60000),
        });
        await BreakReason.create({
          eventId: ev._id,
          userId: student._id,
          category: i <= 2 ? 'phone' : 'fatigue',
        });
      }

      // Programming session (fewer breaks)
      const progDate = new Date(now - day * 24 * 3600 * 1000 + 14 * 3600 * 1000); // 2:00 PM
      await StudySession.create({
        userId: student._id,
        subject: 'Programming',
        plannedMinutes: 25,
        actualMinutes: 25,
        completed: true,
        startedAt: progDate,
        endedAt: new Date(progDate.getTime() + 25 * 60000),
      });
    }

    // 3. GET /api/analytics/summary
    console.log('3. Testing GET /api/analytics/summary...');
    const summaryRes = await makeRequest({
      hostname: '127.0.0.1', port: env.PORT, path: '/api/analytics/summary?range=7d', method: 'GET', headers: { Cookie: studentCookie }
    });
    console.log('   Summary FQS:', summaryRes.body.data.current.fqs, 'ActiveMinutes:', summaryRes.body.data.current.activeMinutes);
    if (summaryRes.statusCode !== 200 || typeof summaryRes.body.data.current.fqs !== 'number') {
      throw new Error('Analytics summary failed');
    }

    // 4. GET /api/analytics/reasons
    console.log('4. Testing GET /api/analytics/reasons...');
    const reasonsRes = await makeRequest({
      hostname: '127.0.0.1', port: env.PORT, path: '/api/analytics/reasons?range=7d', method: 'GET', headers: { Cookie: studentCookie }
    });
    console.log('   Top Reason:', reasonsRes.body.data.reasons[0].category, 'Percentage:', reasonsRes.body.data.reasons[0].percentage + '%');
    if (reasonsRes.statusCode !== 200 || reasonsRes.body.data.reasons[0].category !== 'phone') {
      throw new Error('Analytics reasons breakdown failed');
    }

    // 5. GET /api/analytics/heatmap
    console.log('5. Testing GET /api/analytics/heatmap...');
    const heatmapRes = await makeRequest({
      hostname: '127.0.0.1', port: env.PORT, path: '/api/analytics/heatmap?range=7d', method: 'GET', headers: { Cookie: studentCookie }
    });
    if (heatmapRes.statusCode !== 200 || !Array.isArray(heatmapRes.body.data.heatmap)) {
      throw new Error('Analytics heatmap failed');
    }

    // 6. GET /api/analytics/subjects
    console.log('6. Testing GET /api/analytics/subjects...');
    const subjectsRes = await makeRequest({
      hostname: '127.0.0.1', port: env.PORT, path: '/api/analytics/subjects?range=7d', method: 'GET', headers: { Cookie: studentCookie }
    });
    console.log('   Subjects analyzed:', subjectsRes.body.data.subjects.map((s) => `${s.subject}: FQS ${s.fqs}`));
    if (subjectsRes.statusCode !== 200 || subjectsRes.body.data.subjects.length < 2) {
      throw new Error('Analytics subjects failed');
    }

    // 7. GET /api/analytics/coach
    console.log('7. Testing GET /api/analytics/coach...');
    const coachRes = await makeRequest({
      hostname: '127.0.0.1', port: env.PORT, path: '/api/analytics/coach?range=7d', method: 'GET', headers: { Cookie: studentCookie }
    });
    console.log('   Coach suggestions count:', coachRes.body.data.suggestions.length);
    coachRes.body.data.suggestions.forEach((s) => console.log(`   - [${s.ruleId}]: ${s.insight}`));
    if (coachRes.statusCode !== 200 || coachRes.body.data.suggestions.length === 0) {
      throw new Error('Coach suggestions evaluation failed');
    }

    // 8. POST /api/interventions (record coach suggestion shown)
    console.log('8. Testing POST /api/interventions...');
    const topSuggestion = coachRes.body.data.suggestions[0];
    const interRes = await makeRequest(
      { hostname: '127.0.0.1', port: env.PORT, path: '/api/interventions', method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: studentCookie } },
      { ruleId: topSuggestion.ruleId, suggestedAction: topSuggestion.suggestedAction }
    );
    console.log('   Intervention recorded with ID:', interRes.body.data.intervention._id);
    if (interRes.statusCode !== 201 || !interRes.body.data.intervention.baseline) {
      throw new Error('Intervention creation failed');
    }

    // 9. GET /api/interventions/report
    console.log('9. Testing GET /api/interventions/report...');
    const reportRes = await makeRequest({
      hostname: '127.0.0.1', port: env.PORT, path: '/api/interventions/report', method: 'GET', headers: { Cookie: studentCookie }
    });
    console.log('   Report status:', reportRes.body.data.report[0].status);
    if (reportRes.statusCode !== 200 || reportRes.body.data.report[0].status !== 'insufficient data') {
      throw new Error('Interventions report failed');
    }

    // 10. POST /api/analytics/snapshots/run (Admin authorization)
    console.log('10. Testing POST /api/analytics/snapshots/run...');
    // Student should be rejected (403)
    const studentSnapshotRes = await makeRequest({
      hostname: '127.0.0.1', port: env.PORT, path: '/api/analytics/snapshots/run', method: 'POST', headers: { Cookie: studentCookie }
    });
    console.log('   Non-admin snapshot trigger status:', studentSnapshotRes.statusCode);
    if (studentSnapshotRes.statusCode !== 403) {
      throw new Error('Non-admin was not rejected from snapshot run');
    }

    // Admin triggers snapshot run
    const adminSnapshotRes = await makeRequest({
      hostname: '127.0.0.1', port: env.PORT, path: '/api/analytics/snapshots/run', method: 'POST', headers: { Cookie: adminCookie }
    });
    console.log('   Admin snapshot trigger status:', adminSnapshotRes.statusCode, adminSnapshotRes.body.data);
    if (adminSnapshotRes.statusCode !== 200) {
      throw new Error('Admin snapshot run failed');
    }

    console.log('\n--- All Phase 7 verifications PASSED! ---\n');
  } catch (err) {
    console.error('Phase 7 verification FAILED:', err);
    process.exitCode = 1;
  } finally {
    const testUsers = await User.find({ email: { $in: ['phase7_student@studyroom.test', 'phase7_admin@studyroom.test'] } });
    const testUserIds = testUsers.map((u) => u._id);
    const testSessions = await StudySession.find({ userId: { $in: testUserIds } });
    const testSessionIds = testSessions.map((s) => s._id);
    await BreakReason.deleteMany({ userId: { $in: testUserIds } });
    await FocusEvent.deleteMany({ sessionId: { $in: testSessionIds } });
    await StudySession.deleteMany({ userId: { $in: testUserIds } });
    await Intervention.deleteMany({ userId: { $in: testUserIds } });
    await AnalyticsSnapshot.deleteMany({ userId: { $in: testUserIds } });
    await User.deleteMany({ _id: { $in: testUserIds } });
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  }
};

runVerification();
