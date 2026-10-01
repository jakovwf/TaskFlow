import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.safeUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
  async delete(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.delete({
      where: { id },
    });
  }

  async update(
    id: string,
    currentUserId: string,
    updateUserDto: UpdateUserDto,
  ) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: { userRole: true },
    });

    if (!currentUser) {
      throw new ForbiddenException('You can only update your own profile');
    }

    if (id !== currentUserId && currentUser.userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own profile');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...updateUserDto,
        email: updateUserDto.email?.trim().toLowerCase(),
      },
      select: this.safeUserSelect,
    });
  }

  async findAllForAdmin(page: number, limit: number, search: string) {
    const normalizedSearch = search.trim();
    const where = normalizedSearch
      ? {
          OR: [
            {
              email: {
                contains: normalizedSearch,
                mode: 'insensitive' as const,
              },
            },
            {
              displayName: {
                contains: normalizedSearch,
                mode: 'insensitive' as const,
              },
            },
          ],
        }
      : undefined;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: this.safeUserSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findActivitiesForAdmin(userId: string, page: number, limit: number) {
    await this.findOne(userId);
    const where = { userId };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.activity.findMany({
        where,
        select: {
          id: true,
          type: true,
          payload: true,
          boardId: true,
          createdAt: true,
          board: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.activity.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateRole(id: string, currentUserId: string, dto: UpdateUserRoleDto) {
    const target = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, userRole: true },
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    if (
      id === currentUserId &&
      target.userRole === UserRole.ADMIN &&
      dto.userRole === UserRole.USER
    ) {
      const adminCount = await this.prisma.user.count({
        where: { userRole: UserRole.ADMIN },
      });

      if (adminCount === 1) {
        throw new BadRequestException(
          'The last admin cannot remove their admin role',
        );
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: { userRole: dto.userRole },
      select: this.safeUserSelect,
    });
  }

  search(query: string) {
    const normalizedQuery = query.trim();

    return this.prisma.user.findMany({
      where: normalizedQuery
        ? {
            OR: [
              {
                email: {
                  contains: normalizedQuery,
                  mode: 'insensitive',
                },
              },
              {
                displayName: {
                  contains: normalizedQuery,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : undefined,
      select: this.safeUserSelect,
      take: 10,
      orderBy: { displayName: 'asc' },
    });
  }

  private readonly safeUserSelect = {
    id: true,
    email: true,
    displayName: true,
    avatarUrl: true,
    createdAt: true,
    userRole: true,
  };
}
