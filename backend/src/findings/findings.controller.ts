import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthStubGuard } from '../auth/auth-stub.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  findFindingsQuerySchema,
  type FindFindingsQuery,
} from './dto/find-findings-query.dto';
import { FindingResponseDto } from './dto/finding-response.dto';
import { FindingsService } from './findings.service';

@ApiTags('findings')
@ApiBearerAuth('bearer')
@Controller('findings')
export class FindingsController {
  constructor(private readonly findingsService: FindingsService) {}

  @Get()
  @UseGuards(AuthStubGuard)
  @ApiOperation({
    summary: 'List findings for a merchant',
    description:
      'Returns all findings for a given merchant ordered by creation date descending. Requires Bearer authentication.',
  })
  @ApiQuery({
    name: 'merchant_id',
    type: String,
    required: true,
    description: 'Merchant ID to retrieve findings for',
    example: 'merchant_123',
  })
  @ApiResponse({
    status: 200,
    description: 'List of findings for the merchant (may be empty)',
    type: [FindingResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - missing or invalid merchant_id query parameter',
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized - missing or invalid Authorization Bearer header',
  })
  async getFindings(
    @Query(new ZodValidationPipe(findFindingsQuerySchema))
    query: FindFindingsQuery,
  ): Promise<FindingResponseDto[]> {
    return this.findingsService.findByMerchantId(query.merchant_id);
  }
}
