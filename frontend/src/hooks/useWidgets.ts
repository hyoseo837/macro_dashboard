import { useQuery } from '@tanstack/react-query';
import { getWidgets } from '../api/widgets';

export const useWidgets = () => {
  return useQuery({
    queryKey: ['widgets'],
    queryFn: getWidgets,
    staleTime: Infinity,
  });
};
