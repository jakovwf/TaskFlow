import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';
import { BoardRoleGuard } from './guards/board-role.guard';

@Module({
  imports: [ActivityModule],
  controllers: [BoardsController],
  providers: [BoardsService, BoardRoleGuard],
})
export class BoardsModule {}
