import React from 'react';

export interface SkeletonProps {
  variant?: 'text' | 'heading' | 'circle' | 'card' | 'table-row';
  width?: string;
  count?: number;
  className?: string;
}

const variantStyles = {
  text: 'h-4 rounded',
  heading: 'h-8 rounded-lg',
  circle: 'rounded-full',
  card: 'h-32 rounded-2xl',
  'table-row': 'h-12 rounded-lg',
};

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width = 'w-full',
  count = 1,
  className = '',
}) => {
  const baseClasses = `animate-pulse bg-slate-200 ${variantStyles[variant]} ${width} ${className}`;

  if (variant === 'circle') {
    return (
      <div className={`${baseClasses} ${width === 'w-full' ? 'h-10 w-10' : width}`} />
    );
  }

  if (count === 1) {
    return <div className={baseClasses} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={baseClasses} />
      ))}
    </div>
  );
};

/** Pre-built skeleton for a table with header and rows */
export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 4,
}) => (
  <div className="space-y-3">
    <div className="flex gap-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} variant="text" width={i === 0 ? 'w-1/4' : 'w-1/6'} />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} variant="table-row" />
    ))}
  </div>
);
