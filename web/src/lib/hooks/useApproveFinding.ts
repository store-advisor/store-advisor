'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { approveFinding, type ActionResult } from '../api/findings';

/**
 * Approving does not itself move the finding to FIXED, and the UI must not
 * pretend otherwise. The action pauses the campaign; the finding turns green
 * only when a later check run independently re-observes that the spend
 * stopped. That is stage 6, and it is the project's whole argument.
 *
 * So this invalidates the findings query rather than writing an optimistic
 * FIXED into the cache: the refetch shows the truth at that moment, which is
 * an action that succeeded and a finding still open.
 */
export function useApproveFinding(merchantId: string) {
  const queryClient = useQueryClient();

  return useMutation<ActionResult, Error, string>({
    mutationFn: (findingId: string) => approveFinding(findingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['findings', merchantId] });
    },
  });
}
