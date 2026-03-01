import React from 'react';

const baseClasses =
  'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-transparent';

const variants = {
  primary: 'fs-btn-primary',
  secondary: 'border border-white/20 text-white hover:bg-white/10',
  success: 'rounded bg-emerald-500 px-3 py-2 text-sm font-semibold text-black hover:bg-emerald-400',
  danger: 'rounded bg-rose-500 px-3 py-2 text-sm font-semibold text-black hover:bg-rose-400',
  tab: 'rounded-lg px-2 py-2 text-xs bg-white/5 text-white/70 hover:bg-white/10',
  tabActive: 'rounded-lg px-2 py-2 text-xs bg-accent text-black',
};

const Button = ({
  children,
  variant = 'primary',
  disabled = false,
  disabledReason,
  className = '',
  type = 'button',
  ...props
}) => {
  const resolvedVariant = variants[variant] || variants.primary;

  return (
    <button
      type={type}
      disabled={disabled}
      aria-disabled={disabled}
      title={disabled && disabledReason ? disabledReason : props.title}
      className={`${baseClasses} ${resolvedVariant} disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
