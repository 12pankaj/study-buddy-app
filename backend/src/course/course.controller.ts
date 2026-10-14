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
    return this.courseService.getLesson(parseInt(id));
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

  @Post('generate-topic')
  async generateTopic(@Body() body: { subjectId: number; topicTitle: string }) {
    return this.courseService.generateTopicContent(body.subjectId, body.topicTitle);
  }

  @Get('topics/review')
  async getTopicsForReview() {
    return this.courseService.getTopicsForReview();
  }

  @Post('topic/:id/publish')
  async publishTopic(@Param('id') id: string) {
    return this.courseService.publishTopic(parseInt(id));
  }
}
