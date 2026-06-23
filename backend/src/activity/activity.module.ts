import { Module } from '@nestjs/common';
import { BoardRoleGuard } from '../boards/guards/board-role.guard';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';

@Module({
  controllers: [ActivityController],
  providers: [ActivityService, BoardRoleGuard],
  exports: [ActivityService],
})
export class ActivityModule {}
