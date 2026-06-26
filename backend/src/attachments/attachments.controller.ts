import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BoardMemberRole } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../boards/decorators/roles.decorator';
import { AttachmentBoardRoleGuard } from './guards/attachment-board-role.guard';
import { AttachmentsService } from './attachments.service';

interface UploadedAttachmentFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
  };
}

@UseGuards(JwtAuthGuard)
@Controller()
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Roles(
    BoardMemberRole.OWNER,
    BoardMemberRole.ADMIN,
    BoardMemberRole.MEMBER,
  )
  @UseGuards(AttachmentBoardRoleGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @Post('cards/:cardId/attachments')
  upload(
    @Param('cardId') cardId: string,
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file: UploadedAttachmentFile,
  ) {
    return this.attachmentsService.upload(
      cardId,
      request.user.userId,
      file,
    );
  }

  @Roles(
    BoardMemberRole.OWNER,
    BoardMemberRole.ADMIN,
    BoardMemberRole.MEMBER,
  )
  @UseGuards(AttachmentBoardRoleGuard)
  @Get('cards/:cardId/attachments')
  findAll(@Param('cardId') cardId: string) {
    return this.attachmentsService.findAll(cardId);
  }

  @UseGuards(AttachmentBoardRoleGuard)
  @Delete('attachments/:id')
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.attachmentsService.remove(id, request.user.userId);
  }
}
