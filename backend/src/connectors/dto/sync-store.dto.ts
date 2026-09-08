import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const syncStoreSchema = z.object({
  merchant_id: z
    .string({ error: 'merchant_id is required' })
    .trim()
    .min(1, 'merchant_id cannot be empty'),
});

export type SyncStoreBody = z.infer<typeof syncStoreSchema>;

export class SyncStoreResponseDto {
  @ApiProperty({ example: 'shopify' })
  source: string;

  @ApiProperty({ example: 'demo_merchant' })
  merchantId: string;

  @ApiProperty({ example: 2, description: 'Number of product variants synced' })
  productsSynced: number;

  @ApiProperty({
    example: 1,
    description:
      'Number of stock_out events detected and emitted to the event log',
  })
  stockOutEventsEmitted: number;

  @ApiProperty({ example: 1, description: 'Number of order line items synced' })
  ordersSynced: number;
}
