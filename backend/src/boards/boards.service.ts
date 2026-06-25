import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityType, BoardMemberRole } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddBoardMemberDto } from './dto/add-board-member.dto';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardMemberDto } from './dto/update-board-member.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@Injectable()
export class BoardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  findAllForUser(userId: string) {
    return this.prisma.board.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: this.boardListInclude,
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(
    workspaceId: string,
    userId: string,
    createBoardDto: CreateBoardDto,
  ) {
    await this.requireWorkspaceMember(workspaceId, userId);

    return this.prisma.$transaction(async (tx) => {
      const board = await tx.board.create({
        data: {
          title: createBoardDto.title,
          description: createBoardDto.description,
          backgroundUrl: createBoardDto.backgroundUrl,
          workspaceId,
        },
      });

      await tx.boardMember.create({
        data: {
          boardId: board.id,
          userId,
          role: BoardMemberRole.OWNER,
        },
      });

      return tx.board.findUnique({
        where: { id: board.id },
        include: this.boardDetailInclude,
      });
    });
  }

  findOne(id: string) {
    return this.prisma.board.findUnique({
      where: { id },
      include: this.boardDetailInclude,
    });
  }

  async update(id: string, userId: string, updateBoardDto: UpdateBoardDto) {
    const board = await this.prisma.board.update({
      where: { id },
      data: updateBoardDto,
      include: this.boardDetailInclude,
    });

    await this.activityService.logActivity({
      type: ActivityType.BOARD_UPDATED,
      boardId: board.id,
      userId,
      payload: { boardTitle: board.title },
    });

    return board;
  }

  remove(id: string) {
    return this.prisma.board.delete({
      where: { id },
      include: this.boardDetailInclude,
    });
  }

  findMembers(boardId: string) {
    return this.prisma.boardMember.findMany({
      where: { boardId },
      include: {
        user: {
          select: this.safeUserSelect,
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  async addMember(boardId: string, addBoardMemberDto: AddBoardMemberDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: addBoardMemberDto.userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingMember = await this.prisma.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId,
          userId: addBoardMemberDto.userId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a board member');
    }

    return this.prisma.boardMember.create({
      data: {
        boardId,
        userId: addBoardMemberDto.userId,
        role: addBoardMemberDto.role,
      },
      include: {
        user: {
          select: this.safeUserSelect,
        },
      },
    });
  }

  async updateMember(
    boardId: string,
    userId: string,
    updateBoardMemberDto: UpdateBoardMemberDto,
  ) {
    const member = await this.requireBoardMember(boardId, userId);

    if (member.role === BoardMemberRole.OWNER) {
      throw new BadRequestException('Owner role cannot be changed');
    }

    if (updateBoardMemberDto.role === BoardMemberRole.OWNER) {
      throw new BadRequestException('Owner role cannot be assigned here');
    }

    return this.prisma.boardMember.update({
      where: {
        boardId_userId: {
          boardId,
          userId,
        },
      },
      data: {
        role: updateBoardMemberDto.role,
      },
      include: {
        user: {
          select: this.safeUserSelect,
        },
      },
    });
  }

  async removeMember(boardId: string, userId: string) {
    const member = await this.requireBoardMember(boardId, userId);

    if (member.role === BoardMemberRole.OWNER) {
      throw new BadRequestException('Owner cannot be removed from the board');
    }

    return this.prisma.boardMember.delete({
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
  }

  private async requireWorkspaceMember(workspaceId: string, userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    if (workspace.ownerId === userId) {
      return;
    }

    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }
  }

  private async requireBoardMember(boardId: string, userId: string) {
    const member = await this.prisma.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Board member not found');
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

  private readonly boardListInclude = {
    workspace: true,
    members: {
      include: {
        user: {
          select: this.safeUserSelect,
        },
      },
    },
  };

  private readonly boardDetailInclude = {
    workspace: true,
    members: {
      include: {
        user: {
          select: this.safeUserSelect,
        },
      },
    },
    lists: {
      include: {
        cards: true,
      },
      orderBy: {
        position: 'asc' as const,
      },
    },
    labels: true,
  };
}
