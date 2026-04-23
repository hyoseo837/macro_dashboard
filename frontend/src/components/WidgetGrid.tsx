import { useCallback, useRef } from 'react';
import { ResponsiveGridLayout, useContainerWidth, type Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import type { Widget } from '../api/types';
import { updateLayout, deleteWidget } from '../api/widgets';
import WidgetDispatcher from './WidgetDispatcher';

const BREAKPOINTS = { lg: 1200, md: 900, sm: 600, xs: 0 };
const COLS = { lg: 6, md: 4, sm: 2, xs: 1 };
const ROW_HEIGHT = 200;
const MARGIN: [number, number] = [16, 16];

interface WidgetGridProps {
  widgets: Widget[];
  editMode: boolean;
}

export default function WidgetGrid({ widgets, editMode }: WidgetGridProps) {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const { containerRef, width } = useContainerWidth({ initialWidth: 1280 });

  const layoutMutation = useMutation({
    mutationFn: updateLayout,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWidget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widgets'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  const layouts = {
    lg: widgets.map((w) => ({
      i: String(w.id),
      x: w.layout_x,
      y: w.layout_y,
      w: w.layout_w,
      h: w.layout_h,
      minW: 1,
      minH: 1,
      maxW: 6,
      maxH: 4,
    })),
  };

  const handleLayoutChange = useCallback(
    (layout: Layout[]) => {
      if (!editMode) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        const items = layout.map((l) => ({
          id: Number(l.i),
          layout_x: l.x,
          layout_y: l.y,
          layout_w: l.w,
          layout_h: l.h,
        }));
        layoutMutation.mutate(items);
      }, 400);
    },
    [editMode, layoutMutation],
  );

  return (
    <div ref={containerRef}>
      <ResponsiveGridLayout
        className="widget-grid"
        width={width}
        layouts={layouts}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        margin={MARGIN}
        isDraggable={editMode}
        isResizable={editMode}
        compactType={null}
        preventCollision={true}
        onLayoutChange={handleLayoutChange}
      >
        {widgets.map((widget) => (
          <div key={String(widget.id)} className={`widget-cell ${editMode ? 'edit-mode' : ''}`}>
            {editMode && (
              <button
                className="widget-delete-btn"
                onClick={() => deleteMutation.mutate(widget.id)}
              >
                <X size={14} />
              </button>
            )}
            <WidgetDispatcher widget={widget} editMode={editMode} />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
