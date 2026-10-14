import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service.js';
import { DatabaseService } from '../database/database.service.js';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('JobsService', () => {
  let service: JobsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: DatabaseService, useValue: { query: vi.fn().mockResolvedValue({ rows: [] }) } },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
