import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { $Enums } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../boards/decorators/roles.decorator';
import { BoardRoleGuard } from '../boards/guards/board-role.guard';
import { ActivityService } from './activity.service';

const DEFAULT_ACTIVITY_LIMIT = 20;
const MAX_ACTIVITY_LIMIT = 100;

@UseGuards(JwtAuthGuard)
@Controller()
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Roles(
    $Enums.BoardMemberRole.OWNER,
    $Enums.BoardMemberRole.ADMIN,
    $Enums.BoardMemberRole.MEMBER,
  )
  @UseGuards(BoardRoleGuard)
  @Get('boards/:boardId/activity')
  findAll(
    @Param('boardId') boardId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = Math.min(
      Math.max(parseInt(limit ?? '', 10) || DEFAULT_ACTIVITY_LIMIT, 1),
      MAX_ACTIVITY_LIMIT,
    );
    const parsedOffset = Math.max(parseInt(offset ?? '', 10) || 0, 0);

    return this.activityService.findAll(boardId, parsedLimit, parsedOffset);
  }
}
