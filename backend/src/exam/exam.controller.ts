import { Controller, Get, Param, Query } from '@nestjs/common';
import { ExamService } from './exam.service.js';

@Controller('exam')
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Get('syllabus/:targetGoal')
  async getSyllabus(@Param('targetGoal') targetGoal: string) {
    return this.examService.getSyllabus(targetGoal);
  }

  @Get('mock-test/:subjectId')
  async getMockTest(@Param('subjectId') subjectId: string) {
    return this.examService.getMockTest(parseInt(subjectId));
  }
}
