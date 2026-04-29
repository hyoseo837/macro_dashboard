import type { Widget } from '../api/types';
import AssetWidget from './AssetWidget';
import NewsWidget from './NewsWidget';
import TimeWidget from './TimeWidget';

interface WidgetDispatcherProps {
  widget: Widget;
  currentW: number;
  currentH: number;
}

export default function WidgetDispatcher({ widget, currentW, currentH }: WidgetDispatcherProps) {
  switch (widget.type) {
    case 'asset':
      return <AssetWidget widget={widget} currentW={currentW} currentH={currentH} />;
    case 'time':
      return <TimeWidget widget={widget} currentW={currentW} currentH={currentH} />;
    case 'news':
      return <NewsWidget widget={widget} currentW={currentW} currentH={currentH} />;
    default:
      return (
        <div className="widget-placeholder">
          <span className="widget-placeholder-type">UNKNOWN</span>
        </div>
      );
  }
}
