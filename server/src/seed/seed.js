const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Room = require('../models/Room');
const StudySession = require('../models/StudySession');
const FocusEvent = require('../models/FocusEvent');
const BreakReason = require('../models/BreakReason');
const AnalyticsSnapshot = require('../models/AnalyticsSnapshot');
const Intervention = require('../models/Intervention');
const { hashPassword } = require('../utils/password');
const { runSnapshotJob } = require('../jobs/snapshot.job');

const seedDatabase = async () => {
  // Safety check: refuse to run in production
  if (env.NODE_ENV === 'production') {
    console.error('FATAL: Refusing to run seed script in production environment!');
    process.exit(1);
  }

  console.log('--- Starting StudyRoom Database Seed ---');
  await connectDB();

  console.log('Clearing existing database collections...');
  await Promise.all([
    User.deleteMany({}),
    Room.deleteMany({}),
    StudySession.deleteMany({}),
    FocusEvent.deleteMany({}),
    BreakReason.deleteMany({}),
    AnalyticsSnapshot.deleteMany({}),
    Intervention.deleteMany({}),
  ]);

  console.log('Creating Admin and Demo Users...');
  const defaultPassword = 'Demo@1234';
  const passwordHash = await hashPassword(defaultPassword);

  const admin = await User.create({
    username: 'admin',
    email: 'admin@studyroom.test',
    passwordHash,
    avatar: 'owl',
    role: 'admin',
    timezone: 'UTC',
  });

  const demoUsers = await User.create([
    {
      username: 'alice',
      email: 'alice@studyroom.test',
      passwordHash,
      avatar: 'fox',
      role: 'user',
      timezone: 'UTC',
    },
    {
      username: 'bob',
      email: 'bob@studyroom.test',
      passwordHash,
      avatar: 'panda',
      role: 'user',
      timezone: 'America/New_York',
    },
    {
      username: 'charlie',
      email: 'charlie@studyroom.test',
      passwordHash,
      avatar: 'cat',
      role: 'user',
      timezone: 'Asia/Kolkata',
    },
  ]);

  const allUsers = [alice, bob, charlie] = demoUsers;

  console.log('Creating Study Rooms...');
  const rooms = await Room.create([
    {
      name: 'Programming Study Group',
      subject: 'Programming',
      subjectKey: 'programming',
      isPrivate: false,
      hostId: alice._id,
      participants: [alice._id, bob._id, charlie._id],
      status: 'open',
      pomodoro: { focusMin: 25, breakMin: 5 },
    },
    {
      name: 'Mathematics Collective',
      subject: 'Mathematics',
      subjectKey: 'mathematics',
      isPrivate: false,
      hostId: bob._id,
      participants: [alice._id, bob._id],
      status: 'open',
      pomodoro: { focusMin: 50, breakMin: 10 },
    },
    {
      name: 'Quantum Physics Syndicate',
      subject: 'Physics',
      subjectKey: 'physics',
      isPrivate: true,
      joinCode: 'PHYS99',
      hostId: charlie._id,
      participants: [charlie._id, alice._id],
      status: 'open',
      pomodoro: { focusMin: 45, breakMin: 15 },
    },
  ]);

  console.log('Generating 30 days of realistic study sessions, events, and break reasons...');
  const allSessions = [];
  const allEvents = [];
  const allReasons = [];

  const now = Date.now();

  for (const user of allUsers) {
    for (let day = 30; day >= 1; day--) {
      const dayBase = now - day * 24 * 3600 * 1000;
      // Gradual improvement over last 10 days
      const isRecentImprovement = day <= 10;

      // Session 1: Morning Focus (09:30 - 10:20)
      const morningStart = new Date(dayBase + 9.5 * 3600 * 1000);
      const isMath = (day + user.username.length) % 2 === 0;
      const morningSubject = isMath ? 'Mathematics' : 'Programming';
      const morningRoom = isMath ? rooms[1] : rooms[0];

      // 25m vs 50m: 25-minute sessions complete ~20% more often than 50-minute ones
      const plannedMin = day % 2 === 0 ? 25 : 50;
      const completionChance = plannedMin === 25 ? (isRecentImprovement ? 0.95 : 0.85) : (isRecentImprovement ? 0.75 : 0.65);
      const isCompleted = Math.random() < completionChance;
      const actualMin = isCompleted ? plannedMin : Math.round(plannedMin * 0.7);

      const s1 = new StudySession({
        userId: user._id,
        roomId: morningRoom._id,
        subject: morningSubject,
        goal: `Work through chapter ${31 - day}`,
        plannedMinutes: plannedMin,
        actualMinutes: actualMin,
        completed: isCompleted,
        startedAt: morningStart,
        endedAt: new Date(morningStart.getTime() + actualMin * 60000),
      });
      allSessions.push(s1);

      // Morning interruptions: Math has ~2x interruptions of Programming
      const morningInterruptionCount = isMath ? (isRecentImprovement ? 2 : 4) : (isRecentImprovement ? 1 : 2);
      for (let i = 1; i <= morningInterruptionCount; i++) {
        const evStart = new Date(morningStart.getTime() + (i * 8 * 60000));
        const ev = new FocusEvent({
          sessionId: s1._id,
          userId: user._id,
          type: 'tab_switch',
          durationSec: 45,
          planned: false,
          startedAt: evStart,
        });
        allEvents.push(ev);

        const reason = new BreakReason({
          eventId: ev._id,
          userId: user._id,
          category: isMath ? 'difficult_topic' : 'doubt',
          note: isMath ? 'Stuck on proof derivation' : 'Looking up documentation',
        });
        allReasons.push(reason);
      }

      // Session 2: Evening Session (18:30 - 19:30) - Distraction spike with phone & notification
      const eveningStart = new Date(dayBase + 18.5 * 3600 * 1000);
      const s2 = new StudySession({
        userId: user._id,
        roomId: rooms[2]._id,
        subject: 'Physics',
        goal: 'Review problem sets',
        plannedMinutes: 30,
        actualMinutes: 28,
        completed: true,
        startedAt: eveningStart,
        endedAt: new Date(eveningStart.getTime() + 28 * 60000),
      });
      allSessions.push(s2);

      // Frequent 'phone' and 'notification' breaks in the evening
      const eveningBreakCount = isRecentImprovement ? 2 : 4;
      for (let j = 1; j <= eveningBreakCount; j++) {
        const evStart = new Date(eveningStart.getTime() + (j * 6 * 60000));
        const ev = new FocusEvent({
          sessionId: s2._id,
          userId: user._id,
          type: 'manual_break',
          durationSec: 90,
          planned: false,
          startedAt: evStart,
        });
        allEvents.push(ev);

        const category = j % 2 === 0 ? 'phone' : 'notification';
        const reason = new BreakReason({
          eventId: ev._id,
          userId: user._id,
          category,
          note: category === 'phone' ? 'Checked social media notifications' : 'Message ping',
        });
        allReasons.push(reason);
      }
    }
  }

  console.log(`Inserting ${allSessions.length} sessions...`);
  await StudySession.insertMany(allSessions);

  console.log(`Inserting ${allEvents.length} focus events...`);
  await FocusEvent.insertMany(allEvents);

  console.log(`Inserting ${allReasons.length} break reasons...`);
  await BreakReason.insertMany(allReasons);

  console.log('Running daily analytics snapshot job on seeded data...');
  await runSnapshotJob();

  console.log('\n======================================================');
  console.log('        STUDYROOM DATABASE SEEDED SUCCESSFULLY        ');
  console.log('======================================================');
  console.log('Admin Account:');
  console.log('  Email:    admin@studyroom.test');
  console.log('  Password: Demo@1234');
  console.log('  Role:     admin');
  console.log('------------------------------------------------------');
  console.log('Demo Users (Role: user):');
  console.log('  1. alice@studyroom.test    / Demo@1234  (Timezone: UTC)');
  console.log('  2. bob@studyroom.test      / Demo@1234  (Timezone: America/New_York)');
  console.log('  3. charlie@studyroom.test  / Demo@1234  (Timezone: Asia/Kolkata)');
  console.log('------------------------------------------------------');
  console.log('Study Rooms:');
  console.log('  - Programming Study Group (Public)');
  console.log('  - Mathematics Collective (Public)');
  console.log('  - Quantum Physics Syndicate (Private, Code: PHYS99)');
  console.log('======================================================\n');

  await disconnectDB();
  process.exit(0);
};

if (require.main === module) {
  seedDatabase().catch((err) => {
    console.error('Seed script error:', err);
    process.exit(1);
  });
}

module.exports = seedDatabase;
