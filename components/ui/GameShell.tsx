import React from 'react';

interface GameShellProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  withScanlines?: boolean;
}

const GameShell: React.FC<GameShellProps> = ({
  children,
  className = '',
  contentClassName = '',
  withScanlines = true,
}) => (
  <main
    className={`game-shell relative min-h-screen overflow-hidden bg-gray-950 text-white ${withScanlines ? 'scanlines' : ''} ${className}`}
  >
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_28%),linear-gradient(180deg,rgba(3,7,18,0.82),rgba(3,7,18,0.98))]" />
    <div className={`game-shell-content relative z-10 mx-auto w-full ${contentClassName}`}>{children}</div>
  </main>
);

export default GameShell;
