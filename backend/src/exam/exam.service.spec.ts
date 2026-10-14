import { Test, TestingModule } from '@nestjs/testing';
import { ExamService } from './exam.service.js';
import { DatabaseService } from '../database/database.service.js';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('ExamService', () => {
  let service: ExamService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamService,
        { provide: DatabaseService, useValue: { query: vi.fn().mockResolvedValue({ rows: [] }) } },
      ],
    }).compile();

    service = module.get<ExamService>(ExamService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
