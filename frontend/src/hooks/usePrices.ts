import { useQuery } from '@tanstack/react-query';
import { getPrices } from '../api/prices';

export const usePrices = (refetchInterval = 60000) => {
  return useQuery({
    queryKey: ['prices'],
    queryFn: getPrices,
    refetchInterval,
    staleTime: 30000,
  });
};
