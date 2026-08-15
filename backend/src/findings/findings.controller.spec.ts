import { Test, TestingModule } from '@nestjs/testing';
import { FindingsController } from './findings.controller';
import { FindingsService } from './findings.service';
import { FindingStatus } from '@prisma/client';

describe('FindingsController', () => {
  let controller: FindingsController;
  let findByMerchantIdMock: jest.Mock;

  const mockFindings = [
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
  ];

  beforeEach(async () => {
    findByMerchantIdMock = jest.fn().mockResolvedValue(mockFindings);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FindingsController],
      providers: [
        {
          provide: FindingsService,
          useValue: {
            findByMerchantId: findByMerchantIdMock,
          },
        },
      ],
    }).compile();

    controller = module.get<FindingsController>(FindingsController);
  });

  it('delegates to findingsService.findByMerchantId', async () => {
    const result = await controller.getFindings({
      merchant_id: 'merchant-123',
    });
    expect(findByMerchantIdMock).toHaveBeenCalledWith('merchant-123');
    expect(result).toEqual(mockFindings);
  });
});
