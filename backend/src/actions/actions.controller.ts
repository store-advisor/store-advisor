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
import { ActionResponseDto, approveActionSchema } from './dto/approve-action.dto';
// `import type` is required here: isolatedModules with emitDecoratorMetadata
// rejects a value import used only as a type in a decorated signature.
import type { ApproveActionBody } from './dto/approve-action.dto';
import { ActionsService } from './actions.service';

@ApiTags('actions')
@ApiBearerAuth('bearer')
@Controller('findings/:findingId/actions')
export class ActionsController {
  constructor(private readonly actions: ActionsService) {}

  @Post()
  @UseGuards(AuthStubGuard)
  @ApiOperation({
    summary: 'Approve the fix for a finding',
    description:
      'Pauses the campaign the finding names. The caller supplies an idempotency key; ' +
      'repeating a request with the same key returns the original result without acting again.',
  })
  @ApiParam({ name: 'findingId', description: 'Finding to act on' })
  @ApiResponse({ status: 201, type: ActionResponseDto })
  @ApiResponse({ status: 400, description: 'Missing key, or the finding names no campaign' })
  @ApiResponse({ status: 404, description: 'No such finding' })
  async approve(
    @Param('findingId') findingId: string,
    @Body(new ZodValidationPipe(approveActionSchema)) body: ApproveActionBody,
  ): Promise<ActionResponseDto> {
    return this.actions.approve(findingId, body.idempotency_key);
  }
}
