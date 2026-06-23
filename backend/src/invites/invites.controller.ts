import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BoardMemberRole } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../boards/decorators/roles.decorator';
import { BoardRoleGuard } from '../boards/guards/board-role.guard';
import { CreateInviteDto } from './dto/create-invite.dto';
import { InviteBoardRoleGuard } from './guards/invite-board-role.guard';
import { InvitesService } from './invites.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
  };
}

@Controller()
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @UseGuards(JwtAuthGuard, BoardRoleGuard)
  @Roles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN)
  @Post('boards/:boardId/invites')
  create(
    @Param('boardId') boardId: string,
    @Req() request: AuthenticatedRequest,
    @Body() createInviteDto: CreateInviteDto,
  ) {
    return this.invitesService.create(
      boardId,
      request.user.userId,
      createInviteDto,
    );
  }

  @UseGuards(JwtAuthGuard, BoardRoleGuard)
  @Roles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN)
  @Get('boards/:boardId/invites')
  findAll(@Param('boardId') boardId: string) {
    return this.invitesService.findAll(boardId);
  }

  @UseGuards(JwtAuthGuard, InviteBoardRoleGuard)
  @Roles(BoardMemberRole.OWNER, BoardMemberRole.ADMIN)
  @Delete('invites/:id')
  revoke(@Param('id') id: string) {
    return this.invitesService.revoke(id);
  }

  @Get('invites/:token')
  preview(@Param('token') token: string) {
    return this.invitesService.preview(token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('invites/:token/accept')
  accept(@Param('token') token: string, @Req() request: AuthenticatedRequest) {
    return this.invitesService.accept(token, request.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('invites/:token/decline')
  decline(@Param('token') token: string, @Req() request: AuthenticatedRequest) {
    return this.invitesService.decline(token, request.user);
  }
}
