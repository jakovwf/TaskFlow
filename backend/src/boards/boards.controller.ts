import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BoardMemberRole } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { AddBoardMemberDto } from './dto/add-board-member.dto';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardMemberDto } from './dto/update-board-member.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { BoardRoleGuard } from './guards/board-role.guard';
import { BoardsService } from './boards.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
  };
}

@UseGuards(JwtAuthGuard)
@Controller()
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Get('boards')
  findAll(@Req() request: AuthenticatedRequest) {
    return this.boardsService.findAllForUser(request.user.userId);
  }

  @Post('workspaces/:workspaceId/boards')
  create(
    @Param('workspaceId') workspaceId: string,
    @Req() request: AuthenticatedRequest,
    @Body() createBoardDto: CreateBoardDto,
  ) {
    return this.boardsService.create(
      workspaceId,
      request.user.userId,
      createBoardDto,
    );
  }

  @Roles(
    BoardMemberRole.OWNER,
    BoardMemberRole.ADMIN,
    BoardMemberRole.MEMBER,
  )
  @UseGuards(BoardRoleGuard)
  @Get('boards/:id')
  findOne(@Param('id') id: string) {
    return this.boardsService.findOne(id);
  }

  @Roles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN)
  @UseGuards(BoardRoleGuard)
  @Patch('boards/:id')
  update(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() updateBoardDto: UpdateBoardDto,
  ) {
    return this.boardsService.update(id, request.user.userId, updateBoardDto);
  }

  @Roles(BoardMemberRole.OWNER)
  @UseGuards(BoardRoleGuard)
  @Delete('boards/:id')
  remove(@Param('id') id: string) {
    return this.boardsService.remove(id);
  }

  @Roles(
    BoardMemberRole.OWNER,
    BoardMemberRole.ADMIN,
    BoardMemberRole.MEMBER,
  )
  @UseGuards(BoardRoleGuard)
  @Get('boards/:id/members')
  findMembers(@Param('id') id: string) {
    return this.boardsService.findMembers(id);
  }

  @Roles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN)
  @UseGuards(BoardRoleGuard)
  @Post('boards/:id/members')
  addMember(
    @Param('id') id: string,
    @Body() addBoardMemberDto: AddBoardMemberDto,
  ) {
    return this.boardsService.addMember(id, addBoardMemberDto);
  }

  @Roles(BoardMemberRole.OWNER)
  @UseGuards(BoardRoleGuard)
  @Patch('boards/:id/members/:userId')
  updateMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() updateBoardMemberDto: UpdateBoardMemberDto,
  ) {
    return this.boardsService.updateMember(id, userId, updateBoardMemberDto);
  }

  @Roles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN)
  @UseGuards(BoardRoleGuard)
  @Delete('boards/:id/members/:userId')
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.boardsService.removeMember(id, userId);
  }
}
