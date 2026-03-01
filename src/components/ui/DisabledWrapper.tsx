import React from 'react';

type DisabledWrapperProps = {
  disabled: boolean;
  reason?: string;
  children: React.ReactNode;
  className?: string;
};

const DisabledWrapper = ({ disabled, reason, children, className = '' }: DisabledWrapperProps) => {
  const disabledClasses = disabled ? 'opacity-50 pointer-events-none cursor-not-allowed' : '';

  return (
    <div
      className={`${disabledClasses} ${className}`.trim()}
      aria-disabled={disabled}
      title={disabled && reason ? reason : undefined}
    >
      {children}
    </div>
  );
};

export default DisabledWrapper;
