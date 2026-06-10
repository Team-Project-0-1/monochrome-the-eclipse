import React from 'react';
import { assetCssUrl } from '../../utils/assetPath';

interface ArchiveSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

// 책상 텍스처는 CSS url()이 아니라 여기서 주입한다 — public/ 에셋의 절대경로는
// Vite가 CSS에서 base path 리베이스를 안 해 줘서 GH Pages 배포에서 깨진다.
// assetCssUrl이 런타임 BASE_URL을 붙여 주므로 배포 base와 무관하게 안전.
const deskTextureStyle = {
  '--archive-desk-image': assetCssUrl('assets/archive/desk-surface.jpg'),
} as React.CSSProperties;

// 책상 표면 + 비네팅 + 필름 그레인. 모든 아카이브 화면의 최외곽 래퍼.
const ArchiveSurface: React.FC<ArchiveSurfaceProps> = ({ children, className = '', style, ...props }) => (
  <div {...props} style={{ ...deskTextureStyle, ...style }} className={`archive-surface ${className}`}>
    {children}
    <div className="archive-grain" aria-hidden="true" />
  </div>
);

export default ArchiveSurface;
