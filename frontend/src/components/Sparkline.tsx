import React, { useId } from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts';
import type { SparklinePoint } from '../api/types';
import { formatPrice } from '../lib/format';

interface SparklineProps {
  data: SparklinePoint[];
  isUp: boolean;
  currency: string;
  showDateAxis?: boolean;
}

const Sparkline: React.FC<SparklineProps> = ({ data, isUp, currency, showDateAxis }) => {
  const uid = useId();
  if (!data || data.length < 2) return null;

  const color = isUp ? '#3fb27f' : '#d95f5f';
  const fillId = `gradient-${uid}`;

  return (
    <div className="sparkline-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: showDateAxis ? 0 : 0 }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.15}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <YAxis domain={['auto', 'auto']} hide />
          <XAxis
            dataKey="date"
            hide={!showDateAxis}
            tickFormatter={(v: string) => {
              const d = new Date(v);
              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }}
            tick={{ fontSize: 9, fill: 'var(--text-dim)', fontFamily: 'var(--mono)' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as SparklinePoint;
                return (
                  <div className="bg-[var(--bg)] border border-[var(--border)] px-2 py-1 rounded shadow-xl pointer-events-none">
                    <div className="text-[9px] font-mono text-[var(--text-dim)] uppercase">
                      {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="text-[11px] font-mono font-semibold text-[var(--text-primary)]">
                      {formatPrice(item.price, currency)} <span className="text-[9px] text-[var(--text-dim)]">{currency}</span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
            cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${fillId})`}
            dot={false}
            activeDot={{ r: 4, stroke: 'var(--bg)', strokeWidth: 2, fill: color }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Sparkline;
