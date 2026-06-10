import React from 'react';
// FIX: Updated the import for ReactDOM to use 'react-dom/client' to access the createRoot API as required by React 18.
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { useGameStore } from './store/gameStore';
import { eventData } from './data/dataEvents';
import { detectPatterns } from './utils/gameLogic';
import './styles/tokens.css';
import './index.css';
// 아카이브 아트 디렉션 디스플레이 서체(OFL). 유니코드 서브셋 분할이라 사용 글리프만 로드된다.
import '@fontsource/gowun-batang/400.css';
import '@fontsource/gowun-batang/700.css';
// 손글 컴포넌트 CSS는 단일 13k줄 파일을 순서 보존 슬라이스(components-01..07)로 분할한 것.
// import 순서 = 원본 cascade 순서이며, 이어붙이면 원본과 바이트 동일하다(재배치 없음).
// 도메인별 분할이 아닌 순차 분할인 이유: 전투 UI 규칙이 파일 전반에 퍼져 있어 도메인
// 재배치는 동순위 cascade 역전 위험(backlog P3-1)이 있기 때문. 편집은 해당 슬라이스에서 직접.
import './styles/components/components-01.css';
import './styles/components/components-02.css';
import './styles/components/components-03.css';
import './styles/components/components-04.css';
import './styles/components/components-05.css';
import './styles/components/components-06.css';
import './styles/components/components-07.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// E2E-only test hooks. Gated on VITE_E2E (NOT DEV/PROD), so deploy builds — which
// never set VITE_E2E — tree-shake this block away (verified by check-no-e2e-hooks.mjs).
if (import.meta.env.VITE_E2E) {
  (window as unknown as { __gameStore?: typeof useGameStore }).__gameStore = useGameStore;
  (window as unknown as { __eventData?: typeof eventData }).__eventData = eventData;
  // detectPatterns lets the smoke test seed a deterministic coin set (all HEADS)
  // and recompute patterns with production logic, so a combat-pattern chip always
  // renders — combat coins are RNG and can yield zero patterns (alternating faces).
  (window as unknown as { __detectPatterns?: typeof detectPatterns }).__detectPatterns = detectPatterns;
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch((error) => {
        console.error('Service worker registration failed:', error);
      });
  });
}
