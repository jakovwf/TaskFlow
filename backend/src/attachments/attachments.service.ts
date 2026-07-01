import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BoardMemberRole } from '@prisma/client';
import { UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import { cloudinary } from '../cloudinary/cloudinary.config';
import { AppGateway } from '../gateway/app.gateway';
import { PrismaService } from '../prisma/prisma.service';

interface UploadedAttachmentFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

type CloudinaryResourceType = 'image' | 'raw';

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf']);

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appGateway: AppGateway,
  ) {}

  async upload(
    cardId: string,
    uploadedById: string,
    file: UploadedAttachmentFile,
  ) {
    const boardId = await this.getCardBoardId(cardId);

    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!this.isAllowedAttachment(file)) {
      throw new BadRequestException('File type is not allowed');
    }

    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new BadRequestException('File is too large');
    }

    const resourceType = this.getCloudinaryResourceType(file);
    const uploadedFile = await this.uploadToCloudinary(file, resourceType);

    if (resourceType === 'raw' && !uploadedFile.secure_url.includes('/raw/upload/')) {
      await this.deleteFromCloudinary(uploadedFile.public_id);
      throw new BadRequestException('PDF upload did not use Cloudinary raw resource type');
    }

    const attachment = await this.prisma.attachment.create({
      data: {
        filename: file.originalname,
        url: uploadedFile.secure_url,
        publicId: uploadedFile.public_id,
        cardId,
        uploadedById,
      },
      include: this.attachmentInclude,
    });

    const attachmentWithMetadata = this.withAttachmentMetadata(attachment, {
      mimeType: file.mimetype,
      resourceType: uploadedFile.resource_type,
      format: uploadedFile.format,
    });

    this.appGateway.emitToBoard(boardId, 'attachment:added', {
      attachment: attachmentWithMetadata,
      cardId,
      boardId,
    });

    return attachmentWithMetadata;
  }

  async findAll(cardId: string) {
    const attachments = await this.prisma.attachment.findMany({
      where: { cardId },
      include: this.attachmentInclude,
      orderBy: { createdAt: 'asc' },
    });

    return attachments.map((attachment) =>
      this.withAttachmentMetadata(attachment),
    );
  }

  async remove(id: string, currentUserId: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
      select: {
        uploadedById: true,
        publicId: true,
        card: {
          select: {
            list: {
              select: { boardId: true },
            },
          },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    if (attachment.uploadedById !== currentUserId) {
      const membership = await this.prisma.boardMember.findUnique({
        where: {
          boardId_userId: {
            boardId: attachment.card.list.boardId,
            userId: currentUserId,
          },
        },
      });

      if (
        !membership ||
        (membership.role !== BoardMemberRole.OWNER &&
          membership.role !== BoardMemberRole.ADMIN)
      ) {
        throw new ForbiddenException(
          'Only the uploader or board admin can delete this attachment',
        );
      }
    }

    if (attachment.publicId) {
      await this.deleteFromCloudinary(attachment.publicId);
    }

    const deletedAttachment = await this.prisma.attachment.delete({
      where: { id },
      include: this.attachmentInclude,
    });

    const attachmentWithMetadata = this.withAttachmentMetadata(deletedAttachment);
    const boardId = attachment.card.list.boardId;

    this.appGateway.emitToBoard(boardId, 'attachment:deleted', {
      attachmentId: deletedAttachment.id,
      cardId: deletedAttachment.cardId,
      boardId,
    });

    return attachmentWithMetadata;
  }

  private async getCardBoardId(cardId: string): Promise<string> {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      select: { list: { select: { boardId: true } } },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    return card.list.boardId;
  }

  private uploadToCloudinary(
    file: UploadedAttachmentFile,
    resourceType: CloudinaryResourceType,
  ) {
    return new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: 'taskflow/attachments',
          use_filename: true,
          unique_filename: true,
          format: file.originalname.split('.').pop()?.toLowerCase() ?? undefined,
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary upload failed'));
            return;
          }

          resolve(result);
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  private getCloudinaryResourceType(
    file: UploadedAttachmentFile,
  ): CloudinaryResourceType {
    if (this.isPdfAttachment(file)) {
      return 'raw';
    }

    return 'image';
  }

  private isAllowedAttachment(file: UploadedAttachmentFile): boolean {
    if (ALLOWED_ATTACHMENT_MIME_TYPES.has(file.mimetype)) {
      return true;
    }

    return ALLOWED_ATTACHMENT_EXTENSIONS.has(this.getFileExtension(file));
  }

  private isPdfAttachment(file: UploadedAttachmentFile): boolean {
    return file.mimetype === 'application/pdf' || this.getFileExtension(file) === 'pdf';
  }

  private getFileExtension(file: UploadedAttachmentFile): string {
    const normalizedFilename = file.originalname.toLowerCase();
    const extension = normalizedFilename.includes('.')
      ? normalizedFilename.split('.').pop()
      : '';

    return extension ?? '';
  }

  private async deleteFromCloudinary(publicId: string): Promise<void> {
    const resourceTypes = ['image', 'raw'] as const;

    await Promise.allSettled(
      resourceTypes.map((resource_type) =>
        cloudinary.uploader.destroy(publicId, { resource_type }),
      ),
    );
  }

  private withAttachmentMetadata<T extends { filename: string; url: string }>(
    attachment: T,
    metadata?: {
      mimeType?: string;
      resourceType?: string;
      format?: string;
    },
  ) {
    return {
      ...attachment,
      mimeType: metadata?.mimeType ?? this.inferMimeType(attachment.filename),
      resourceType:
        metadata?.resourceType ?? this.inferResourceType(attachment.url),
      format: metadata?.format ?? this.inferFormat(attachment.filename),
    };
  }

  private inferMimeType(filename: string): string | null {
    const extension = this.inferFormat(filename);

    if (extension === 'pdf') {
      return 'application/pdf';
    }

    if (extension === 'jpg' || extension === 'jpeg') {
      return 'image/jpeg';
    }

    if (extension === 'png') {
      return 'image/png';
    }

    if (extension === 'webp') {
      return 'image/webp';
    }

    return null;
  }

  private inferResourceType(url: string): string | null {
    if (url.includes('/raw/upload/')) {
      return 'raw';
    }

    if (url.includes('/image/upload/')) {
      return 'image';
    }

    return null;
  }

  private inferFormat(filename: string): string | null {
    const normalizedFilename = filename.toLowerCase();
    const extension = normalizedFilename.includes('.')
      ? normalizedFilename.split('.').pop()
      : null;

    return extension ?? null;
  }

  private readonly safeUserSelect = {
    id: true,
    email: true,
    displayName: true,
    avatarUrl: true,
    createdAt: true,
  };

  private readonly attachmentInclude = {
    uploadedBy: {
      select: this.safeUserSelect,
    },
  };
}
