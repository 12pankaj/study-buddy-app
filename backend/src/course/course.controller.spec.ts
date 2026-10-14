import { Test, TestingModule } from '@nestjs/testing';
import { CourseController } from './course.controller.js';
import { CourseService } from './course.service.js';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('CourseController', () => {
  let controller: CourseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseController],
      providers: [
        {
          provide: CourseService,
          useValue: {
            getLessons: vi.fn().mockResolvedValue([]),
            getLesson: vi.fn().mockResolvedValue({}),
            getQuizzes: vi.fn().mockResolvedValue([]),
            submitQuiz: vi.fn().mockResolvedValue({ success: true, score: 10 }),
            analyzeMistakes: vi.fn().mockResolvedValue({ feedback: 'Good job' }),
            generateTopicContent: vi.fn().mockResolvedValue({ success: true }),
            getTopicsForReview: vi.fn().mockResolvedValue([]),
            publishTopic: vi.fn().mockResolvedValue({ success: true }),
          },
        },
      ],
    }).compile();

    controller = module.get<CourseController>(CourseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
