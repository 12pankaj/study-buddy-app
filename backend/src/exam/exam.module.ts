import { Module } from '@nestjs/common';
import { ExamController } from './exam.controller.js';
import { ExamService } from './exam.service.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ExamController],
  providers: [ExamService],
})
export class ExamModule {}
