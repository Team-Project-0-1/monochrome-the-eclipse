import React from 'react';

interface ArchiveCaptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  sub?: boolean;
}

// 타자기 캡션 — 사진/물건 밑의 기록 텍스트.
const ArchiveCaption: React.FC<ArchiveCaptionProps> = ({ children, sub = false, className = '', ...props }) => (
  <p {...props} className={`archive-caption ${sub ? 'archive-caption-sub' : ''} ${className}`}>
    {children}
  </p>
);

export default ArchiveCaption;
