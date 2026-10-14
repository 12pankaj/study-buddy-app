import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { CourseService } from './course.service.js';

@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get('lessons')
  async getLessons() {
    return this.courseService.getLessons();
  }

  @Get('lesson/:id')
  async getLesson(@Param('id') id: string, @Query('type') type?: string) {
    return this.courseService.getLesson(id, type);
  }

  @Get('quizzes/:lessonId')
  async getQuizzes(@Param('lessonId') lessonId: string, @Query('type') type?: string) {
    return this.courseService.getQuizzes(lessonId, type);
  }

  @Post('submit')
  async submitQuiz(
    @Body('userId') userId: number, 
    @Body('lessonId') lessonId: string | number, 
    @Body('score') score: number,
    @Body('type') type?: string
  ) {
    return this.courseService.submitQuiz(userId, lessonId, score, type);
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
  async publishTopic(@Param('id') id: string, @Body('notes') notes?: string) {
    return this.courseService.publishTopic(parseInt(id), notes);
  }

  @Post('topic/:id/verify-sources')
  async verifyTopicSources(@Param('id') id: string, @Body('sources') sources: string[]) {
    return this.courseService.verifyTopicSources(parseInt(id), sources || []);
  }
}
