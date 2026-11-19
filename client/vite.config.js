import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      __API_URL__: JSON.stringify(env.API_URL || 'http://localhost:5000/api'),
      __SOCKET_URL__: JSON.stringify(env.SOCKET_URL || 'http://localhost:5000'),
    },
    server: {
      port: 5173,
      strictPort: true,
      host: 'localhost',
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
    },
  };
});
