import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const UserRoles = (...roles: UserRole[]) => SetMetadata('user-roles', roles);
