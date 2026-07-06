import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import {
  ActivityType,
  BoardMemberRole,
  InviteStatus,
  NotificationType,
  WorkspaceMemberRole,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { ActivityService } from '../activity/activity.service';
import { AppGateway } from '../gateway/app.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInviteDto } from './dto/create-invite.dto';

interface CurrentUser {
  userId: string;
  email: string;
}

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
    private readonly activityService: ActivityService,
    private readonly notificationsService: NotificationsService,
    private readonly appGateway: AppGateway,
  ) {}

  async create(
    boardId: string,
    invitedByUserId: string,
    createInviteDto: CreateInviteDto,
  ) {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await this.prisma.boardInvite.create({
      data: {
        boardId,
        invitedByUserId,
        invitedEmail: createInviteDto.inviteeEmail,
        token,
        expiresAt,
        status: InviteStatus.PENDING,
        role: BoardMemberRole.MEMBER,
      },
      include: this.inviteInclude,
    });

    await this.sendInviteEmail(invite.invitedEmail, invite.board.title, token);

    await this.activityService.logActivity({
      type: ActivityType.MEMBER_INVITED,
      boardId,
      userId: invitedByUserId,
      payload: { invitedEmail: invite.invitedEmail },
    });

    const invitedUser = await this.prisma.user.findUnique({
      where: { email: invite.invitedEmail },
      select: { id: true },
    });

    if (invitedUser) {
      await this.notificationsService.createNotification({
        userId: invitedUser.id,
        type: NotificationType.BOARD_INVITE,
        message: `Pozvani ste na board ${invite.board.title}`,
        relatedBoardId: boardId,
        relatedInviteId: invite.id,
      });
    }

    return invite;
  }

  findAll(boardId: string) {
    return this.prisma.boardInvite.findMany({
      where: { boardId },
      include: this.inviteInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(id: string) {
    const invite = await this.prisma.boardInvite.findUnique({
      where: { id },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException('Only pending invites can be revoked');
    }

    return this.prisma.boardInvite.delete({
      where: { id },
      include: this.inviteInclude,
    });
  }

  async preview(token: string) {
    const invite = await this.findInviteByToken(token);

    return {
      id: invite.id,
      token: invite.token,
      invitedEmail: invite.invitedEmail,
      status: invite.status,
      role: invite.role,
      expiresAt: invite.expiresAt,
      board: invite.board,
      invitedBy: invite.invitedBy,
    };
  }

  async accept(token: string, currentUser: CurrentUser) {
    const invite = await this.findInviteByToken(token);
    await this.ensureInviteCanBeAccepted(invite, currentUser);
    const isFirstAcceptance = invite.status === InviteStatus.PENDING;

    const result = await this.prisma.$transaction(async (tx) => {
      const boardMember = await tx.boardMember.upsert({
        where: {
          boardId_userId: {
            boardId: invite.boardId,
            userId: currentUser.userId,
          },
        },
        update: {},
        create: {
          boardId: invite.boardId,
          userId: currentUser.userId,
          role: invite.role,
        },
      });

      await tx.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: invite.board.workspace.id,
            userId: currentUser.userId,
          },
        },
        update: {},
        create: {
          workspaceId: invite.board.workspace.id,
          userId: currentUser.userId,
          role: WorkspaceMemberRole.MEMBER,
        },
      });

      const updatedInvite = await tx.boardInvite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.ACCEPTED },
        include: this.inviteInclude,
      });

      return {
        invite: updatedInvite,
        boardMember,
      };
    });

    if (isFirstAcceptance) {
      await this.activityService.logActivity({
        type: ActivityType.MEMBER_JOINED,
        boardId: invite.boardId,
        userId: currentUser.userId,
        payload: { email: currentUser.email },
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: this.safeUserSelect,
    });

    const owner = await this.prisma.boardMember.findFirst({
      where: {
        boardId: invite.boardId,
        role: BoardMemberRole.OWNER,
      },
      select: { userId: true },
    });

    if (isFirstAcceptance && user && owner) {
      await this.notificationsService.createNotification({
        userId: owner.userId,
        type: NotificationType.MEMBER_JOINED,
        message: `${user.displayName} je prihvatio pozivnicu za board ${invite.board.title}`,
        relatedBoardId: invite.boardId,
      });
    }

    if (isFirstAcceptance && user) {
      this.appGateway.emitToBoard(invite.boardId, 'member:joined', {
        user,
        role: result.boardMember.role,
        boardId: invite.boardId,
      });
    }

    return {
      ...result,
      boardId: invite.board.id,
      boardTitle: invite.board.title,
      workspaceId: invite.board.workspace.id,
      workspaceName: invite.board.workspace.name,
    };
  }

  async decline(token: string, currentUser: CurrentUser) {
    const invite = await this.findInviteByToken(token);
    await this.ensureInviteCanBeUsed(invite, currentUser);

    return this.prisma.boardInvite.update({
      where: { id: invite.id },
      data: { status: InviteStatus.DECLINED },
      include: this.inviteInclude,
    });
  }

  private async findInviteByToken(token: string) {
    const invite = await this.prisma.boardInvite.findUnique({
      where: { token },
      include: this.inviteInclude,
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    return invite;
  }

  private async ensureInviteCanBeUsed(
    invite: Awaited<ReturnType<InvitesService['findInviteByToken']>>,
    currentUser: CurrentUser,
  ) {
    if (invite.expiresAt < new Date()) {
      await this.prisma.boardInvite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.EXPIRED },
      });
      throw new BadRequestException('Invite has expired');
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException('Invite is not pending');
    }

    if (invite.invitedEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
      throw new ForbiddenException('Invite email does not match current user');
    }
  }

  private async ensureInviteCanBeAccepted(
    invite: Awaited<ReturnType<InvitesService['findInviteByToken']>>,
    currentUser: CurrentUser,
  ) {
    if (invite.invitedEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
      throw new ForbiddenException('Invite email does not match current user');
    }

    if (invite.status === InviteStatus.ACCEPTED) {
      return;
    }

    await this.ensureInviteCanBeUsed(invite, currentUser);
  }

  private async sendInviteEmail(
    invitedEmail: string,
    boardTitle: string,
    token: string,
  ) {
    if (!process.env.MAIL_HOST || !process.env.MAIL_USER || !process.env.MAIL_PASS) {
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '') ?? '';
    const inviteUrl = `${frontendUrl}/invite/${token}`;

    try {
      await this.mailerService.sendMail({
        to: invitedEmail,
        from: process.env.MAIL_FROM,
        subject: `Invite to board ${boardTitle}`,
        text: `You have been invited to board "${boardTitle}". Open this link to respond: ${inviteUrl}`,
        html: `<p>You have been invited to board <strong>${boardTitle}</strong>.</p><p><a href="${inviteUrl}">Open invite</a></p>`,
      });
    } catch (error) {
      console.warn('Invite email was not sent.', error);
    }
  }

  private readonly safeUserSelect = {
    id: true,
    email: true,
    displayName: true,
    avatarUrl: true,
    createdAt: true,
  };

  private readonly inviteInclude = {
    board: {
      select: {
        id: true,
        title: true,
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    },
    invitedBy: {
      select: this.safeUserSelect,
    },
  };
}
