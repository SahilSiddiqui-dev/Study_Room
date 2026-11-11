const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');

// Create HTTP server
const server = http.createServer(app);

// Sockets and Cron Jobs will be attached in future phases
let io = null;
let cronJob = null;

const startServer = async () => {
  await connectDB();

  server.listen(env.PORT, () => {
    console.log(`StudyRoom Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    console.log(`CORS allowed origin: ${env.CLIENT_ORIGIN}`);
  });
};

// Graceful Shutdown
const shutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  if (cronJob && typeof cronJob.stop === 'function') {
    cronJob.stop();
  }

  if (io && typeof io.close === 'function') {
    await new Promise((resolve) => io.close(resolve));
  }

  server.close(async () => {
    console.log('HTTP server closed');
    await disconnectDB();
    process.exit(0);
  });

  // Force shutdown after 10s timeout
  setTimeout(() => {
    console.error('Graceful shutdown timeout exceeded. Forcing exit.');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

if (require.main === module) {
  startServer();
}

module.exports = { server, app };
