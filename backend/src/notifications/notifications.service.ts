import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

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

  createNotification(data: CreateNotificationData) {
    return this.prisma.notification.create({
      data,
      include: this.notificationInclude,
    });
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
