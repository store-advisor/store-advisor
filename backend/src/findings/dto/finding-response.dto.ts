import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FindingStatus } from '@prisma/client';

export class FindingResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the finding (cuid)',
    example: 'cm7a1b2c3d4e5f6g7h8i9j0k1',
  })
  id: string;

  @ApiProperty({
    description: 'Merchant ID associated with this finding',
    example: 'merchant_123',
  })
  merchantId: string;

  @ApiProperty({
    description: 'Check module identifier that generated this finding',
    example: 'ad_spend_on_oos',
  })
  checkId: string;

  @ApiProperty({
    description: 'Current finding status',
    enum: FindingStatus,
    enumName: 'FindingStatus',
    example: FindingStatus.OPEN,
  })
  status: FindingStatus;

  @ApiProperty({
    description:
      'Deterministic evidence payload proved by the deterministic check',
    example: {
      stock_out_at: '2026-03-04T09:12:00.000Z',
      daily_spend: 40.5,
      days_active: 7,
    },
  })
  evidence: Record<string, unknown>;

  @ApiProperty({
    description: 'Estimated financial cost / waste in dollars per week',
    example: 284.0,
  })
  estimatedCost: number;

  @ApiPropertyOptional({
    description: 'LLM generated plain-language explanation of the finding',
    nullable: true,
    example:
      'You are spending $40.50/day on ads for a product that is out of stock.',
  })
  llmExplanation: string | null;

  @ApiPropertyOptional({
    description: 'LLM confidence score (0.0 to 1.0)',
    nullable: true,
    example: 0.95,
  })
  llmConfidence: number | null;

  @ApiPropertyOptional({
    description:
      'LLM severity ranking. Free text rather than an enum: severity is a judgement ' +
      'the model makes, not an internal state, so widening its vocabulary must not ' +
      'require a migration.',
    nullable: true,
    example: 'high',
  })
  llmSeverity: string | null;

  @ApiProperty({
    description: 'Timestamp when finding was created',
    example: '2026-08-15T12:00:00.000Z',
  })
  createdAt: Date;
}
