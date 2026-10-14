import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { AiService } from '../ai/ai.service.js';

@Injectable()
export class CourseService implements OnModuleInit {
  private readonly logger = new Logger(CourseService.name);

  constructor(
    private dbService: DatabaseService,
    private aiService: AiService
  ) {}

  async onModuleInit() {
    this.logger.log('CourseService initialized with Deep Architecture. No startup seeding.');
  }


  async getLessons() {
    try {
      // Fetch available topics for the UI
      const res = await this.dbService.query(
        `SELECT t.id, t.title as title, s.name as description 
         FROM topics t JOIN subjects s ON t.subject_id = s.id 
         ORDER BY t.id ASC`
      );
      if (res.rows && res.rows.length > 0) return res.rows;
    } catch {
      this.logger.warn('Failed to fetch topics from DB');
    }
    return [
      { id: 1, title: 'No Topics Available', description: 'Ask AI to generate one!', level: 'advanced' },
    ];
  }

  async generateTopicContent(subjectId: number, topicTitle: string) {
    // 1. Get Subject Name
    const subRes = await this.dbService.query('SELECT name FROM subjects WHERE id = $1', [subjectId]);
    if (subRes.rows.length === 0) throw new Error('Subject not found');
    const subjectName = subRes.rows[0].name;

    // 2. Create Topic Entry
    const topicRes = await this.dbService.query(
      `INSERT INTO topics (subject_id, title, status) VALUES ($1, $2, 'REVIEW') RETURNING id`,
      [subjectId, topicTitle]
    );
    const topicId = topicRes.rows[0].id;

    // 3. Ask Gemini for Deep Knowledge Units
    this.logger.log(`Generating AI deep content for: ${subjectName} -> ${topicTitle}`);
    const sections = await this.aiService.generateDeepKnowledge(subjectName, topicTitle);

    // 4. Insert into Knowledge Units table
    for (const sec of sections) {
      await this.dbService.query(
        `INSERT INTO knowledge_units (topic_id, section_type, content_markdown) VALUES ($1, $2, $3)`,
        [topicId, sec.section_type, sec.content_markdown]
      );
    }

    // 5. Update completeness score
    await this.dbService.query(
      `UPDATE topics SET completeness_score = 100, status = 'PUBLISHED' WHERE id = $1`,
      [topicId]
    );

    return { success: true, topicId, message: 'Deep Knowledge Generated and Published!' };
  }
}
