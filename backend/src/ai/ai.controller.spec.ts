import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { DatabaseService } from '../database/database.service.js';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('AiController', () => {
  let controller: AiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        {
          provide: AiService,
          useValue: {
            chat: vi.fn().mockResolvedValue({ response: 'Hello' }),
            handleVoiceChat: vi.fn().mockResolvedValue({ reply: 'Hello' }),
            generateDailyPlan: vi.fn().mockResolvedValue([]),
            generateStudyPlan: vi.fn().mockResolvedValue({ weeks: [] }),
          },
        },
        {
          provide: DatabaseService,
          useValue: {
            query: vi.fn().mockResolvedValue({ rows: [] }),
          },
        },
      ],
    }).compile();

    controller = module.get<AiController>(AiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
