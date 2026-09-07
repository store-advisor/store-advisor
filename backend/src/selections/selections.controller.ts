import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthStubGuard } from '../auth/auth-stub.guard';
import { SelectionsService } from './selections.service';

@Controller('selections')
@UseGuards(AuthStubGuard)
export class SelectionsController {
  constructor(private readonly selectionsService: SelectionsService) {}

  @Post()
  async recordSelection(
    @Body('uploadId') uploadId: string,
    @Body('sessionId') sessionId: string,
    @Body('pipelineUsed') pipelineUsed: string,
  ) {
    if (!uploadId) throw new BadRequestException('uploadId is required');
    if (!sessionId) throw new BadRequestException('sessionId is required');
    if (!pipelineUsed) throw new BadRequestException('pipelineUsed is required');

    return this.selectionsService.createSelection(uploadId, sessionId, pipelineUsed);
  }
}
