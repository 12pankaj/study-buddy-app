import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';
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
            googleAuth: vi.fn().mockResolvedValue({ id: 1, name: 'Pankaj' }),
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
