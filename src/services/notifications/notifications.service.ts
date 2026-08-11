/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin/app';
import * as msg from 'firebase-admin/messaging';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { JsonValue } from '../../generated/prisma/internal/prismaNamespace';
import { generateId } from '../../utils/generateId';

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}
  onModuleInit() {
    if (!admin.getApps().length || admin.getApps().length === 0) {
      admin.initializeApp({
        credential: admin.cert(
          path.join(
            process.cwd(),
            'massive-vector-501914-a5-08fb4c812e2e.json',
          ),
        ),
      });
    }
  }

  async sendPushNotifications(
    title: string,
    desc: string,
    email: string,
    data?: Record<string, string>,
    image?: string,
  ) {
    const user = await this.prisma.uSER.findUnique({
      where: { email: email },
      select: { fids: true },
    });
    if (!user) return;

    const fids: JsonValue[] = user.fids;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const stringFids: string[] = fids.map((value) => value!['token']);
    const message: msg.FidMulticastMessage = {
      data: data ?? {},
      notification: { title: title, body: desc, imageUrl: image },
      fids: stringFids,
    };

    message.android = {
      priority: 'high',
      notification: {
        sound: 'default',
      },
    };
    message.webpush = {
      headers: {
        Urgency: 'high',
      },
      notification: {
        icon: '/firebase-logo.png', // Paths relative to your web app asset root
        click_action: 'https://mailmind-frontend-web.vercel.app/dashboard', // Absolute redirection path
      },
    };

    try {
      await msg
        .getMessaging()
        .sendEachForMulticast(message)
        .then((response) => {
          console.log(
            response.successCount + ' messages were sent successfully',
          );
          if (response.failureCount > 0) {
            const failedFids: string[] = [];
            response.responses.forEach((resp, idx) => {
              if (!resp.success) {
                failedFids.push(stringFids[idx]);
                console.log(resp.error);
              }
            });
            console.log('List of FIDs that caused failures:', failedFids);
          }
        });
      await this.prisma.uSER.update({
        where: { email: email },
        data: {
          notifications: {
            create: {
              id: generateId(8),
              isSent: true,
              title: title,
              body: desc,
              scheduledTime: new Date(),
            },
          },
        },
        select: { id: true },
      });
      return { statsu: 'success' };
    } catch (err) {
      console.log(err);
    }
  }
}
