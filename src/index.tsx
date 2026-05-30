import React from 'react';
// FIX: Updated the import for ReactDOM to use 'react-dom/client' to access the createRoot API as required by React 18.
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/tokens.css';
import './index.css';
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

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch((error) => {
        console.error('Service worker registration failed:', error);
      });
  });
}
