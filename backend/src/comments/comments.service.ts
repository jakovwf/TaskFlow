import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityType, BoardMemberRole } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  findAll(cardId: string) {
    return this.prisma.comment.findMany({
      where: { cardId },
      include: this.commentInclude,
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(
    cardId: string,
    authorId: string,
    createCommentDto: CreateCommentDto,
  ) {
    const card = await this.getCardActivityContext(cardId);

    const comment = await this.prisma.comment.create({
      data: {
        cardId,
        authorId,
        content: createCommentDto.content,
      },
      include: this.commentInclude,
    });

    await this.activityService.logActivity({
      type: ActivityType.COMMENT_ADDED,
      boardId: card.list.boardId,
      userId: authorId,
      payload: {
        cardId,
        commentPreview: createCommentDto.content.slice(0, 50),
      },
    });

    return comment;
  }

  async update(
    id: string,
    userId: string,
    updateCommentDto: UpdateCommentDto,
  ) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('Only the comment author can edit this');
    }

    return this.prisma.comment.update({
      where: { id },
      data: { content: updateCommentDto.content },
      include: this.commentInclude,
    });
  }

  async remove(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: {
        authorId: true,
        card: {
          select: {
            list: {
              select: { boardId: true },
            },
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      const membership = await this.prisma.boardMember.findUnique({
        where: {
          boardId_userId: {
            boardId: comment.card.list.boardId,
            userId,
          },
        },
      });

      if (
        !membership ||
        (membership.role !== BoardMemberRole.OWNER &&
          membership.role !== BoardMemberRole.ADMIN)
      ) {
        throw new ForbiddenException(
          'Only the comment author or board admin can delete this',
        );
      }
    }

    const deletedComment = await this.prisma.comment.delete({
      where: { id },
      include: this.commentInclude,
    });

    await this.activityService.logActivity({
      type: ActivityType.COMMENT_DELETED,
      boardId: comment.card.list.boardId,
      userId,
      payload: { cardId: deletedComment.cardId },
    });

    return deletedComment;
  }

  private async getCardActivityContext(cardId: string) {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      select: {
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

  private readonly safeUserSelect = {
    id: true,
    email: true,
    displayName: true,
    avatarUrl: true,
    createdAt: true,
  };

  private readonly commentInclude = {
    author: {
      select: this.safeUserSelect,
    },
  };
}
