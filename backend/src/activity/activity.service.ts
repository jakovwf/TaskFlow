import { Injectable } from '@nestjs/common';
import { ActivityType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface LogActivityData {
  type: ActivityType;
  boardId: string;
  userId: string;
  payload: object;
}

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(boardId: string) {
    return this.prisma.activity.findMany({
      where: { boardId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  logActivity(data: LogActivityData) {
    return this.prisma.activity.create({
      data: {
        type: data.type,
        boardId: data.boardId,
        userId: data.userId,
        payload: data.payload as Prisma.InputJsonObject,
      },
    });
  }
}
