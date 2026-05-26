import React from 'react';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

const variantClasses: Record<NonNullable<ActionButtonProps['variant']>, string> = {
  primary: 'contrast-button-light bg-white text-gray-950 hover:bg-cyan-100 focus-visible:ring-cyan-300',
  secondary: 'contrast-button-dark bg-gray-700 text-white hover:bg-gray-600 focus-visible:ring-gray-300',
  danger: 'contrast-button-danger bg-red-700 text-white hover:bg-red-600 focus-visible:ring-red-300',
  ghost: 'contrast-button-dark bg-gray-950 text-white hover:bg-gray-900 focus-visible:ring-white/40',
};

const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  className = '',
  variant = 'secondary',
  type = 'button',
  ...props
}) => (
  <button
    type={type}
    className={`game-action-button game-action-${variant} inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:text-gray-400 ${variantClasses[variant]} ${className}`}
    {...props}
  >
    {children}
  </button>
);

export default ActionButton;
