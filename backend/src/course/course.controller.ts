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
    const res = await this.courseService['dbService'].query(`SELECT * FROM topics WHERE id = $1`, [parseInt(id)]);
    const knRes = await this.courseService['dbService'].query(`SELECT * FROM knowledge_units WHERE topic_id = $1`, [parseInt(id)]);
    return { ...res.rows[0], sections: knRes.rows };
  }

  @Post('generate-topic')
  async generateTopic(@Body() body: { subjectId: number; topicTitle: string }) {
    return this.courseService.generateTopicContent(body.subjectId, body.topicTitle);
  }
}
