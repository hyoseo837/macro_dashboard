import { apiClient } from './client';
import type { NewsFeedCatalogEntry, NewsArticle, ClusteredArticles } from './types';

export async function getNewsCatalog(): Promise<NewsFeedCatalogEntry[]> {
  const { data } = await apiClient.get<NewsFeedCatalogEntry[]>('/news/catalog');
  return data;
}

export async function getNewsArticles(feedId: string, limit = 20): Promise<NewsArticle[]> {
  const { data } = await apiClient.get<NewsArticle[]>('/news/articles', {
    params: { feed_id: feedId, limit },
  });
  return data;
}

export async function getTopics(): Promise<string[]> {
  const { data } = await apiClient.get<string[]>('/news/topics');
  return data;
}

export async function getTopicArticles(topic: string, limit = 20): Promise<ClusteredArticles[]> {
  const { data } = await apiClient.get<ClusteredArticles[]>('/news/articles/topic', {
    params: { topic, limit },
  });
  return data;
}

export async function getClusteredArticles(limit = 30): Promise<ClusteredArticles[]> {
  const { data } = await apiClient.get<ClusteredArticles[]>('/news/articles/clustered', {
    params: { limit },
  });
  return data;
}

export async function getAiStatus(): Promise<{ ai_enabled: boolean }> {
  const { data } = await apiClient.get<{ ai_enabled: boolean }>('/news/ai-status');
  return data;
}
