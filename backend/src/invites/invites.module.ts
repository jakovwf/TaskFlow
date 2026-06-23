import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ActivityModule } from '../activity/activity.module';
import { BoardRoleGuard } from '../boards/guards/board-role.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { InviteBoardRoleGuard } from './guards/invite-board-role.guard';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';

@Module({
  imports: [
    ActivityModule,
    NotificationsModule,
    MailerModule.forRoot({
      transport: {
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT ?? 587),
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      },
      defaults: {
        from: process.env.MAIL_FROM,
      },
    }),
  ],
  controllers: [InvitesController],
  providers: [InvitesService, BoardRoleGuard, InviteBoardRoleGuard],
})
export class InvitesModule {}
