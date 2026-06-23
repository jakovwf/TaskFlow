import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BoardMemberRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../boards/decorators/roles.decorator';
import { BoardRoleGuard } from '../boards/guards/board-role.guard';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { LabelBoardRoleGuard } from './guards/label-board-role.guard';
import { LabelsService } from './labels.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Roles(
    BoardMemberRole.OWNER,
    BoardMemberRole.ADMIN,
    BoardMemberRole.MEMBER,
  )
  @UseGuards(BoardRoleGuard)
  @Get('boards/:boardId/labels')
  findAll(@Param('boardId') boardId: string) {
    return this.labelsService.findAll(boardId);
  }

  @Roles(
    BoardMemberRole.OWNER,
    BoardMemberRole.ADMIN,
    BoardMemberRole.MEMBER,
  )
  @UseGuards(BoardRoleGuard)
  @Post('boards/:boardId/labels')
  create(
    @Param('boardId') boardId: string,
    @Body() createLabelDto: CreateLabelDto,
  ) {
    return this.labelsService.create(boardId, createLabelDto);
  }

  @Roles(
    BoardMemberRole.OWNER,
    BoardMemberRole.ADMIN,
    BoardMemberRole.MEMBER,
  )
  @UseGuards(LabelBoardRoleGuard)
  @Patch('labels/:id')
  update(@Param('id') id: string, @Body() updateLabelDto: UpdateLabelDto) {
    return this.labelsService.update(id, updateLabelDto);
  }

  @Roles(
    BoardMemberRole.OWNER,
    BoardMemberRole.ADMIN,
    BoardMemberRole.MEMBER,
  )
  @UseGuards(LabelBoardRoleGuard)
  @Delete('labels/:id')
  remove(@Param('id') id: string) {
    return this.labelsService.remove(id);
  }
}
