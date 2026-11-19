const mongoose = require('mongoose');
const os = require('os');

const connectDB = async (customUri) => {
  const uri = customUri || process.env.MONGO_URI;
  if (!uri) {
    console.error('MongoDB connection URI is missing');
    process.exit(1);
  }

  try {
    const parsedUri = new URL(uri);
    const databaseName = decodeURIComponent(parsedUri.pathname.replace(/^\/+/, '')).split('/')[0];

    if (!databaseName) {
      throw new Error(
        'MONGO_URI must include an explicit database name (for example: /studyroom)'
      );
    }

    if (process.env.NODE_ENV !== 'test' && databaseName.toLowerCase() === 'test') {
      throw new Error(
        'Refusing to use the MongoDB "test" database outside test mode'
      );
    }

    const conn = await mongoose.connect(uri, {
      runtimeAdapters: { os },
      driverInfo: { name: 'studyroom', version: '1.0.0' },
    });
    console.log(`Connected to MongoDB: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (err) {
    console.error('Error closing MongoDB connection:', err.message);
  }
};

module.exports = { connectDB, disconnectDB };

