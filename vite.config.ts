import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const target = env.VITE_API_BASE_URL || 'http://100.116.47.110:8000';
    const proxy: Record<string, any> = {
      '/auth': { target, changeOrigin: true, secure: false },
      '/employees': { target, changeOrigin: true, secure: false },
      '/products': { target, changeOrigin: true, secure: false },
      '/transactions': { target, changeOrigin: true, secure: false },
      '/purchases': { target, changeOrigin: true, secure: false },
      '/suppliers': { target, changeOrigin: true, secure: false },
      '/intermediaries': { target, changeOrigin: true, secure: false },
      '/config': { target, changeOrigin: true, secure: false },
      '/roles': { target, changeOrigin: true, secure: false },
      '/expenses': { target, changeOrigin: true, secure: false },
      // Proxy WebSocket usando target HTTP; el flag ws habilita el upgrade
      '/ws': { target, ws: true, changeOrigin: true }
    };
    if (env.VITE_API_DNI_URL) {
      proxy['/dniapi'] = { target: env.VITE_API_DNI_URL, changeOrigin: true, secure: false };
    }
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: ['localhost', '127.0.0.1', '100.116.47.110'],
        proxy
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
