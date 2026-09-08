import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConnectorsController } from './connectors.controller';
import { ConnectorsService, SyncSummary } from './connectors.service';

describe('ConnectorsController', () => {
  let controller: ConnectorsController;
  let syncMock: jest.Mock;

  const mockSummary: SyncSummary = {
    source: 'shopify',
    merchantId: 'm-123',
    productsSynced: 2,
    stockOutEventsEmitted: 1,
    ordersSynced: 1,
  };

  beforeEach(async () => {
    syncMock = jest.fn().mockResolvedValue(mockSummary);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConnectorsController],
      providers: [
        {
          provide: ConnectorsService,
          useValue: {
            sync: syncMock,
          },
        },
      ],
    }).compile();

    controller = module.get<ConnectorsController>(ConnectorsController);
  });

  it('delegates to connectorsService.sync with merchant_id and source', async () => {
    const result = await controller.sync('shopify', {
      merchant_id: 'm-123',
    });

    expect(syncMock).toHaveBeenCalledWith('m-123', 'shopify');
    expect(result).toEqual(mockSummary);
  });

  it('propagates service exceptions when source or merchant is not found', async () => {
    syncMock.mockRejectedValueOnce(
      new NotFoundException('No store connector registered'),
    );

    await expect(
      controller.sync('invalid_source', { merchant_id: 'm-123' }),
    ).rejects.toThrow(NotFoundException);
  });
});
