import React from 'react';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, subtitle, eyebrow, actions, className = '' }) => (
  <header className={`screen-card-header mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between ${className}`}>
    <div>
      {eyebrow && <p className="mb-2 text-xs font-bold uppercase text-cyan-300">{eyebrow}</p>}
      <h1 className="font-orbitron text-3xl font-black text-white sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-300 sm:text-base">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
  </header>
);

export default ScreenHeader;
