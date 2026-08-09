import { Test, TestingModule } from '@nestjs/testing';
import { EmailPubSubService } from './email-pub-sub.service';

describe('EmailPubSubService', () => {
  let service: EmailPubSubService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailPubSubService],
    }).compile();

    service = module.get<EmailPubSubService>(EmailPubSubService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
