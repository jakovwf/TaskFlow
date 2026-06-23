import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BoardMemberRole } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../boards/decorators/roles.decorator';
import { BoardRoleGuard } from '../boards/guards/board-role.guard';
import { CreateListDto } from './dto/create-list.dto';
import { ReorderListsDto } from './dto/reorder-lists.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { ListBoardRoleGuard } from './guards/list-board-role.guard';
import { ListsService } from './lists.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
  };
}

@UseGuards(JwtAuthGuard)
@Controller()
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Roles(
    BoardMemberRole.OWNER,
    BoardMemberRole.ADMIN,
    BoardMemberRole.MEMBER,
  )
  @UseGuards(BoardRoleGuard)
  @Post('boards/:boardId/lists')
  create(
    @Param('boardId') boardId: string,
    @Req() request: AuthenticatedRequest,
    @Body() createListDto: CreateListDto,
  ) {
    return this.listsService.create(
      boardId,
      request.user.userId,
      createListDto,
    );
  }

  @Roles(
    BoardMemberRole.OWNER,
    BoardMemberRole.ADMIN,
    BoardMemberRole.MEMBER,
  )
  @UseGuards(ListBoardRoleGuard)
  @Patch('lists/:id')
  update(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() updateListDto: UpdateListDto,
  ) {
    return this.listsService.update(id, request.user.userId, updateListDto);
  }

  @Roles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN)
  @UseGuards(ListBoardRoleGuard)
  @Delete('lists/:id')
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.listsService.remove(id, request.user.userId);
  }

  @Roles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN)
  @UseGuards(BoardRoleGuard)
  @Patch('boards/:boardId/lists/reorder')
  reorder(
    @Param('boardId') boardId: string,
    @Body() reorderListsDto: ReorderListsDto,
  ) {
    return this.listsService.reorder(boardId, reorderListsDto);
  }
}
