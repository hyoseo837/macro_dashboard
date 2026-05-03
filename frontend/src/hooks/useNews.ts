import { useQuery } from '@tanstack/react-query';
import { getNewsArticles, getNewsCatalog, getFeedClusteredArticles, getTopicArticles, getClusteredArticles, getAiStatus } from '../api/news';

export function useNewsCatalog() {
  return useQuery({
    queryKey: ['newsCatalog'],
    queryFn: getNewsCatalog,
    staleTime: Infinity,
  });
}

export function useNewsArticles(feedId: string, limit = 20) {
  return useQuery({
    queryKey: ['newsArticles', feedId, limit],
    queryFn: () => getNewsArticles(feedId, limit),
    staleTime: 5 * 60 * 1000,
    enabled: !!feedId,
  });
}

export function useFeedClusteredArticles(feedKey: string, limit = 200) {
  return useQuery({
    queryKey: ['feedClusteredArticles', feedKey, limit],
    queryFn: () => getFeedClusteredArticles(feedKey, limit),
    staleTime: 5 * 60 * 1000,
    enabled: !!feedKey,
  });
}

export function useTopicArticles(topic: string, limit = 20) {
  return useQuery({
    queryKey: ['topicArticles', topic, limit],
    queryFn: () => getTopicArticles(topic, limit),
    staleTime: 5 * 60 * 1000,
    enabled: !!topic,
  });
}

export function useClusteredArticles(limit = 30, enabled = true) {
  return useQuery({
    queryKey: ['clusteredArticles', limit],
    queryFn: () => getClusteredArticles(limit),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useAiStatus() {
  return useQuery({
    queryKey: ['aiStatus'],
    queryFn: getAiStatus,
    staleTime: Infinity,
  });
}
