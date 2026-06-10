import React from 'react';

interface ArchiveStampProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

// 잉크 도장 라벨 — 배지/uppercase 칩의 아카이브 대체물.
const ArchiveStamp: React.FC<ArchiveStampProps> = ({ children, className = '', ...props }) => (
  <span {...props} className={`archive-stamp ${className}`}>
    {children}
  </span>
);

export default ArchiveStamp;
