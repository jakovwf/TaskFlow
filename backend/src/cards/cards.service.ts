import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityType, NotificationType } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { AppGateway } from '../gateway/app.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddCardLabelDto } from './dto/add-card-label.dto';
import { AssignCardMemberDto } from './dto/assign-card-member.dto';
import { CreateCardDto } from './dto/create-card.dto';
import { ReorderCardsDto } from './dto/reorder-cards.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Injectable()
export class CardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly notificationsService: NotificationsService,
    private readonly appGateway: AppGateway,
  ) {}

  async create(listId: string, userId: string, createCardDto: CreateCardDto, socketId?: string) {
    const aggregate = await this.prisma.card.aggregate({
      where: { listId },
      _max: { position: true },
    });

    const card = await this.prisma.card.create({
      data: {
        title: createCardDto.title,
        description: createCardDto.description,
        dueDate: createCardDto.dueDate ? new Date(createCardDto.dueDate) : undefined,
        listId,
        position: (aggregate._max.position ?? 0) + 1,
      },
      include: this.cardInclude,
    });

    await this.activityService.logActivity({
      type: ActivityType.CARD_CREATED,
      boardId: card.list.boardId,
      userId,
      payload: { cardTitle: card.title },
    });

    this.appGateway.emitToBoardExcept(
      card.list.boardId,
      'card:created',
      { card, listId },
      socketId,
    );

    return card;
  }

  findOne(id: string) {
    return this.prisma.card.findUnique({
      where: { id },
      include: this.cardInclude,
    });
  }

  async update(id: string, userId: string, updateCardDto: UpdateCardDto, socketId?: string) {
    const card = await this.prisma.card.update({
      where: { id },
      data: {
        title: updateCardDto.title,
        description: updateCardDto.description,
        dueDate: updateCardDto.dueDate ? new Date(updateCardDto.dueDate) : undefined,
        isDone: updateCardDto.isDone,
        coverColor: updateCardDto.coverColor,
      },
      include: this.cardInclude,
    });

    await this.activityService.logActivity({
      type: ActivityType.CARD_UPDATED,
      boardId: card.list.boardId,
      userId,
      payload: { cardTitle: card.title },
    });

    this.appGateway.emitToBoardExcept(card.list.boardId, 'card:updated', { card }, socketId);

    return card;
  }

  async remove(id: string, userId: string, socketId?: string) {
    const existingCard = await this.prisma.card.findUnique({
      where: { id },
      select: {
        title: true,
        list: {
          select: { boardId: true },
        },
      },
    });

    if (!existingCard) {
      throw new NotFoundException('Card not found');
    }

    const deletedCard = await this.prisma.card.delete({
      where: { id },
      include: this.cardInclude,
    });

    await this.activityService.logActivity({
      type: ActivityType.CARD_DELETED,
      boardId: existingCard.list.boardId,
      userId,
      payload: { cardTitle: existingCard.title },
    });

    this.appGateway.emitToBoardExcept(
      existingCard.list.boardId,
      'card:deleted',
      { cardId: id, listId: deletedCard.listId },
      socketId,
    );

    return deletedCard;
  }

  async reorder(
    boardId: string,
    userId: string,
    reorderCardsDto: ReorderCardsDto,
    socketId?: string,
  ) {
    const existingCards = await this.prisma.card.findMany({
      where: {
        id: {
          in: reorderCardsDto.items.map((item) => item.id),
        },
        list: { boardId },
      },
      select: {
        id: true,
        title: true,
        listId: true,
        members: {
          select: { userId: true },
        },
      },
    });

    const existingCardsById = new Map(
      existingCards.map((card) => [card.id, card]),
    );

    const cards = await this.prisma.$transaction(async (tx) => {
      const targetLists = await tx.list.findMany({
        where: {
          boardId,
          id: {
            in: reorderCardsDto.items.map((item) => item.listId),
          },
        },
        select: { id: true },
      });

      const targetListIds = new Set(targetLists.map((list) => list.id));

      if (
        reorderCardsDto.items.some((item) => !targetListIds.has(item.listId))
      ) {
        throw new BadRequestException('All target lists must belong to the board');
      }

      const updates = await Promise.all(
        reorderCardsDto.items.map((item) =>
          tx.card.updateMany({
            where: {
              id: item.id,
              list: { boardId },
            },
            data: {
              listId: item.listId,
              position: item.position,
            },
          }),
        ),
      );

      if (updates.some((result) => result.count === 0)) {
        throw new NotFoundException('One or more cards were not found');
      }

      return tx.card.findMany({
        where: {
          list: { boardId },
        },
        include: this.cardInclude,
        orderBy: [{ listId: 'asc' }, { position: 'asc' }],
      });
    });

    await Promise.all(
      reorderCardsDto.items.map(async (item) => {
        const existingCard = existingCardsById.get(item.id);

        if (existingCard && existingCard.listId !== item.listId) {
          await this.activityService.logActivity({
            type: ActivityType.CARD_MOVED,
            boardId,
            userId,
            payload: {
              cardTitle: existingCard.title,
              fromListId: existingCard.listId,
              toListId: item.listId,
            },
          });

          await Promise.all(
            existingCard.members.map((member) =>
              this.notificationsService.createNotification({
                userId: member.userId,
                type: NotificationType.CARD_MOVED,
                message: `Kartica ${existingCard.title} je premeštena`,
                relatedCardId: existingCard.id,
                relatedBoardId: boardId,
              }),
            ),
          );
        }
      }),
    );

    this.appGateway.emitToBoardExcept(
      boardId,
      'cards:reordered',
      { items: reorderCardsDto.items },
      socketId,
    );

    return cards;
  }

  async assignMember(
    cardId: string,
    userId: string,
    assignCardMemberDto: AssignCardMemberDto,
  ) {
    const card = await this.getCardActivityContext(cardId);
    const assignedBoardMember = await this.requireBoardMember(
      card.list.boardId,
      assignCardMemberDto.userId,
    );
    const assigner = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    });

    const existingMember = await this.prisma.cardMember.findUnique({
      where: {
        cardId_userId: {
          cardId,
          userId: assignCardMemberDto.userId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already assigned to this card');
    }

    const cardMember = await this.prisma.cardMember.create({
      data: {
        cardId,
        userId: assignCardMemberDto.userId,
      },
      include: {
        user: {
          select: this.safeUserSelect,
        },
      },
    });

    await this.activityService.logActivity({
      type: ActivityType.CARD_ASSIGNED,
      boardId: card.list.boardId,
      userId,
      payload: {
        cardTitle: card.title,
        assignedUserId: assignCardMemberDto.userId,
        assignedUserEmail: assignedBoardMember.user.email,
        assignedUserDisplayName: assignedBoardMember.user.displayName,
      },
    });

    if (assignCardMemberDto.userId !== userId) {
      await this.notificationsService.createNotification({
        userId: assignCardMemberDto.userId,
        type: NotificationType.CARD_ASSIGNED,
        message: `${assigner?.displayName ?? 'Neko'} vam je dodelio zadatak: ${card.title}`,
        relatedBoardId: card.list.boardId,
        relatedCardId: cardId,
      });
    }

    this.appGateway.emitToBoard(card.list.boardId, 'card:member:added', {
      cardId,
      user: cardMember.user,
      boardId: card.list.boardId,
    });

    return cardMember;
  }

  async unassignMember(cardId: string, removedUserId: string, userId: string) {
    const card = await this.getCardActivityContext(cardId);
    const existingCardMember = await this.findCardMember(cardId, removedUserId);

    if (!existingCardMember) {
      return {
        cardId,
        userId: removedUserId,
        alreadyRemoved: true,
      };
    }

    const cardMember = await this.prisma.cardMember.delete({
      where: {
        cardId_userId: {
          cardId,
          userId: removedUserId,
        },
      },
      include: {
        user: {
          select: this.safeUserSelect,
        },
      },
    });

    await this.activityService.logActivity({
      type: ActivityType.CARD_UNASSIGNED,
      boardId: card.list.boardId,
      userId,
      payload: {
        cardTitle: card.title,
        removedUserId,
        removedUserEmail: cardMember.user.email,
        removedUserDisplayName: cardMember.user.displayName,
      },
    });

    this.appGateway.emitToBoard(card.list.boardId, 'card:member:removed', {
      cardId,
      userId: removedUserId,
      boardId: card.list.boardId,
    });

    return cardMember;
  }

  async addLabel(cardId: string, addCardLabelDto: AddCardLabelDto) {
    const card = await this.getCardActivityContext(cardId);
    await this.requireLabelExists(addCardLabelDto.labelId);

    const existingLabel = await this.prisma.cardLabel.findUnique({
      where: {
        cardId_labelId: {
          cardId,
          labelId: addCardLabelDto.labelId,
        },
      },
    });

    if (existingLabel) {
      throw new ConflictException('Label is already added to this card');
    }

    const cardLabel = await this.prisma.cardLabel.create({
      data: {
        cardId,
        labelId: addCardLabelDto.labelId,
      },
      include: {
        label: true,
      },
    });

    this.appGateway.emitToBoard(card.list.boardId, 'card:label:added', {
      cardId,
      label: cardLabel,
      boardId: card.list.boardId,
    });

    return cardLabel;
  }

  async removeLabel(cardId: string, labelId: string) {
    const cardLabelContext = await this.requireCardLabel(cardId, labelId);

    const cardLabel = await this.prisma.cardLabel.delete({
      where: {
        cardId_labelId: {
          cardId,
          labelId,
        },
      },
      include: {
        label: true,
      },
    });

    const boardId = cardLabelContext.card.list.boardId;
    this.appGateway.emitToBoard(boardId, 'card:label:removed', {
      cardId,
      labelId,
      boardId,
    });

    return cardLabel;
  }

  private async requireLabelExists(labelId: string) {
    const label = await this.prisma.label.findUnique({
      where: { id: labelId },
      select: { id: true },
    });

    if (!label) {
      throw new NotFoundException('Label not found');
    }
  }

  private findCardMember(cardId: string, userId: string) {
    return this.prisma.cardMember.findUnique({
      where: {
        cardId_userId: {
          cardId,
          userId,
        },
      },
      include: {
        user: {
          select: this.safeUserSelect,
        },
      },
    });
  }

  private async requireCardLabel(cardId: string, labelId: string) {
    const cardLabel = await this.prisma.cardLabel.findUnique({
      where: {
        cardId_labelId: {
          cardId,
          labelId,
        },
      },
      include: {
        card: {
          select: {
            list: {
              select: { boardId: true },
            },
          },
        },
      },
    });

    if (!cardLabel) {
      throw new NotFoundException('Card label not found');
    }

    return cardLabel;
  }

  private async getCardActivityContext(cardId: string) {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      select: {
        title: true,
        list: {
          select: { boardId: true },
        },
      },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    return card;
  }

  private async requireBoardMember(boardId: string, userId: string) {
    const member = await this.prisma.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId,
          userId,
        },
      },
      include: {
        user: {
          select: this.safeUserSelect,
        },
      },
    });

    if (!member) {
      throw new BadRequestException('Assigned user must be a board member');
    }

    return member;
  }

  private readonly safeUserSelect = {
    id: true,
    email: true,
    displayName: true,
    avatarUrl: true,
    createdAt: true,
  };

  private readonly cardInclude = {
    list: {
      select: {
        id: true,
        title: true,
        boardId: true,
      },
    },
    members: {
      include: {
        user: {
          select: this.safeUserSelect,
        },
      },
    },
    labels: {
      include: {
        label: true,
      },
    },
    attachments: {
      include: {
        uploadedBy: {
          select: this.safeUserSelect,
        },
      },
      orderBy: {
        createdAt: 'asc' as const,
      },
    },
  };
}
