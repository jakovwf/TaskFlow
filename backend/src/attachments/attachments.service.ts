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
import { PrismaService } from '../prisma/prisma.service';

interface UploadedAttachmentFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(
    cardId: string,
    uploadedById: string,
    file: UploadedAttachmentFile,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('File type is not allowed');
    }

    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new BadRequestException('File is too large');
    }

    const uploadedFile = await this.uploadToCloudinary(file);

    return this.prisma.attachment.create({
      data: {
        filename: file.originalname,
        url: uploadedFile.secure_url,
        publicId: uploadedFile.public_id,
        cardId,
        uploadedById,
      },
      include: this.attachmentInclude,
    });
  }

  findAll(cardId: string) {
    return this.prisma.attachment.findMany({
      where: { cardId },
      include: this.attachmentInclude,
      orderBy: { createdAt: 'asc' },
    });
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

    return this.prisma.attachment.delete({
      where: { id },
      include: this.attachmentInclude,
    });
  }

  private uploadToCloudinary(file: UploadedAttachmentFile) {
    return new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'taskflow/attachments',
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

  private async deleteFromCloudinary(publicId: string): Promise<void> {
    const resourceTypes = ['image', 'raw'] as const;

    await Promise.allSettled(
      resourceTypes.map((resource_type) =>
        cloudinary.uploader.destroy(publicId, { resource_type }),
      ),
    );
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
