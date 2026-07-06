import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, finalize, map, take } from 'rxjs';
import { BoardService } from '../../../core/services/board';
import { BoardActivityItem } from '../../../store/models';

@Component({
  selector: 'app-board-activity',
  imports: [DatePipe, RouterLink],
  templateUrl: './board-activity.html',
  styleUrl: './board-activity.scss',
})
export class BoardActivity {
  private readonly boardService = inject(BoardService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);

  boardId: string | null = null;
  activities: BoardActivityItem[] = [];
  visibleActivityCount = 10;
  loading = false;
  error: string | null = null;

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('boardId')),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((boardId) => {
        this.boardId = boardId;

        if (boardId) {
          this.loadActivity(boardId);
          return;
        }

        this.loading = false;
        this.activities = [];
        this.error = 'Board nije pronadjen.';
        this.cdr.markForCheck();
      });
  }

  describeActivity(activity: BoardActivityItem): string {
    const payload = activity.payload ?? {};
    const listTitle = this.getPayloadValue(payload, 'listTitle');
    const cardTitle = this.getPayloadValue(payload, 'cardTitle');
    const boardTitle = this.getPayloadValue(payload, 'boardTitle');
    const email = this.getPayloadValue(payload, 'email');

    switch (activity.type) {
      case 'BOARD_UPDATED':
        return `azurirao/la board${boardTitle ? ` "${boardTitle}"` : ''}.`;
      case 'LIST_CREATED':
        return `kreirao/la listu${listTitle ? ` "${listTitle}"` : ''}.`;
      case 'LIST_RENAMED':
        return `preimenovao/la listu${listTitle ? ` u "${listTitle}"` : ''}.`;
      case 'LIST_DELETED':
        return `obrisao/la listu${listTitle ? ` "${listTitle}"` : ''}.`;
      case 'CARD_CREATED':
        return `kreirao/la karticu${cardTitle ? ` "${cardTitle}"` : ''}.`;
      case 'CARD_UPDATED':
        return `azurirao/la karticu${cardTitle ? ` "${cardTitle}"` : ''}.`;
      case 'CARD_DELETED':
        return `obrisao/la karticu${cardTitle ? ` "${cardTitle}"` : ''}.`;
      case 'CARD_MOVED':
        return `premestio/la karticu${cardTitle ? ` "${cardTitle}"` : ''}.`;
      case 'MEMBER_INVITED':
        return `poslao/la invite${email ? ` za ${email}` : ''}.`;
      case 'MEMBER_JOINED':
        return `pridruzio/la se boardu${email ? ` (${email})` : ''}.`;
      case 'MEMBER_REMOVED':
        return 'uklonio/la clana sa boarda.';
      case 'CARD_ASSIGNED':
        return `dodelio/la karticu${cardTitle ? ` "${cardTitle}"` : ''}.`;
      case 'CARD_UNASSIGNED':
        return `uklonio/la dodelu sa kartice${cardTitle ? ` "${cardTitle}"` : ''}.`;
      case 'COMMENT_ADDED':
        return `dodao/la komentar${cardTitle ? ` na "${cardTitle}"` : ''}.`;
      case 'COMMENT_DELETED':
        return `obrisao/la komentar${cardTitle ? ` sa "${cardTitle}"` : ''}.`;
      default:
        return 'izvrsio/la aktivnost na boardu.';
    }
  }

  loadMoreActivities(): void {
    this.visibleActivityCount += 10;
  }

  private loadActivity(boardId: string): void {
    this.loading = true;
    this.error = null;
    this.activities = [];
    this.visibleActivityCount = 10;
    this.cdr.markForCheck();

    this.boardService
      .getBoardActivity(boardId)
      .pipe(
        take(1),
        finalize(() => {
          if (this.boardId === boardId) {
            this.loading = false;
            this.cdr.markForCheck();
          }
        }),
      )
      .subscribe({
        next: (activities) => {
          if (this.boardId !== boardId) {
            return;
          }

          this.activities = activities;
          this.cdr.markForCheck();
        },
        error: (error: unknown) => {
          if (this.boardId !== boardId) {
            return;
          }

          this.error = this.getErrorMessage(error);
          this.cdr.markForCheck();
        },
      });
  }

  private getPayloadValue(payload: Record<string, unknown>, key: string): string {
    const value = payload[key];
    return typeof value === 'string' ? value : '';
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return 'Morate biti prijavljeni da biste videli activity.';
      }

      if (error.status === 403) {
        return 'Nemate pristup activity logu ovog boarda.';
      }

      if (error.status === 404) {
        return 'Board nije pronadjen.';
      }
    }

    return 'Activity log nije ucitan.';
  }
}
