import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddCardLabelDto } from './dto/add-card-label.dto';
import { AssignCardMemberDto } from './dto/assign-card-member.dto';
import { CreateCardDto } from './dto/create-card.dto';
import { ReorderCardsDto } from './dto/reorder-cards.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(listId: string, createCardDto: CreateCardDto) {
    const aggregate = await this.prisma.card.aggregate({
      where: { listId },
      _max: { position: true },
    });

    return this.prisma.card.create({
      data: {
        title: createCardDto.title,
        description: createCardDto.description,
        dueDate: createCardDto.dueDate ? new Date(createCardDto.dueDate) : undefined,
        listId,
        position: (aggregate._max.position ?? 0) + 1,
      },
      include: this.cardInclude,
    });
  }

  findOne(id: string) {
    return this.prisma.card.findUnique({
      where: { id },
      include: this.cardInclude,
    });
  }

  update(id: string, updateCardDto: UpdateCardDto) {
    return this.prisma.card.update({
      where: { id },
      data: {
        title: updateCardDto.title,
        description: updateCardDto.description,
        dueDate: updateCardDto.dueDate ? new Date(updateCardDto.dueDate) : undefined,
      },
      include: this.cardInclude,
    });
  }

  remove(id: string) {
    return this.prisma.card.delete({
      where: { id },
      include: this.cardInclude,
    });
  }

  async reorder(boardId: string, reorderCardsDto: ReorderCardsDto) {
    return this.prisma.$transaction(async (tx) => {
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
  }

  async assignMember(cardId: string, assignCardMemberDto: AssignCardMemberDto) {
    await this.requireUserExists(assignCardMemberDto.userId);

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

    return this.prisma.cardMember.create({
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
  }

  async unassignMember(cardId: string, userId: string) {
    await this.requireCardMember(cardId, userId);

    return this.prisma.cardMember.delete({
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

  async addLabel(cardId: string, addCardLabelDto: AddCardLabelDto) {
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

    return this.prisma.cardLabel.create({
      data: {
        cardId,
        labelId: addCardLabelDto.labelId,
      },
      include: {
        label: true,
      },
    });
  }

  async removeLabel(cardId: string, labelId: string) {
    await this.requireCardLabel(cardId, labelId);

    return this.prisma.cardLabel.delete({
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
  }

  private async requireUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
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

  private async requireCardMember(cardId: string, userId: string) {
    const member = await this.prisma.cardMember.findUnique({
      where: {
        cardId_userId: {
          cardId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Card member not found');
    }
  }

  private async requireCardLabel(cardId: string, labelId: string) {
    const cardLabel = await this.prisma.cardLabel.findUnique({
      where: {
        cardId_labelId: {
          cardId,
          labelId,
        },
      },
    });

    if (!cardLabel) {
      throw new NotFoundException('Card label not found');
    }
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
  };
}
