import { Module } from '@nestjs/common';
import { BoardRoleGuard } from '../boards/guards/board-role.guard';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { CardBoardRoleGuard } from './guards/card-board-role.guard';

@Module({
  controllers: [CardsController],
  providers: [CardsService, BoardRoleGuard, CardBoardRoleGuard],
})
export class CardsModule {}
