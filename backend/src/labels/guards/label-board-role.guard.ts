import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BoardMemberRole } from '@prisma/client';
import { Request } from 'express';
import { BOARD_ROLES_KEY } from '../../boards/decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

@Injectable()
export class LabelBoardRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowedRoles =
      this.reflector.getAllAndOverride<BoardMemberRole[]>(BOARD_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.userId;
    const labelIdParam = request.params.labelId ?? request.params.id;
    const labelId = Array.isArray(labelIdParam)
      ? labelIdParam[0]
      : labelIdParam;

    if (!userId || !labelId) {
      throw new ForbiddenException('Label access denied');
    }

    const label = await this.prisma.label.findUnique({
      where: { id: labelId },
      select: { boardId: true },
    });

    if (!label) {
      throw new NotFoundException('Label not found');
    }

    const membership = await this.prisma.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId: label.boardId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this board');
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient board permissions');
    }

    return true;
  }
}
