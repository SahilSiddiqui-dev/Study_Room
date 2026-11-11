const http = require('http');
const { server } = require('../src/server');
const { connectDB, disconnectDB } = require('../src/config/db');
const env = require('../src/config/env');

const runVerification = async () => {
  console.log('Connecting to DB for Phase 1 verification...');
  await connectDB();

  await new Promise((resolve) => server.listen(env.PORT, resolve));
  console.log(`Server listening on port ${env.PORT}`);

  const makeRequest = (options, postData) => {
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, headers: res.headers, body: JSON.parse(body) });
          } catch (e) {
            resolve({ statusCode: res.statusCode, headers: res.headers, body });
          }
        });
      });
      req.on('error', reject);
      if (postData) req.write(postData);
      req.end();
    });
  };

  try {
    // 1. Test GET /api/health
    const health = await makeRequest({
      hostname: '127.0.0.1',
      port: env.PORT,
      path: '/api/health',
      method: 'GET',
    });
    console.log('1. Health check response:', health.statusCode, health.body);
    if (health.statusCode !== 200 || !health.body.success) {
      throw new Error('Health check failed');
    }

    // 2. Test 404 handler
    const notFound = await makeRequest({
      hostname: '127.0.0.1',
      port: env.PORT,
      path: '/api/non-existent-route',
      method: 'GET',
    });
    console.log('2. 404 handler response:', notFound.statusCode, notFound.body);
    if (notFound.statusCode !== 404 || notFound.body.success !== false) {
      throw new Error('404 test failed');
    }

    // 3. Test Body limit 10kb
    const largeBody = 'a'.repeat(12 * 1024);
    const payloadLimit = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: env.PORT,
        path: '/api/health',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(JSON.stringify({ data: largeBody })),
        },
      },
      JSON.stringify({ data: largeBody })
    );
    console.log('3. Payload limit (10kb) response:', payloadLimit.statusCode, payloadLimit.body);
    if (payloadLimit.statusCode !== 413 || payloadLimit.body.success !== false) {
      throw new Error('Payload limit test failed');
    }

    console.log('\nAll Phase 1 verifications PASSED!\n');
  } catch (err) {
    console.error('Phase 1 verification FAILED:', err);
    process.exitCode = 1;
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  }
};

runVerification();
