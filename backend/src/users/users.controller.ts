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
  @Delete(':id')
  @UserRoles(UserRole.ADMIN)
  @UseGuards(UserRolesGuard)
  delete(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.usersService.delete(id);
  }
}
