import React from 'react';
import type { Widget } from '../api/types';
import { useNewsArticles } from '../hooks/useNews';

interface NewsWidgetProps {
  widget: Widget;
  currentW: number;
  currentH: number;
}

function getArticleCount(w: number, h: number): number {
  const area = w * h;
  if (area >= 6) return 15;
  if (area >= 4) return 10;
  if (area >= 3) return 6;
  return 4;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d`;
}

const NewsWidget: React.FC<NewsWidgetProps> = ({ widget, currentW, currentH }) => {
  const feedId = (widget.config.feed_id as string) || '';
  const label = (widget.config.label as string) || feedId;
  const count = getArticleCount(currentW, currentH);
  const { data: articles, isLoading } = useNewsArticles(feedId, count);

  return (
    <div className="news-widget">
      <div className="news-widget-header">
        <span className="news-widget-label">{label}</span>
      </div>
      <div className="news-widget-list">
        {isLoading && <div className="news-widget-loading">Loading...</div>}
        {!isLoading && (!articles || articles.length === 0) && (
          <div className="news-widget-empty">No articles yet</div>
        )}
        {articles?.map((article) => (
          <a
            key={article.id}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="news-widget-item"
          >
            <span className="news-widget-title">{article.title}</span>
            <div className="news-widget-meta">
              <span className="news-widget-source">{article.source_name}</span>
              <span className="news-widget-time">
                {formatRelativeTime(article.published_at)}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default NewsWidget;
