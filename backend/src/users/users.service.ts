import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

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

  async update(id: string, currentUserId: string, updateUserDto: UpdateUserDto) {
    if (id !== currentUserId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
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
  };
}
