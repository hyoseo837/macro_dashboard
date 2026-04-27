import React, { useState, useEffect } from 'react';
import type { Widget } from '../api/types';
import AnalogClock from './AnalogClock';

interface TimeWidgetProps {
  widget: Widget;
  currentW: number;
  currentH: number;
}

type SizeVariant = 'compact' | 'wide' | 'tall' | 'full';

function getSizeVariant(w: number, h: number): SizeVariant {
  if (w >= 2 && h >= 2) return 'full';
  if (w >= 2) return 'wide';
  if (h >= 2) return 'tall';
  return 'compact';
}

function getTimeData(timezone: string) {
  const now = new Date();
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', { ...opts, timeZone: timezone }).format(now);

  const time = fmt({ hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const date = fmt({ month: 'short', day: 'numeric', year: 'numeric' });
  const weekday = fmt({ weekday: 'long' });

  const utcParts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  }).formatToParts(now);
  const offsetPart = utcParts.find((p) => p.type === 'timeZoneName');
  const utcOffset = offsetPart?.value ?? '';

  return { time, date, weekday, utcOffset };
}

const TimeWidget: React.FC<TimeWidgetProps> = ({ widget, currentW, currentH }) => {
  const timezone = (widget.config.timezone as string) || 'UTC';
  const label = (widget.config.label as string) || timezone.split('/').pop()?.replace(/_/g, ' ') || timezone;
  const mode = (widget.config.mode as string) || 'analog';
  const isAnalog = mode === 'analog';
  const variant = getSizeVariant(currentW, currentH);

  const [timeData, setTimeData] = useState(() => getTimeData(timezone));

  useEffect(() => {
    const id = setInterval(() => setTimeData(getTimeData(timezone)), 1000);
    return () => clearInterval(id);
  }, [timezone]);

  // ── Compact ──
  if (variant === 'compact') {
    return (
      <div className="tw tw-compact">
        <div className="tw-label">{label}</div>
        {isAnalog
          ? <AnalogClock timezone={timezone} size={100} />
          : <div className="tw-time">{timeData.time}</div>
        }
        <div className="tw-offset">{timeData.utcOffset}</div>
      </div>
    );
  }

  // ── Wide ──
  if (variant === 'wide') {
    return (
      <div className="tw tw-wide">
        <div className="tw-wide-left">
          <div className="tw-label">{label}</div>
          {isAnalog
            ? <AnalogClock timezone={timezone} size={110} />
            : <div className="tw-time-lg">{timeData.time}</div>
          }
          <div className="tw-offset">{timeData.utcOffset}</div>
        </div>
        <div className="tw-wide-right">
          {isAnalog && <div className="tw-time-lg">{timeData.time}</div>}
          <div className="tw-date">{timeData.weekday} · {timeData.date}</div>
        </div>
      </div>
    );
  }

  // ── Tall ──
  if (variant === 'tall') {
    return (
      <div className="tw tw-tall">
        <div className="tw-label">{label}</div>
        {isAnalog
          ? <>
              <AnalogClock timezone={timezone} size={130} />
              <div className="tw-time">{timeData.time}</div>
            </>
          : <div className="tw-time-xl">{timeData.time}</div>
        }
        <div className="tw-detail-col">
          <div className="tw-date">{timeData.weekday} · {timeData.date}</div>
          <div className="tw-offset">{timeData.utcOffset}</div>
        </div>
      </div>
    );
  }

  // ── Full ──
  return (
    <div className="tw tw-full">
      <div className="tw-label-lg">{label}</div>
      {isAnalog
        ? <>
            <AnalogClock timezone={timezone} size={180} />
            <div className="tw-time-lg">{timeData.time}</div>
          </>
        : <div className="tw-time-xl">{timeData.time}</div>
      }
      <div className="tw-detail-row">
        <div className="tw-detail-item">
          <span className="tw-detail-label">Day</span>
          <span className="tw-detail-value">{timeData.weekday}</span>
        </div>
        <div className="tw-detail-item">
          <span className="tw-detail-label">Date</span>
          <span className="tw-detail-value">{timeData.date}</span>
        </div>
        <div className="tw-detail-item">
          <span className="tw-detail-label">UTC</span>
          <span className="tw-detail-value">{timeData.utcOffset}</span>
        </div>
      </div>
    </div>
  );
};

export default TimeWidget;
