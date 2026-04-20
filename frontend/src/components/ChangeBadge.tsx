import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChangeBadgeProps {
  value: number;
}

const ChangeBadge: React.FC<ChangeBadgeProps> = ({ value }) => {
  const isUp = value >= 0;
  return (
    <div className={cn('change-pill', isUp ? 'up' : 'down')}>
      <span className="arrow">{isUp ? '▲' : '▼'}</span>
      {new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        signDisplay: 'exceptZero',
      }).format(value)}%
    </div>
  );
};

export default ChangeBadge;
