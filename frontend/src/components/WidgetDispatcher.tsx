import type { Widget } from '../api/types';

interface WidgetDispatcherProps {
  widget: Widget;
  editMode: boolean;
}

export default function WidgetDispatcher({ widget, editMode }: WidgetDispatcherProps) {
  switch (widget.type) {
    case 'asset':
      return (
        <div className="widget-placeholder">
          <span className="widget-placeholder-type">ASSET</span>
          <span className="widget-placeholder-label">{widget.config.label || widget.config.asset_id}</span>
        </div>
      );
    case 'time':
      return (
        <div className="widget-placeholder">
          <span className="widget-placeholder-type">TIME</span>
          <span className="widget-placeholder-label">{widget.config.label || widget.config.timezone}</span>
        </div>
      );
    default:
      return (
        <div className="widget-placeholder">
          <span className="widget-placeholder-type">UNKNOWN</span>
        </div>
      );
  }
}
