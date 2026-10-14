import { Test, TestingModule } from '@nestjs/testing';
import { ExamController } from './exam.controller.js';
import { ExamService } from './exam.service.js';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('ExamController', () => {
  let controller: ExamController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExamController],
      providers: [
        {
          provide: ExamService,
          useValue: {
            getSyllabus: vi.fn().mockResolvedValue([]),
            getMockTest: vi.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    controller = module.get<ExamController>(ExamController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
