import React from 'react';

const Skeleton = ({ className = '', variant = 'rectangular', width, height, count = 1 }) => {
  const baseClasses = 'animate-pulse bg-white/10 rounded';
  const variantClasses = {
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
    text: 'rounded h-4',
  };

  const style = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (count > 1) {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            style={style}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

export const SkeletonCard = () => (
  <div className="fs-card space-y-4">
    <Skeleton variant="text" className="h-5 w-1/3" />
    <Skeleton variant="text" className="h-10 w-1/2" />
    <Skeleton variant="text" className="h-4 w-2/3" />
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 4 }) => (
  <div className="fs-card space-y-4">
    <div className="flex gap-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} variant="text" className="h-4 flex-1" />
      ))}
    </div>
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} variant="text" className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonDashboard = () => (
  <div className="space-y-6">
    <Skeleton variant="rectangular" className="h-24 w-full" />
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <SkeletonTable rows={3} cols={3} />
      <SkeletonTable rows={3} cols={3} />
    </div>
  </div>
);

export default Skeleton;
