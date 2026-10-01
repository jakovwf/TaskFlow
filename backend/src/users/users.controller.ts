import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UsersService } from './users.service';
import { Roles } from '../boards/decorators/roles.decorator';
import { UserRolesGuard } from './guards/user-roles.guard';
import { UserRole } from '@prisma/client';
import { UserRoles } from './guards/user-roles.decorator';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
  };
}

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  search(@Query('q') query = '') {
    return this.usersService.search(query);
  }

  @Get()
  @UserRoles(UserRole.ADMIN)
  @UseGuards(UserRolesGuard)
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search = '',
  ) {
    return this.usersService.findAllForAdmin(
      this.paginationValue(page, 1),
      this.paginationValue(limit, 10, 100),
      search,
    );
  }

  @Get(':id/activities')
  @UserRoles(UserRole.ADMIN)
  @UseGuards(UserRolesGuard)
  findActivities(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.usersService.findActivitiesForAdmin(
      id,
      this.paginationValue(page, 1),
      this.paginationValue(limit, 10, 100),
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, request.user.userId, updateUserDto);
  }

  @Patch(':id/role')
  @UserRoles(UserRole.ADMIN)
  @UseGuards(UserRolesGuard)
  updateRole(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(
      id,
      request.user.userId,
      updateUserRoleDto,
    );
  }
  @Delete(':id')
  @UserRoles(UserRole.ADMIN)
  @UseGuards(UserRolesGuard)
  delete(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.usersService.delete(id);
  }

  private paginationValue(value: string, fallback: number, max = 100): number {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed)
      ? Math.min(Math.max(parsed, 1), max)
      : fallback;
  }
}
