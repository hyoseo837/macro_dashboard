import { useQuery } from '@tanstack/react-query';
import { getAssets } from '../api/assets';

export const useAssets = () => {
  return useQuery({
    queryKey: ['assets'],
    queryFn: getAssets,
    staleTime: Infinity,
  });
};
