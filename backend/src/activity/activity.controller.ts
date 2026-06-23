import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { BoardMemberRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../boards/decorators/roles.decorator';
import { BoardRoleGuard } from '../boards/guards/board-role.guard';
import { ActivityService } from './activity.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Roles(
    BoardMemberRole.OWNER,
    BoardMemberRole.ADMIN,
    BoardMemberRole.MEMBER,
  )
  @UseGuards(BoardRoleGuard)
  @Get('boards/:boardId/activity')
  findAll(@Param('boardId') boardId: string) {
    return this.activityService.findAll(boardId);
  }
}
