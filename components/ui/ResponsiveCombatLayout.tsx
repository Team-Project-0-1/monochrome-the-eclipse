import React from 'react';

interface ResponsiveCombatLayoutProps {
  playerColumn: React.ReactNode;
  centerColumn: React.ReactNode;
  enemyColumn: React.ReactNode;
  className?: string;
}

const ResponsiveCombatLayout: React.FC<ResponsiveCombatLayoutProps> = ({
  playerColumn,
  centerColumn,
  enemyColumn,
  className = '',
}) => (
  <div className={`grid min-h-0 flex-1 grid-cols-1 gap-4 lg:h-full lg:grid-cols-3 ${className}`}>
    <div className="order-3 flex min-h-0 flex-col gap-4 lg:order-1">{playerColumn}</div>
    <div className="order-2 flex min-h-0 flex-col gap-4 lg:order-2">{centerColumn}</div>
    <div className="order-1 flex min-h-0 flex-col gap-4 lg:order-3">{enemyColumn}</div>
  </div>
);

export default ResponsiveCombatLayout;
