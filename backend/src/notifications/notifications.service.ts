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

  async findAll(userId: string, page: number, limit: number) {
    const where = { userId };
    const [items, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        include: this.notificationInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      unreadCount,
      hasMore: page * limit < total,
    };
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.notification.updateMany({
        where: { id, userId },
        data: { isRead: true },
      });

      if (result.count === 0) {
        throw new NotFoundException('Notification not found');
      }

      return transaction.notification.findFirst({
        where: { id, userId },
        include: this.notificationInclude,
      });
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
      url: this.getPushUrl(data.type, notification.relatedInvite?.token, data.relatedBoardId),
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
        return 'Obaveštenje';
    }
  }

  private getPushUrl(
    type: NotificationType,
    relatedInviteToken: string | undefined,
    relatedBoardId: string | undefined,
  ): string {
    // Dok je pozivnica pending, korisnik nema pristup boardu - klik mora da
    // vodi na invite ekran (prihvati/odbij), ne direktno na board.
    if (type === NotificationType.BOARD_INVITE && relatedInviteToken) {
      return `/invite/${relatedInviteToken}`;
    }

    return relatedBoardId ? `/b/${relatedBoardId}` : '/notifications';
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
        status: true,
      },
    },
  };
}
