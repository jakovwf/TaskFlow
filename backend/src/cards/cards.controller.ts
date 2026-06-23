import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BoardMemberRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../boards/decorators/roles.decorator';
import { BoardRoleGuard } from '../boards/guards/board-role.guard';
import { AddCardLabelDto } from './dto/add-card-label.dto';
import { AssignCardMemberDto } from './dto/assign-card-member.dto';
import { CreateCardDto } from './dto/create-card.dto';
import { ReorderCardsDto } from './dto/reorder-cards.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { CardBoardRoleGuard } from './guards/card-board-role.guard';
import { CardsService } from './cards.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Roles(
    BoardMemberRole.OWNER,
    BoardMemberRole.ADMIN,
    BoardMemberRole.MEMBER,
  )
  @UseGuards(CardBoardRoleGuard)
  @Post('lists/:listId/cards')
  create(
    @Param('listId') listId: string,
    @Body() createCardDto: CreateCardDto,
  ) {
    return this.cardsService.create(listId, createCardDto);
  }

  @Roles(
    BoardMemberRole.OWNER,
    BoardMemberRole.ADMIN,
    BoardMemberRole.MEMBER,
  )
  @UseGuards(CardBoardRoleGuard)
  @Get('cards/:id')
  findOne(@Param('id') id: string) {
    return this.cardsService.findOne(id);
  }

  @Roles(
    BoardMemberRole.OWNER,
    BoardMemberRole.ADMIN,
    BoardMemberRole.MEMBER,
  )
  @UseGuards(CardBoardRoleGuard)
  @Patch('cards/:id')
  update(@Param('id') id: string, @Body() updateCardDto: UpdateCardDto) {
    return this.cardsService.update(id, updateCardDto);
  }

  @Roles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN)
  @UseGuards(CardBoardRoleGuard)
  @Delete('cards/:id')
  remove(@Param('id') id: string) {
    return this.cardsService.remove(id);
  }

  @Roles(
    BoardMemberRole.OWNER,
    BoardMemberRole.ADMIN,
    BoardMemberRole.MEMBER,
  )
  @UseGuards(BoardRoleGuard)
  @Patch('boards/:boardId/cards/reorder')
  reorder(
    @Param('boardId') boardId: string,
    @Body() reorderCardsDto: ReorderCardsDto,
  ) {
    return this.cardsService.reorder(boardId, reorderCardsDto);
  }

  @Roles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN)
  @UseGuards(CardBoardRoleGuard)
  @Post('cards/:id/members')
  assignMember(
    @Param('id') id: string,
    @Body() assignCardMemberDto: AssignCardMemberDto,
  ) {
    return this.cardsService.assignMember(id, assignCardMemberDto);
  }

  @Roles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN)
  @UseGuards(CardBoardRoleGuard)
  @Delete('cards/:id/members/:userId')
  unassignMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.cardsService.unassignMember(id, userId);
  }

  @Roles(
    BoardMemberRole.OWNER,
    BoardMemberRole.ADMIN,
    BoardMemberRole.MEMBER,
  )
  @UseGuards(CardBoardRoleGuard)
  @Post('cards/:id/labels')
  addLabel(@Param('id') id: string, @Body() addCardLabelDto: AddCardLabelDto) {
    return this.cardsService.addLabel(id, addCardLabelDto);
  }

  @Roles(
    BoardMemberRole.OWNER,
    BoardMemberRole.ADMIN,
    BoardMemberRole.MEMBER,
  )
  @UseGuards(CardBoardRoleGuard)
  @Delete('cards/:id/labels/:labelId')
  removeLabel(@Param('id') id: string, @Param('labelId') labelId: string) {
    return this.cardsService.removeLabel(id, labelId);
  }
}
