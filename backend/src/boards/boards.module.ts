import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GatewayModule } from '../gateway/gateway.module';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';
import { BoardRoleGuard } from './guards/board-role.guard';

@Module({
  imports: [ActivityModule, NotificationsModule, GatewayModule],
  controllers: [BoardsController],
  providers: [BoardsService, BoardRoleGuard],
})
export class BoardsModule {}
