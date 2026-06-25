import { Injectable, NotFoundException } from '@nestjs/common';
import { ActivityType } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListDto } from './dto/create-list.dto';
import { ReorderListsDto } from './dto/reorder-lists.dto';
import { UpdateListDto } from './dto/update-list.dto';

@Injectable()
export class ListsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  async create(boardId: string, userId: string, createListDto: CreateListDto) {
    const aggregate = await this.prisma.list.aggregate({
      where: { boardId },
      _max: { position: true },
    });

    const list = await this.prisma.list.create({
      data: {
        title: createListDto.title,
        boardId,
        position: (aggregate._max.position ?? 0) + 1,
      },
      include: this.listInclude,
    });

    await this.activityService.logActivity({
      type: ActivityType.LIST_CREATED,
      boardId,
      userId,
      payload: { listTitle: list.title },
    });

    return list;
  }

  async update(id: string, userId: string, updateListDto: UpdateListDto) {
    const list = await this.prisma.list.update({
      where: { id },
      data: {
        title: updateListDto.title,
      },
      include: this.listInclude,
    });

    await this.activityService.logActivity({
      type: ActivityType.LIST_RENAMED,
      boardId: list.boardId,
      userId,
      payload: { listTitle: list.title },
    });

    return list;
  }

  async remove(id: string, userId: string) {
    const existingList = await this.prisma.list.findUnique({
      where: { id },
      select: {
        title: true,
        boardId: true,
      },
    });

    if (!existingList) {
      throw new NotFoundException('List not found');
    }

    const deletedList = await this.prisma.list.delete({
      where: { id },
      include: this.listInclude,
    });

    await this.activityService.logActivity({
      type: ActivityType.LIST_DELETED,
      boardId: existingList.boardId,
      userId,
      payload: { listTitle: existingList.title },
    });

    return deletedList;
  }

  async reorder(boardId: string, reorderListsDto: ReorderListsDto) {
    return this.prisma.$transaction(async (tx) => {
      const updates = await Promise.all(
        reorderListsDto.items.map((item) =>
          tx.list.updateMany({
            where: {
              id: item.id,
              boardId,
            },
            data: {
              position: item.position,
            },
          }),
        ),
      );

      if (updates.some((result) => result.count === 0)) {
        throw new NotFoundException('One or more lists were not found');
      }

      return tx.list.findMany({
        where: { boardId },
        include: this.listInclude,
        orderBy: { position: 'asc' },
      });
    });
  }

  private readonly listInclude = {
    cards: {
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
                avatarUrl: true,
                createdAt: true,
              },
            },
          },
        },
      },
    },
  };
}
