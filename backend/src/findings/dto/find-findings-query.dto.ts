import { z } from 'zod';

export const findFindingsQuerySchema = z.object({
  merchant_id: z
    .string({ error: 'merchant_id is required' })
    .trim()
    .min(1, 'merchant_id must not be empty'),
});

export type FindFindingsQuery = z.infer<typeof findFindingsQuerySchema>;
