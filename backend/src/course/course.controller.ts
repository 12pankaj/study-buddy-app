import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CourseService } from './course.service.js';

@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get('lessons')
  async getLessons() {
    return this.courseService.getLessons();
  }

  @Get('lesson/:id')
  async getLesson(@Param('id') id: string) {
    const res = await this.courseService['dbService'].query(`SELECT * FROM lessons WHERE id = $1`, [parseInt(id)]);
    return res.rows[0];
  }

  @Get('quizzes/:lessonId')
  async getQuizzes(@Param('lessonId') lessonId: string) {
    return this.courseService.getQuizzes(parseInt(lessonId));
  }

  @Post('submit')
  async submitQuiz(
    @Body('userId') userId: number, 
    @Body('lessonId') lessonId: number, 
    @Body('score') score: number
  ) {
    return this.courseService.submitQuiz(userId, lessonId, score);
  }

  @Post('analyze-mistakes')
  async analyzeMistakes(@Body('mistakes') mistakes: any[]) {
    return this.courseService.analyzeMistakes(mistakes);
  }
}
