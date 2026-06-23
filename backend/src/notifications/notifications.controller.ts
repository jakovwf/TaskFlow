import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
  };
}

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.findAll(request.user.userId);
  }

  @Patch('read-all')
  markAllAsRead(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.markAllAsRead(request.user.userId);
  }

  @Patch(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const notification = await this.notificationsService.findOne(id);

    if (notification.userId !== request.user.userId) {
      throw new ForbiddenException('Notification does not belong to you');
    }

    return this.notificationsService.markAsRead(id);
  }
}
