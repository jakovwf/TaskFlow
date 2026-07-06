import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BoardMemberRole } from '@prisma/client';
import type { Request, Response } from 'express';
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

  @Roles(
    BoardMemberRole.OWNER,
    BoardMemberRole.ADMIN,
    BoardMemberRole.MEMBER,
  )
  @UseGuards(AttachmentBoardRoleGuard)
  @Get('attachments/:id/download')
  async download(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.attachmentsService.download(id);
    const asciiFilename = file.filename
      .replace(/[^\x20-\x7E]/g, '_')
      .replace(/["\\]/g, '_');

    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Length', file.buffer.length);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
    );
    response.setHeader('Cache-Control', 'private, no-store');

    return new StreamableFile(file.buffer);
  }

  @UseGuards(AttachmentBoardRoleGuard)
  @Delete('attachments/:id')
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.attachmentsService.remove(id, request.user.userId);
  }
}
