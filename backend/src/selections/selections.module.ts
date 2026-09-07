import { Module } from '@nestjs/common';
import { SelectionsController } from './selections.controller';
import { SelectionsService } from './selections.service';

@Module({
  controllers: [SelectionsController],
  providers: [SelectionsService],
})
export class SelectionsModule {}
