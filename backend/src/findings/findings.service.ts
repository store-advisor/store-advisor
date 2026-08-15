import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FindingResponseDto } from './dto/finding-response.dto';

@Injectable()
export class FindingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByMerchantId(merchantId: string): Promise<FindingResponseDto[]> {
    const findings = await this.prisma.finding.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
    });

    return findings.map((f) => ({
      id: f.id,
      merchantId: f.merchantId,
      checkId: f.checkId,
      status: f.status,
      evidence: f.evidence as Record<string, unknown>,
      estimatedCost: Number(f.estimatedCost),
      llmExplanation: f.llmExplanation,
      llmConfidence: f.llmConfidence,
      createdAt: f.createdAt,
    }));
  }
}
