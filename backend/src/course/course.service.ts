import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
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
    this.logger.log('CourseService initialized with verified learning pipeline.');
  }

  // 1. Fetch all published lessons & verified course topics for the student UI
  async getLessons() {
    try {
      // Fetch English course lessons first
      const lessonsRes = await this.dbService.query(
        `SELECT id, title, description, content, level, order_index 
         FROM lessons 
         ORDER BY order_index ASC`
      );

      // Fetch ONLY PUBLISHED deep topics (quality-verified)
      const topicsRes = await this.dbService.query(
        `SELECT t.id, t.title, s.name as description, 'deep-track' as level, 100 as order_index
         FROM topics t 
         JOIN subjects s ON t.subject_id = s.id 
         WHERE t.status = 'PUBLISHED' 
         ORDER BY t.id ASC`
      );

      const combined = [...(lessonsRes.rows || []), ...(topicsRes.rows || [])];
      if (combined.length > 0) return combined;
    } catch (err: any) {
      this.logger.warn('Failed to fetch lessons from DB: ' + (err?.message || err));
    }

    return [
      { id: 1, title: 'Chapter 1: Master the Basics', description: 'Nouns, Pronouns, and sentence structure', level: 'beginner' },
      { id: 2, title: 'Chapter 2: Master the Tenses', description: 'Present, Past, and Future for interviews', level: 'intermediate' },
    ];
  }

  // 2. Fetch specific lesson / topic detail
  async getLesson(id: number) {
    // Check lessons table first
    const lessonRes = await this.dbService.query(`SELECT * FROM lessons WHERE id = $1`, [id]);
    if (lessonRes.rows && lessonRes.rows.length > 0) {
      return {
        ...lessonRes.rows[0],
        sections: [
          {
            section_type: 'FOUNDATION',
            content_markdown: lessonRes.rows[0].content
          }
        ]
      };
    }

    // Check topics table
    const topicRes = await this.dbService.query(`SELECT * FROM topics WHERE id = $1`, [id]);
    if (topicRes.rows && topicRes.rows.length > 0) {
      const knRes = await this.dbService.query(
        `SELECT * FROM knowledge_units WHERE topic_id = $1 ORDER BY id ASC`, 
        [id]
      );
      return { 
        ...topicRes.rows[0], 
        sections: knRes.rows 
      };
    }

    throw new NotFoundException(`Lesson or topic with ID ${id} not found`);
  }

  // 3. Fetch quizzes for a lesson or topic
  async getQuizzes(lessonId: number) {
    // Check quizzes table (English course lessons)
    const quizRes = await this.dbService.query(
      `SELECT id, question, type, options, correct_answer, explanation 
       FROM quizzes 
       WHERE lesson_id = $1 
       ORDER BY id ASC`, 
      [lessonId]
    );

    if (quizRes.rows && quizRes.rows.length > 0) {
      return quizRes.rows;
    }

    // Check assessments table (Deep topics)
    const assessRes = await this.dbService.query(
      `SELECT id, question, type, options, correct_answer, deep_explanation as explanation 
       FROM assessments 
       WHERE topic_id = $1 
       ORDER BY id ASC`, 
      [lessonId]
    );

    if (assessRes.rows && assessRes.rows.length > 0) {
      return assessRes.rows;
    }

    // If no quizzes exist yet, generate assessments on the fly using AI
    try {
      const topicInfo = await this.getLesson(lessonId);
      const title = topicInfo.title || 'Technical Concept';
      const aiQuestions = await this.aiService.generateTopicAssessments('Software Engineering & English', title);

      for (const q of aiQuestions) {
        await this.dbService.query(
          `INSERT INTO assessments (topic_id, type, question, options, correct_answer, deep_explanation) 
           VALUES ($1, 'mcq', $2, $3, $4, $5)`,
          [lessonId, q.question, JSON.stringify(q.options), q.correct_answer, q.deep_explanation]
        );
      }

      const generated = await this.dbService.query(
        `SELECT id, question, type, options, correct_answer, deep_explanation as explanation 
         FROM assessments 
         WHERE topic_id = $1 
         ORDER BY id ASC`, 
        [lessonId]
      );
      return generated.rows;
    } catch (e: any) {
      this.logger.warn(`Could not generate fallback quiz for lessonId ${lessonId}: ${e?.message}`);
    }

    return [];
  }

  // 4. Submit Quiz Score
  async submitQuiz(userId: number, lessonId: number, score: number) {
    await this.dbService.query(
      `INSERT INTO user_progress (user_id, lesson_id, score, completed) 
       VALUES ($1, $2, $3, TRUE) 
       ON CONFLICT (user_id, lesson_id) 
       DO UPDATE SET score = EXCLUDED.score, completed = TRUE, updated_at = CURRENT_TIMESTAMP`,
      [userId || 1, lessonId, score]
    );
    return { success: true, score };
  }

  // 5. Analyze Mistakes with Gemini AI
  async analyzeMistakes(mistakes: any[]) {
    if (!mistakes || mistakes.length === 0) {
      return { feedback: 'Great job! No mistakes were identified.' };
    }

    const prompt = `A student completed a test and made the following mistakes:\n\n` + 
      mistakes.map((m, i) => `Question ${i + 1}: ${m.question}\nStudent's Answer: ${m.userAnswer}\nCorrect Answer: ${m.correctAnswer}`).join('\n\n') +
      `\n\nTask:
1. Explain concisely why their choice was incorrect and why the correct answer is right.
2. Provide a memorable tip or rule to avoid this mistake in the future.
3. Keep the tone encouraging, clear, and easy to understand.`;
    
    try {
      const response = await this.aiService.chat(prompt);
      return { feedback: response.response };
    } catch {
      return { 
        feedback: 'Focus on reviewing the key rules from the chapter. Review subject-verb agreement and specific vocabulary definitions before retrying!' 
      };
    }
  }

  // 6. Generate Topic Content with Research-First Quality Verification Workflow
  async generateTopicContent(subjectId: number, topicTitle: string) {
    // Step 1: Verify subject existence
    const subRes = await this.dbService.query('SELECT name FROM subjects WHERE id = $1', [subjectId]);
    if (subRes.rows.length === 0) throw new NotFoundException('Subject not found');
    const subjectName = subRes.rows[0].name;

    // Step 2: Insert topic in 'UNDER_REVIEW' status (Never publish automatically without verification)
    const topicRes = await this.dbService.query(
      `INSERT INTO topics (subject_id, title, status, completeness_score) 
       VALUES ($1, $2, 'UNDER_REVIEW', 0) 
       RETURNING id`,
      [subjectId, topicTitle]
    );
    const topicId = topicRes.rows[0].id;

    // Step 3: Ask Gemini for Deep Knowledge Units
    this.logger.log(`Generating AI deep content for: ${subjectName} -> ${topicTitle}`);
    const sections = await this.aiService.generateDeepKnowledge(subjectName, topicTitle);

    for (const sec of sections) {
      await this.dbService.query(
        `INSERT INTO knowledge_units (topic_id, section_type, content_markdown) VALUES ($1, $2, $3)`,
        [topicId, sec.section_type, sec.content_markdown]
      );
    }

    // Step 4: Generate assessment questions for this topic
    const assessments = await this.aiService.generateTopicAssessments(subjectName, topicTitle);
    for (const q of assessments) {
      await this.dbService.query(
        `INSERT INTO assessments (topic_id, type, question, options, correct_answer, deep_explanation) 
         VALUES ($1, 'mcq', $2, $3, $4, $5)`,
        [topicId, q.question, JSON.stringify(q.options), q.correct_answer, q.deep_explanation]
      );
    }

    // Step 5: Research-First Quality Verification Rubric
    const qualityScore = this.evaluateContentQuality(sections, assessments);
    const isQualityApproved = qualityScore >= 80;
    const finalStatus = isQualityApproved ? 'PUBLISHED' : 'UNDER_REVIEW';

    await this.dbService.query(
      `UPDATE topics SET completeness_score = $1, status = $2 WHERE id = $3`,
      [qualityScore, finalStatus, topicId]
    );

    this.logger.log(`Topic ID ${topicId} quality evaluation: score = ${qualityScore}, status = ${finalStatus}`);

    return { 
      success: true, 
      topicId, 
      completenessScore: qualityScore, 
      status: finalStatus,
      message: isQualityApproved 
        ? 'Deep Knowledge verified and published!' 
        : 'Deep Knowledge generated and queued for human review.' 
    };
  }

  // Quality verification rubric
  private evaluateContentQuality(sections: any[], assessments: any[]): number {
    let score = 0;
    if (!sections || sections.length === 0) return 0;

    const types = sections.map(s => s.section_type?.toUpperCase());
    
    // Check required sections
    if (types.includes('DEEP_THEORY')) score += 25;
    if (types.includes('CODE_EXAMPLE') || types.includes('REAL_WORLD_EXAMPLE')) score += 25;
    if (types.includes('COMMON_MISTAKES')) score += 20;
    if (types.includes('SUMMARY')) score += 10;

    // Check depth (content length)
    const totalWords = sections.reduce((acc, s) => acc + (s.content_markdown ? s.content_markdown.split(/\s+/).length : 0), 0);
    if (totalWords >= 200) score += 10;
    else if (totalWords >= 100) score += 5;

    // Check assessments completeness
    if (assessments && assessments.length >= 2) score += 10;

    return Math.min(100, score);
  }

  // 7. Review endpoints for quality curation
  async getTopicsForReview() {
    const res = await this.dbService.query(
      `SELECT t.*, s.name as subject_name 
       FROM topics t 
       JOIN subjects s ON t.subject_id = s.id 
       WHERE t.status != 'PUBLISHED' 
       ORDER BY t.id DESC`
    );
    return res.rows;
  }

  async publishTopic(topicId: number) {
    const res = await this.dbService.query(
      `UPDATE topics 
       SET status = 'PUBLISHED', completeness_score = GREATEST(completeness_score, 90) 
       WHERE id = $1 
       RETURNING *`,
      [topicId]
    );
    if (res.rows.length === 0) throw new NotFoundException('Topic not found');
    return { success: true, topic: res.rows[0] };
  }
}
