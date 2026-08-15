import { Test, TestingModule } from '@nestjs/testing';
import { FindingsService } from './findings.service';
import { PrismaService } from '../prisma/prisma.service';
import { FindingStatus } from '@prisma/client';

describe('FindingsService', () => {
  let service: FindingsService;
  let findManyMock: jest.Mock;

  const mockPrismaFindings = [
    {
      id: 'finding-1',
      merchantId: 'merchant-123',
      checkId: 'ad_spend_on_oos',
      status: FindingStatus.OPEN,
      evidence: { daily_spend: 40.5 },
      estimatedCost: '284.00',
      llmExplanation: 'Spend on out of stock',
      llmConfidence: 0.95,
      createdAt: new Date('2026-08-01T10:00:00.000Z'),
    },
  ];

  beforeEach(async () => {
    findManyMock = jest.fn().mockResolvedValue(mockPrismaFindings);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindingsService,
        {
          provide: PrismaService,
          useValue: {
            finding: {
              findMany: findManyMock,
            },
          },
        },
      ],
    }).compile();

    service = module.get<FindingsService>(FindingsService);
  });

  it('queries prisma finding with merchantId ordered by createdAt desc and formats estimatedCost', async () => {
    const results = await service.findByMerchantId('merchant-123');
    expect(findManyMock).toHaveBeenCalledWith({
      where: { merchantId: 'merchant-123' },
      orderBy: { createdAt: 'desc' },
    });
    expect(results).toEqual([
      {
        id: 'finding-1',
        merchantId: 'merchant-123',
        checkId: 'ad_spend_on_oos',
        status: FindingStatus.OPEN,
        evidence: { daily_spend: 40.5 },
        estimatedCost: 284,
        llmExplanation: 'Spend on out of stock',
        llmConfidence: 0.95,
        createdAt: new Date('2026-08-01T10:00:00.000Z'),
      },
    ]);
  });
});
