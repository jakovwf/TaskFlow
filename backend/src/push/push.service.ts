import { Injectable } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UnsubscribeDto } from './dto/unsubscribe.dto';

interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
}

@Injectable()
export class PushService {
  constructor(private readonly prisma: PrismaService) {
    if (
      process.env.VAPID_SUBJECT &&
      process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY
    ) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
      );
    }
  }

  getVapidPublicKey() {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY,
    };
  }

  subscribe(userId: string, createSubscriptionDto: CreateSubscriptionDto) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: createSubscriptionDto.endpoint },
      update: {
        userId,
        p256dh: createSubscriptionDto.p256dh,
        auth: createSubscriptionDto.auth,
      },
      create: {
        userId,
        endpoint: createSubscriptionDto.endpoint,
        p256dh: createSubscriptionDto.p256dh,
        auth: createSubscriptionDto.auth,
      },
    });
  }

  unsubscribe(userId: string, unsubscribeDto: UnsubscribeDto) {
    return this.prisma.pushSubscription.deleteMany({
      where: {
        userId,
        endpoint: unsubscribeDto.endpoint,
      },
    });
  }

  async sendPushNotification(
    userId: string,
    payload: PushNotificationPayload,
  ) {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            JSON.stringify({
              notification: {
                title: payload.title,
                body: payload.body,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-96x96.png',
                data: {
                  onActionClick: {
                    default: {
                      operation: 'openWindow',
                      url: payload.url ?? '/notifications',
                    },
                  },
                },
              },
            }),
          );
        } catch (error) {
          if (this.isExpiredSubscriptionError(error)) {
            await this.prisma.pushSubscription.delete({
              where: { id: subscription.id },
            });
          }
        }
      }),
    );
  }

  private isExpiredSubscriptionError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      (error as { statusCode?: number }).statusCode === 410
    );
  }
}
