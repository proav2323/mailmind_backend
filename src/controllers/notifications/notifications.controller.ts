import { Body, Controller, Post, Param, Get, Put } from '@nestjs/common';
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

  @Get(':id')
  async getUserNotifications(@Param('id') id: string) {
    return await this.notificationService.getAllUserNotifications(id);
  }

  @Put('seen/:id')
  async seenNotifications(@Param('id') id: string) {
    return await this.notificationService.seenUserNotifications(id);
  }
}
