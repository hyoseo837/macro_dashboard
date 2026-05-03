import React from 'react';
import type { Widget, ClusteredArticles } from '../api/types';
import { useFeedClusteredArticles, useTopicArticles, useClusteredArticles } from '../hooks/useNews';

interface NewsWidgetProps {
  widget: Widget;
  currentW: number;
  currentH: number;
}

const ALL_ARTICLES = 200;

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

function BriefingItem({ group }: { group: ClusteredArticles }) {
  const sources = [...new Set(group.articles.map((a) => a.source_name))];
  const latestTime = group.articles[0]?.published_at ?? null;
  const displayText = group.summary || group.cluster_label || group.articles[0]?.title || '';

  return (
    <div className="news-briefing-item">
      <div className="news-briefing-text">{displayText}</div>
      <div className="news-briefing-meta">
        <div className="news-briefing-sources">
          {sources.map((source) => {
            const article = group.articles.find((a) => a.source_name === source);
            return (
              <a
                key={source}
                href={article?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="news-briefing-badge"
              >
                {source}
              </a>
            );
          })}
        </div>
        <span className="news-widget-time">{formatRelativeTime(latestTime)}</span>
      </div>
    </div>
  );
}


function BriefingView({ clusters, isLoading }: { clusters: ClusteredArticles[] | undefined; isLoading: boolean }) {
  if (isLoading) return <div className="news-widget-loading">Loading...</div>;
  if (!clusters || clusters.length === 0) return <div className="news-widget-empty">No articles yet</div>;

  return (
    <>
      {clusters.map((group, idx) => (
        <BriefingItem key={group.cluster_id ?? `single-${idx}`} group={group} />
      ))}
    </>
  );
}

const NewsWidget: React.FC<NewsWidgetProps> = ({ widget }) => {
  const mode = (widget.config.mode as string) || 'single';
  const feedId = (widget.config.feed_id as string) || '';
  const topic = (widget.config.topic as string) || '';
  const label = (widget.config.label as string) || feedId || topic;

  const singleQuery = useFeedClusteredArticles(mode === 'single' ? feedId : '', ALL_ARTICLES);
  const topicQuery = useTopicArticles(mode === 'topic' ? topic : '', ALL_ARTICLES);
  const overallQuery = useClusteredArticles(ALL_ARTICLES, mode === 'overall');

  const clusters = mode === 'topic' ? topicQuery : mode === 'overall' ? overallQuery : singleQuery;

  return (
    <div className="news-widget">
      <div className="news-widget-header">
        <span className="news-widget-label">{label}</span>
      </div>
      <div className="news-widget-list">
        <BriefingView clusters={clusters.data} isLoading={clusters.isLoading} />
      </div>
    </div>
  );
};

export default NewsWidget;
