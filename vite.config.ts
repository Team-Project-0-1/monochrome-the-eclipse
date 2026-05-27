import path from 'path';
import { defineConfig, loadEnv } from 'vite';

// Base path는 두 군데에서 결정될 수 있다:
//  1) CLI 인자: `vite build --base=/foo/` — package.json의 `check:pages-build`가 이 방식을 사용한다.
//  2) 환경변수 `VITE_BASE_PATH` — `.env.*` 또는 CI 셸에서 설정 가능.
// CLI 인자가 항상 우선한다(Vite 동작). 새 경로가 필요하면 package.json의 build 스크립트를 단일 출처로 갱신하라.
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const basePath = env.VITE_BASE_PATH || '/';

    return {
      base: basePath,
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
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
