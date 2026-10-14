import { Test, TestingModule } from '@nestjs/testing';
import { CourseService } from './course.service.js';
import { DatabaseService } from '../database/database.service.js';
import { AiService } from '../ai/ai.service.js';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('CourseService', () => {
  let service: CourseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseService,
        { provide: DatabaseService, useValue: { query: vi.fn().mockResolvedValue({ rows: [] }) } },
        { provide: AiService, useValue: { chat: vi.fn(), generateDeepKnowledge: vi.fn(), generateTopicAssessments: vi.fn() } },
      ],
    }).compile();

    service = module.get<CourseService>(CourseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
