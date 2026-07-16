import { Test, TestingModule } from '@nestjs/testing';
import { EcryptionService } from './ecryption.service';

describe('EcryptionService', () => {
  let service: EcryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EcryptionService],
    }).compile();

    service = module.get<EcryptionService>(EcryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
