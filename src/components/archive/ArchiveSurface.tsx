import React from 'react';

interface ArchiveSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

// 책상 표면 + 비네팅 + 필름 그레인. 모든 아카이브 화면의 최외곽 래퍼.
const ArchiveSurface: React.FC<ArchiveSurfaceProps> = ({ children, className = '', ...props }) => (
  <div {...props} className={`archive-surface ${className}`}>
    {children}
    <div className="archive-grain" aria-hidden="true" />
  </div>
);

export default ArchiveSurface;
