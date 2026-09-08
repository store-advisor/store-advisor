import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthStubGuard } from '../auth/auth-stub.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SyncStoreResponseDto, syncStoreSchema } from './dto/sync-store.dto';
// `import type` is required here: isolatedModules with emitDecoratorMetadata
// rejects a value import used only as a type in a decorated signature.
import type { SyncStoreBody } from './dto/sync-store.dto';
import { ConnectorsService } from './connectors.service';

@ApiTags('connectors')
@ApiBearerAuth('bearer')
@Controller('connectors')
export class ConnectorsController {
  constructor(private readonly connectorsService: ConnectorsService) {}

  @Post(':source/sync')
  @UseGuards(AuthStubGuard)
  @ApiOperation({
    summary: 'Trigger ingestion sync for a store platform (e.g. shopify)',
    description:
      'Pulls products, variants, inventory levels, and orders from the store connector, ' +
      'normalizes them into the canonical schema, and detects stock-out transitions.',
  })
  @ApiParam({
    name: 'source',
    description: 'Store connector identifier (e.g. shopify, salla)',
    example: 'shopify',
  })
  @ApiResponse({
    status: 200,
    description: 'Sync completed successfully',
    type: SyncStoreResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - missing or invalid merchant_id',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing Bearer token',
  })
  @ApiResponse({
    status: 404,
    description:
      'Not Found - unknown connector source or merchant does not exist',
  })
  async sync(
    @Param('source') source: string,
    @Body(new ZodValidationPipe(syncStoreSchema)) body: SyncStoreBody,
  ): Promise<SyncStoreResponseDto> {
    return this.connectorsService.sync(body.merchant_id, source);
  }
}
