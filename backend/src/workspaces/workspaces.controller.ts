import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { UserRoles } from '../users/guards/user-roles.decorator';
import { UserRolesGuard } from '../users/guards/user-roles.guard';
import { AddWorkspaceMemberDto } from './dto/add-workspace-member.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspacesService } from './workspaces.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
  };
}

@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.workspacesService.findAllForUser(request.user.userId);
  }

  @Get('admin')
  @UserRoles(UserRole.ADMIN)
  @UseGuards(UserRolesGuard)
  findAllForAdmin(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search = '',
  ) {
    return this.workspacesService.findAllForAdmin(
      this.paginationValue(page, 1),
      this.paginationValue(limit, 10, 100),
      search,
    );
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() createWorkspaceDto: CreateWorkspaceDto,
  ) {
    return this.workspacesService.create(
      request.user.userId,
      createWorkspaceDto,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.workspacesService.findOne(id, request.user.userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(
      id,
      request.user.userId,
      updateWorkspaceDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.workspacesService.remove(id, request.user.userId);
  }

  @Delete('admin/:id')
  @UserRoles(UserRole.ADMIN)
  @UseGuards(UserRolesGuard)
  removeForAdmin(@Param('id') id: string) {
    return this.workspacesService.removeForAdmin(id);
  }

  @Post(':id/members')
  addMember(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() addWorkspaceMemberDto: AddWorkspaceMemberDto,
  ) {
    return this.workspacesService.addMember(
      id,
      request.user.userId,
      addWorkspaceMemberDto,
    );
  }

  @Delete(':id/members/:userId')
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.workspacesService.removeMember(id, request.user.userId, userId);
  }

  private paginationValue(value: string, fallback: number, max = 100): number {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed)
      ? Math.min(Math.max(parsed, 1), max)
      : fallback;
  }
}
