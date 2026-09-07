import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UploadsService {
  constructor(private readonly prisma: PrismaService) {}

  async createUpload(sessionId: string, file: Express.Multer.File) {
    try {
      const upload = await this.prisma.fileUpload.create({
        data: {
          sessionId,
          filename: file.originalname,
          sizeBytes: file.size,
          storageRef: file.path,
        },
      });
      return upload;
    } catch (error) {
      throw new InternalServerErrorException('Failed to record file upload');
    }
  }
}
