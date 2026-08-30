import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiExplainClient } from './ai-explain.client';
import { EXPLAINER } from './explain.interface';
import { ExplainService } from './explain.service';

/**
 * Stage 3.
 *
 * The explainer is bound through a token so the HTTP client can be replaced
 * by a queue producer — or by a stub, in tests — without ExplainService
 * changing. Note what this module does not do: it is not imported by
 * ChecksModule, and nothing in the check engine can reach it. That is
 * deliberate (see ExplainService).
 */
@Module({
  imports: [PrismaModule],
  providers: [
    AiExplainClient,
    { provide: EXPLAINER, useExisting: AiExplainClient },
    ExplainService,
  ],
  exports: [ExplainService],
})
export class ExplainModule {}
