import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { DatabaseService } from '../database/database.service.js';
import { ConfigService } from '@nestjs/config';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DatabaseService, useValue: { query: vi.fn().mockResolvedValue({ rows: [] }) } },
        { provide: ConfigService, useValue: { get: vi.fn().mockReturnValue('mock_value') } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
