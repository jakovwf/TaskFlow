import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceMemberRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddWorkspaceMemberDto } from './dto/add-workspace-member.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForUser(userId: string) {
    return this.prisma.workspace.findMany({
      where: {
        OR: [
          { ownerId: userId },
          {
            // A non-owner workspace membership only counts if the user can
            // still see at least one board there. This guards against stale
            // WorkspaceMember rows (e.g. leftover from board invites) that
            // would otherwise surface as an empty "ghost" workspace.
            members: { some: { userId } },
            boards: { some: { members: { some: { userId } } } },
          },
        ],
      },
      include: this.workspaceInclude,
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(userId: string, createWorkspaceDto: CreateWorkspaceDto) {
    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: createWorkspaceDto.name,
          ownerId: userId,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId,
          role: WorkspaceMemberRole.OWNER,
        },
      });

      return tx.workspace.findUnique({
        where: { id: workspace.id },
        include: this.workspaceInclude,
      });
    });
  }

  async findOne(id: string, userId: string) {
    await this.requireMember(id, userId);

    return this.prisma.workspace.findUnique({
      where: { id },
      include: this.workspaceInclude,
    });
  }

  async update(
    id: string,
    userId: string,
    updateWorkspaceDto: UpdateWorkspaceDto,
  ) {
    await this.requireOwner(id, userId);

    return this.prisma.workspace.update({
      where: { id },
      data: updateWorkspaceDto,
      include: this.workspaceInclude,
    });
  }

  async remove(id: string, userId: string) {
    await this.requireOwner(id, userId);

    return this.prisma.workspace.delete({
      where: { id },
      include: this.workspaceInclude,
    });
  }

  async addMember(
    workspaceId: string,
    ownerId: string,
    addWorkspaceMemberDto: AddWorkspaceMemberDto,
  ) {
    await this.requireOwner(workspaceId, ownerId);

    const user = await this.prisma.user.findUnique({
      where: { id: addWorkspaceMemberDto.userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: addWorkspaceMemberDto.userId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a workspace member');
    }

    return this.prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: addWorkspaceMemberDto.userId,
        role: addWorkspaceMemberDto.role,
      },
      include: {
        user: {
          select: this.safeUserSelect,
        },
        workspace: true,
      },
    });
  }

  async removeMember(workspaceId: string, ownerId: string, userId: string) {
    await this.requireOwner(workspaceId, ownerId);

    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Workspace member not found');
    }

    return this.prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      include: {
        user: {
          select: this.safeUserSelect,
        },
        workspace: true,
      },
    });
  }

  private async requireMember(workspaceId: string, userId: string) {
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

    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this workspace');
    }
  }

  private async requireOwner(workspaceId: string, userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    if (workspace.ownerId !== userId) {
      throw new ForbiddenException('Only the workspace owner can do this');
    }
  }

  private readonly safeUserSelect = {
    id: true,
    email: true,
    displayName: true,
    avatarUrl: true,
    createdAt: true,
  };

  private readonly workspaceInclude = {
    owner: {
      select: this.safeUserSelect,
    },
    members: {
      include: {
        user: {
          select: this.safeUserSelect,
        },
      },
    },
  };
}
