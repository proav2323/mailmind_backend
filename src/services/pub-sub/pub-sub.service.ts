import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PubSub } from '@google-cloud/pubsub';

@Injectable()
export class PubSubService implements OnModuleInit {
  private pubSubClient!: PubSub;
  private readonly logger = new Logger(PubSubService.name);

  onModuleInit() {
    this.pubSubClient = new PubSub({
      projectId: process.env.GCP_PROJECT_ID,
    });
  }
}
