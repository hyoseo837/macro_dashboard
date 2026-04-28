import { useState, useCallback, useRef } from 'react';
import { ResponsiveGridLayout, useContainerWidth, noCompactor } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Pencil } from 'lucide-react';
import type { Widget } from '../api/types';
import { updateLayout, deleteWidget } from '../api/widgets';
import WidgetDispatcher from './WidgetDispatcher';
import EditWidgetModal from './EditWidgetModal';

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
  const [liveSize, setLiveSize] = useState<Record<string, { w: number; h: number }>>({});
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);

  const layoutMutation = useMutation({
    mutationFn: updateLayout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widgets'] });
    },
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
      static: !editMode,
    })),
  };

  const handleLayoutChange = useCallback(
    (layout: readonly { i: string; x: number; y: number; w: number; h: number }[], _layouts?: Record<string, unknown>) => {
      const sizeMap: Record<string, { w: number; h: number }> = {};
      for (const l of layout) {
        sizeMap[l.i] = { w: l.w, h: l.h };
      }
      setLiveSize(sizeMap);

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
        compactor={noCompactor}
        onLayoutChange={handleLayoutChange}
      >
        {widgets.map((widget) => {
          const live = liveSize[String(widget.id)];
          return (
            <div key={String(widget.id)} className={`widget-cell ${editMode ? 'edit-mode' : ''}`}>
              {editMode && (
                <div className="widget-edit-controls">
                  <button
                    className="widget-edit-btn"
                    onClick={() => setEditingWidget(widget)}
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    className="widget-delete-btn"
                    onClick={() => deleteMutation.mutate(widget.id)}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <WidgetDispatcher
                widget={widget}
                currentW={live?.w ?? widget.layout_w}
                currentH={live?.h ?? widget.layout_h}
              />
            </div>
          );
        })}
      </ResponsiveGridLayout>
      <EditWidgetModal widget={editingWidget} onClose={() => setEditingWidget(null)} />
    </div>
  );
}
