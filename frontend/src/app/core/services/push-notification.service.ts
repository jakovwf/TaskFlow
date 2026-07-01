import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly swPush = inject(SwPush);
  private readonly http = inject(HttpClient);

  // SwPush je aktivan samo uz production build/service worker, ne u development ng serve režimu.
  readonly isEnabled = this.swPush.isEnabled;
  readonly subscription$ = this.swPush.subscription;

  async requestSubscription(): Promise<void> {
    const { publicKey } = await firstValueFrom(
      this.http.get<{ publicKey: string }>(`${environment.apiUrl}/push/vapid-public-key`),
    );
    const subscription = await this.swPush.requestSubscription({
      serverPublicKey: publicKey,
    });
    const sub = subscription.toJSON();

    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/push/subscribe`, {
        endpoint: sub.endpoint,
        p256dh: sub.keys?.['p256dh'],
        auth: sub.keys?.['auth'],
      }),
    );
  }

  async cancelSubscription(): Promise<void> {
    const subscription = await firstValueFrom(this.swPush.subscription);

    if (subscription) {
      await firstValueFrom(
        this.http.delete(`${environment.apiUrl}/push/unsubscribe`, {
          body: { endpoint: subscription.endpoint },
        }),
      );
      await this.swPush.unsubscribe();
    }
  }
}
