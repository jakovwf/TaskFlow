import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppGateway } from '../gateway/app.gateway';
import { PushService } from '../push/push.service';

interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  message: string;
  relatedBoardId?: string;
  relatedCardId?: string;
  relatedInviteId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
    private readonly appGateway: AppGateway,
  ) {}

  findAll(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      include: this.notificationInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
      include: this.notificationInclude,
    });
  }

  markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  async createNotification(data: CreateNotificationData) {
    const notification = await this.prisma.notification.create({
      data,
      include: this.notificationInclude,
    });

    this.appGateway.emitToUser(data.userId, 'notification:new', notification);

    await this.pushService.sendPushNotification(data.userId, {
      title: this.getPushTitle(data.type),
      body: data.message,
      url: data.relatedBoardId ? `/b/${data.relatedBoardId}` : '/notifications',
    });

    return notification;
  }

  private getPushTitle(type: NotificationType): string {
    switch (type) {
      case NotificationType.BOARD_INVITE:
        return 'Novi poziv na board';
      case NotificationType.CARD_ASSIGNED:
        return 'Dodeljen vam je zadatak';
      default:
        return 'TaskFlow obaveštenje';
    }
  }

  private readonly notificationInclude = {
    relatedCard: {
      select: {
        id: true,
        title: true,
      },
    },
    relatedInvite: {
      select: {
        id: true,
        token: true,
      },
    },
  };
}
