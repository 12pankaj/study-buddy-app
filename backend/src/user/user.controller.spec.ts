import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';
import { AuthService } from '../auth/auth.service.js';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            getProfile: vi.fn().mockResolvedValue({ id: 1, name: 'Pankaj' }),
            updateProfile: vi.fn().mockResolvedValue({ id: 1 }),
          },
        },
        {
          provide: AuthService,
          useValue: {
            googleLogin: vi.fn().mockResolvedValue({ id: 1, email: 'test@example.com' }),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
