import React, { useState, useEffect } from 'react';

interface AnalogClockProps {
  timezone: string;
  size?: number;
}

function getAngles(timezone: string) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
    fractionalSecondDigits: 3,
  } as Intl.DateTimeFormatOptions).formatToParts(now);

  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  const s = Number(parts.find((p) => p.type === 'second')?.value ?? 0);

  const hourAngle = ((h % 12) + m / 60) * 30;
  const minuteAngle = (m + s / 60) * 6;
  const secondAngle = s * 6;

  return { hourAngle, minuteAngle, secondAngle };
}

const AnalogClock: React.FC<AnalogClockProps> = ({ timezone, size = 120 }) => {
  const [angles, setAngles] = useState(() => getAngles(timezone));

  useEffect(() => {
    const id = setInterval(() => setAngles(getAngles(timezone)), 1000);
    return () => clearInterval(id);
  }, [timezone]);

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  const hand = (angle: number, length: number, width: number, color: string) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    const x2 = cx + length * Math.cos(rad);
    const y2 = cy + length * Math.sin(rad);
    return (
      <line
        x1={cx} y1={cy} x2={x2} y2={y2}
        stroke={color} strokeWidth={width} strokeLinecap="round"
      />
    );
  };

  const hourMarkers = Array.from({ length: 12 }, (_, i) => {
    const angle = ((i * 30 - 90) * Math.PI) / 180;
    const x1 = cx + (r - 6) * Math.cos(angle);
    const y1 = cy + (r - 6) * Math.sin(angle);
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    return (
      <line
        key={i}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="var(--text-dim)" strokeWidth={i % 3 === 0 ? 2 : 1} strokeLinecap="round"
      />
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={1.5} />
      {hourMarkers}
      {hand(angles.hourAngle, r * 0.5, 3, 'var(--text-primary)')}
      {hand(angles.minuteAngle, r * 0.72, 2, 'var(--text-primary)')}
      {hand(angles.secondAngle, r * 0.8, 1, 'var(--green)')}
      <circle cx={cx} cy={cy} r={2.5} fill="var(--green)" />
    </svg>
  );
};

export default AnalogClock;
