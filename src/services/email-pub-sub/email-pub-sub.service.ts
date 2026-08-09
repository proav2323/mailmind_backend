import { Message, PubSub, Subscription } from '@google-cloud/pubsub';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { GoogleService } from '../google/google.service';
import { EmailsService } from '../emails/emails.service';
import { SocketGateway } from '../../gateways/socket/socket.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EmailPubSubService implements OnModuleDestroy, OnModuleInit {
  private readonly logger = new Logger(EmailPubSubService.name);
  private pubSubClient: PubSub;
  private subscription: Subscription;

  constructor(
    private googleService: GoogleService,
    private emailService: EmailsService,
    private notificationService: NotificationsService,
    private Socket: SocketGateway,
  ) {
    this.pubSubClient = new PubSub({
      projectId: 'YOUR_GCP_PROJECT_ID',
      keyFilename: 'path/to/your/service-account-key.json',
    });

    this.subscription = this.pubSubClient.subscription(
      `projects/${process.env.GCP_PROJECT_ID}/subscriptions/gmail-notification-sub`,
    );

    // Attach event listeners
    this.subscription.on('message', (message: Message) => {
      this.handleMessage(message)
        .then(() => {
          this.logger.error(`Pub/Sub success`);
        })
        .catch((error) => {
          this.logger.error(`Pub/Sub Error: ${error}`);
        });
    });
    this.subscription.on('error', (error) =>
      this.logger.error(`Pub/Sub Error: ${error}`),
    );
  }

  onModuleInit() {}

  private async handleMessage(message: Message) {
    try {
      // Decode incoming message body
      const dataString = message.data.toString();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const parsedData = JSON.parse(dataString);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const emailAddress = parsedData.emailAddress;

      this.logger.log(`New email event received for user: ${emailAddress}`);
      const now = new Date();
      // Process email lifecycle update
      await this.fetchLatestEmail(
        emailAddress as string,
        '',
        now.getFullYear().toString(),
      );

      // Acknowledge receipt to clear it from the queue
      message.ack();
    } catch (error) {
      this.logger.error('Failed to process message', error);
      // Nack causes the message to be retried
      message.nack();
    }
  }

  private async fetchLatestEmail(
    emailAddress: string,
    scope: string,
    year: string,
  ) {
    return await this.emailService.get_user_emails(
      emailAddress,
      scope,
      year,
      true,
    );
  }

  async onModuleDestroy() {
    if (this.subscription) {
      await this.subscription.close();
    }
  }
}
