import { useQuery } from '@tanstack/react-query';
import { getPrices } from '../api/prices';

export const usePrices = () => {
  return useQuery({
    queryKey: ['prices'],
    queryFn: getPrices,
    refetchInterval: 60000, // 60 seconds
    staleTime: 30000,
  });
};
