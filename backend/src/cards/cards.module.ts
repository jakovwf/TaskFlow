import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { BoardRoleGuard } from '../boards/guards/board-role.guard';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { CardBoardRoleGuard } from './guards/card-board-role.guard';

@Module({
  imports: [ActivityModule],
  controllers: [CardsController],
  providers: [CardsService, BoardRoleGuard, CardBoardRoleGuard],
})
export class CardsModule {}
