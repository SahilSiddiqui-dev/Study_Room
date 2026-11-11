const mongoose = require('mongoose');

const connectDB = async (customUri) => {
  const uri = customUri || process.env.MONGO_URI;
  if (!uri) {
    console.error('MongoDB connection URI is missing');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
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
