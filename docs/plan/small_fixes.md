# Bugs — done

- ~~add widget fails but few seconds later it suddenly appears.~~ — fixed via `setQueryData` for instant cache update (AddWidgetModal, WidgetGrid)
- ~~widgets should not be on same position regardless on their size.~~ — fixed via `preventCollision: true` on grid compactor (WidgetGrid)
- ~~while dragging around the widget during edit mode, unnecessary movement exist.~~ — same `preventCollision` fix
- ~~don't let widgets interactable (hyperlinks) while edit mode~~ — `pointer-events: none` on widget content in edit mode, edit controls stay clickable

# Changes — done

- ~~Increase readability of everything~~ — bumped base font 13→14px, brighter secondary/dim colors, +1px on smallest labels
- ~~News widget should always show everything on the DB.~~ — removed article count cap, fetches up to 200 with scrollbar
- ~~Single news will also have one-liner instead raw headlines.~~ — new `/news/articles/feed/clustered` endpoint; all three news modes now use briefing format
- ~~Asset widget AI summary~~ — Gemini generates one-liner explaining weekly price movement using news context. Stored in `price_snapshots.summary`, refreshed hourly via AI pipeline. Displayed below symbol in all widget sizes.
