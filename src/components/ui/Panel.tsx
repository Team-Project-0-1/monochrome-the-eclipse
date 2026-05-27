import React from 'react';

interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
  tone?: 'neutral' | 'cyan' | 'red' | 'gold';
}

const toneClasses: Record<NonNullable<PanelProps['tone']>, string> = {
  neutral: 'contrast-panel contrast-panel-neutral border-white/10 bg-gray-900 shadow-black/30',
  cyan: 'contrast-panel contrast-panel-cyan border-cyan-400/25 bg-gray-950 shadow-cyan-950/20',
  red: 'contrast-panel contrast-panel-red border-red-400/25 bg-gray-950 shadow-red-950/20',
  gold: 'contrast-panel contrast-panel-gold border-yellow-300/25 bg-gray-950 shadow-yellow-950/20',
};

const Panel: React.FC<PanelProps> = ({ children, className = '', tone = 'neutral', ...props }) => (
  <section
    {...props}
    data-card-tone={tone}
    className={`game-card-panel rounded-lg border shadow-xl backdrop-blur-sm ${toneClasses[tone]} ${className}`}
  >
    {children}
  </section>
);

export default Panel;
