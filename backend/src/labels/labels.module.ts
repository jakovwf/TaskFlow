import { Module } from '@nestjs/common';
import { BoardRoleGuard } from '../boards/guards/board-role.guard';
import { LabelBoardRoleGuard } from './guards/label-board-role.guard';
import { LabelsController } from './labels.controller';
import { LabelsService } from './labels.service';

@Module({
  controllers: [LabelsController],
  providers: [LabelsService, BoardRoleGuard, LabelBoardRoleGuard],
})
export class LabelsModule {}
