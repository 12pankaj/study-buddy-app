import { Module } from '@nestjs/common';
import { CourseService } from './course.service.js';
import { CourseController } from './course.controller.js';
import { DatabaseModule } from '../database/database.module.js';
import { AiModule } from '../ai/ai.module.js';

@Module({
  imports: [DatabaseModule, AiModule],
  providers: [CourseService],
  controllers: [CourseController]
})
export class CourseModule {}
