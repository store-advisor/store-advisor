import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';
import { ActionStatus } from '@prisma/client';

export const approveActionSchema = z.object({
  idempotency_key: z
    .string({ error: 'idempotency_key is required' })
    .trim()
    .min(8, 'idempotency_key must be at least 8 characters'),
});

export type ApproveActionBody = z.infer<typeof approveActionSchema>;

export class ActionResponseDto {
  @ApiProperty({ example: 'cm7a1b2c3d4e5f6g7h8i9j0k1' })
  id: string;

  @ApiProperty({ enum: ActionStatus, enumName: 'ActionStatus' })
  status: ActionStatus;

  @ApiProperty({
    description:
      'True when this idempotency key had already been used. The action was not executed again.',
    example: false,
  })
  replayed: boolean;
}
