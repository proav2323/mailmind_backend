import { Test, TestingModule } from '@nestjs/testing';
import { EmailsWorkflowController } from './emails-workflow.controller';

describe('EmailsWorkflowController', () => {
  let controller: EmailsWorkflowController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailsWorkflowController],
    }).compile();

    controller = module.get<EmailsWorkflowController>(EmailsWorkflowController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
