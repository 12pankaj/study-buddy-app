import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service.js';
import { DatabaseService } from '../database/database.service.js';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: DatabaseService, useValue: { query: vi.fn().mockResolvedValue({ rows: [] }) } },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
