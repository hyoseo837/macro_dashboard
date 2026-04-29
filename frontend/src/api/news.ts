import { apiClient } from './client';
import type { NewsFeedCatalogEntry, NewsArticle } from './types';

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
