import { useQuery } from '@tanstack/react-query';
import { getNewsArticles, getNewsCatalog } from '../api/news';

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
