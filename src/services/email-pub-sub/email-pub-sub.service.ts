import { Message, PubSub, Subscription } from '@google-cloud/pubsub';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EmailsService } from '../emails/emails.service';
import * as path from 'path';

@Injectable()
export class EmailPubSubService implements OnModuleDestroy, OnModuleInit {
  private readonly logger = new Logger(EmailPubSubService.name);
  private pubSubClient: PubSub;
  private subscription: Subscription;

  constructor(private emailService: EmailsService) {
    this.pubSubClient = new PubSub({
      projectId: process.env.GCP_PROJECT_ID,
      keyFilename: path.join(
        process.cwd(),
        'massive-vector-501914-a5-4b0d07bcac61.json',
      ),
    });

    this.subscription = this.pubSubClient.subscription(
      `projects/${process.env.GCP_PROJECT_ID}/subscriptions/gmail-notification-sub`,
    );

    // Attach event listeners
    this.subscription.on('message', (message: Message) => {
      this.handleMessage(message)
        .then(() => {
          this.logger.log(`Pub/Sub success`);
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
