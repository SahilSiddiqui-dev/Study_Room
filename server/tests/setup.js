const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/db');

const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/studyroom_test';

const setupTestDB = () => {
  jest.setTimeout(30000);

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await connectDB(TEST_MONGO_URI);
  });

  beforeEach(async () => {
    if (mongoose.connection.readyState === 1) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
      await disconnectDB();
    }
  });
};

module.exports = { setupTestDB, TEST_MONGO_URI };
