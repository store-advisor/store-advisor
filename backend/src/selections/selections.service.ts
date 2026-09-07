import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SelectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSelection(uploadId: string, sessionId: string, pipelineUsed: string) {
    try {
      const selection = await this.prisma.fileSelection.create({
        data: {
          uploadId,
          sessionId,
          pipelineUsed,
        },
      });
      return selection;
    } catch (error) {
      throw new InternalServerErrorException('Failed to record file selection');
    }
  }
}
