import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const basePath = env.VITE_BASE_PATH || '/';

    return {
      base: basePath,
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              react: ['react', 'react-dom'],
              motion: ['framer-motion'],
              state: ['zustand', 'immer'],
              icons: ['lucide-react'],
            },
          },
        },
      }
    };
});
