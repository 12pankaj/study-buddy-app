import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AiModule } from './ai/ai.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { CourseModule } from './course/course.module.js';
import { UserModule } from './user/user.module.js';
import { ExamModule } from './exam/exam.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DatabaseModule, 
    AuthModule, 
    AiModule, 
    JobsModule, CourseModule, UserModule, ExamModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
