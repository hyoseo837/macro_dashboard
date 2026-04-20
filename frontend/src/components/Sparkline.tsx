import React from 'react';

interface SparklineProps {
  data: number[];
  isUp: boolean;
}

const Sparkline: React.FC<SparklineProps> = ({ data, isUp }) => {
  if (!data || data.length < 2) return null;

  const width = 300;
  const height = 70; // Matches .sparkline-wrap height in CSS
  const pad = 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 0.01;
  const xStep = (width - pad * 2) / (data.length - 1);

  const coords = data.map((val, i) => ({
    x: pad + i * xStep,
    y: pad + (1 - (val - min) / range) * (height - pad * 2),
  }));

  let d = `M ${coords[0].x},${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    const cp1x = coords[i - 1].x + xStep * 0.45;
    const cp1y = coords[i - 1].y;
    const cp2x = coords[i].x - xStep * 0.45;
    const cp2y = coords[i].y;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${coords[i].x},${coords[i].y}`;
  }

  const last = coords[coords.length - 1];
  const first = coords[0];
  const fillD = `${d} L ${last.x},${height} L ${first.x},${height} Z`;

  const color = isUp ? '#3fb27f' : '#d95f5f';

  return (
    <div className="sparkline-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full block"
      >
        <path
          d={fillD}
          fill={color}
          fillOpacity="0.1"
        />
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default Sparkline;
