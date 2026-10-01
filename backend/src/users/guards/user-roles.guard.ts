import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

@Injectable()
export class UserRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowedRoles = this.reflector.getAllAndOverride<UserRole[]>(
      'user-roles',
      [context.getHandler(), context.getClass()],
    );

    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    const userId = request.user?.userId;

    if (!userId) {
      throw new ForbiddenException('Access denied');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        userRole: true,
      },
    });

    if (!user || !allowedRoles.includes(user.userRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}