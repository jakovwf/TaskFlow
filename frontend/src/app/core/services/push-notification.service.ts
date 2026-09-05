import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

const PERMISSION_TIMEOUT_MS = 15000;
const SUBSCRIPTION_TIMEOUT_MS = 15000;

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly swPush = inject(SwPush);
  private readonly http = inject(HttpClient);

  // SwPush je aktivan samo uz production build/service worker, ne u development ng serve režimu.
  readonly isEnabled = this.swPush.isEnabled;
  readonly subscription$ = this.swPush.subscription;

  async requestSubscription(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('SERVICE_WORKER_UNSUPPORTED');
    }

    // Notification.requestPermission() mora da se pozove sto je moguce blize
    // sinhrono uz klik korisnika (user gesture) - pre bilo kakvih mrezno
    // uslovljenih await-ova. Ako se prvi poziv ka browseru za dozvolu desi
    // tek nakon http round-tripa (npr. unutar swPush.requestSubscription),
    // stroziji browseri (npr. Brave) tretiraju gest kao istekao i tiho
    // odbijaju ili nikad ne razresavaju promise.
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      const permission = await this.withTimeout(
        Notification.requestPermission(),
        PERMISSION_TIMEOUT_MS,
        'PERMISSION_TIMEOUT',
      );

      if (permission !== 'granted') {
        throw new Error('PERMISSION_DENIED');
      }
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      throw new Error('PERMISSION_DENIED');
    }

    await navigator.serviceWorker.ready;

    const { publicKey } = await firstValueFrom(
      this.http.get<{ publicKey: string }>(`${environment.apiUrl}/push/vapid-public-key`),
    );

    if (!publicKey) {
      throw new Error('VAPID_PUBLIC_KEY_MISSING');
    }

    const subscription = await this.withTimeout(
      this.swPush.requestSubscription({ serverPublicKey: publicKey }),
      SUBSCRIPTION_TIMEOUT_MS,
      'SUBSCRIPTION_TIMEOUT',
    );
    const sub = subscription.toJSON();

    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/push/subscribe`, {
        endpoint: sub.endpoint,
        p256dh: sub.keys?.['p256dh'],
        auth: sub.keys?.['auth'],
      }),
    );
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;

    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
    });

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
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
