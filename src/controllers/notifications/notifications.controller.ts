import { Body, Controller, Post } from '@nestjs/common';
import { NotificationsService } from '../../services/notifications/notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private notificationService: NotificationsService) {}
  @Post('send')
  async sendNotification(
    @Body()
    body: {
      title: string;
      desc: string;
      email: string;
      image?: string;
      data?: Record<string, string>;
    },
  ) {
    await this.notificationService.sendPushNotifications(
      body.title,
      body.desc,
      body.email,
      body.data,
      body.image,
    );
    return { status: 'send' };
  }
}
