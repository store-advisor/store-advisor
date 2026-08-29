'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchFindings, type Finding } from '../api/findings';

export function useFindings(merchantId: string) {
  return useQuery<Finding[]>({
    queryKey: ['findings', merchantId],
    queryFn: () => fetchFindings(merchantId),
    enabled: merchantId.length > 0,
  });
}
