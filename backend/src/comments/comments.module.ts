import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { CardCommentsBoardRoleGuard } from './guards/card-comments-board-role.guard';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [ActivityModule],
  controllers: [CommentsController],
  providers: [CommentsService, CardCommentsBoardRoleGuard],
})
export class CommentsModule {}
