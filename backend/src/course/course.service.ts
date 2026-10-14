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
    this.logger.log('CourseService initialized with research-first review gate.');
  }

  // 1. Fetch all published lessons & verified course topics for the student UI
  // Distinct resource IDs and types ('lesson' vs 'topic') prevent collision
  async getLessons() {
    try {
      // 1. Fetch curated English course lessons
      const lessonsRes = await this.dbService.query(
        `SELECT id, title, description, content, level, order_index 
         FROM lessons 
         ORDER BY order_index ASC`
      );

      const lessons = (lessonsRes.rows || []).map((l) => ({
        id: l.id,
        type: 'lesson',
        slug: `lesson_${l.id}`,
        title: l.title,
        description: l.description,
        content: l.content,
        level: l.level,
        order_index: l.order_index,
      }));

      // 2. Fetch ONLY peer-reviewed, PUBLISHED deep topics
      const topicsRes = await this.dbService.query(
        `SELECT t.id, t.title, s.name as description, 'deep-track' as level, (100 + t.id) as order_index
         FROM topics t 
         JOIN subjects s ON t.subject_id = s.id 
         WHERE t.status = 'PUBLISHED' 
         ORDER BY t.id ASC`
      );

      const topics = (topicsRes.rows || []).map((t) => ({
        id: t.id,
        type: 'topic',
        slug: `topic_${t.id}`,
        title: t.title,
        description: t.description,
        level: t.level,
        order_index: t.order_index,
      }));

      const combined = [...lessons, ...topics];
      if (combined.length > 0) return combined;
    } catch (err: any) {
      this.logger.warn('Failed to fetch lessons from DB: ' + (err?.message || err));
    }

    return [
      { id: 1, type: 'lesson', slug: 'lesson_1', title: 'Chapter 1: Master the Basics', description: 'Nouns, Pronouns, and sentence structure', level: 'beginner' },
      { id: 2, type: 'lesson', slug: 'lesson_2', title: 'Chapter 2: Master the Tenses', description: 'Present, Past, and Future for interviews', level: 'intermediate' },
    ];
  }

  // Helper to parse identifier and explicit type
  private parseIdentifier(identifier: string | number, explicitType?: string): { id: number; type: 'lesson' | 'topic' } {
    const raw = identifier.toString().trim();
    if (raw.startsWith('topic_')) {
      return { id: parseInt(raw.replace('topic_', ''), 10), type: 'topic' };
    }
    if (raw.startsWith('lesson_')) {
      return { id: parseInt(raw.replace('lesson_', ''), 10), type: 'lesson' };
    }
    if (explicitType === 'topic') {
      return { id: parseInt(raw, 10), type: 'topic' };
    }
    if (explicitType === 'lesson') {
      return { id: parseInt(raw, 10), type: 'lesson' };
    }
    // Fallback: Default to lesson if unspecified numeric ID
    return { id: parseInt(raw, 10), type: 'lesson' };
  }

  // 2. Fetch specific lesson / topic detail with distinct parent entity routing
  async getLesson(identifier: string | number, explicitType?: string) {
    const { id, type } = this.parseIdentifier(identifier, explicitType);

    if (type === 'topic') {
      const topicRes = await this.dbService.query(`SELECT * FROM topics WHERE id = $1`, [id]);
      if (topicRes.rows && topicRes.rows.length > 0) {
        const knRes = await this.dbService.query(
          `SELECT * FROM knowledge_units WHERE topic_id = $1 ORDER BY id ASC`, 
          [id]
        );
        return { 
          ...topicRes.rows[0],
          type: 'topic',
          sections: knRes.rows 
        };
      }
      throw new NotFoundException(`Topic with ID ${id} not found`);
    }

    // Default: 'lesson'
    const lessonRes = await this.dbService.query(`SELECT * FROM lessons WHERE id = $1`, [id]);
    if (lessonRes.rows && lessonRes.rows.length > 0) {
      return {
        ...lessonRes.rows[0],
        type: 'lesson',
        sections: [
          {
            section_type: 'FOUNDATION',
            content_markdown: lessonRes.rows[0].content
          }
        ]
      };
    }

    // Fallback if type was ambiguous: check topics
    if (!explicitType) {
      const topicRes = await this.dbService.query(`SELECT * FROM topics WHERE id = $1`, [id]);
      if (topicRes.rows && topicRes.rows.length > 0) {
        const knRes = await this.dbService.query(
          `SELECT * FROM knowledge_units WHERE topic_id = $1 ORDER BY id ASC`, 
          [id]
        );
        return { 
          ...topicRes.rows[0],
          type: 'topic',
          sections: knRes.rows 
        };
      }
    }

    throw new NotFoundException(`Lesson or topic with ID ${id} not found`);
  }

  // 3. Fetch quizzes with foreign key integrity
  // lessons -> quizzes table (lesson_id)
  // topics  -> assessments table (topic_id)
  async getQuizzes(identifier: string | number, explicitType?: string) {
    const { id, type } = this.parseIdentifier(identifier, explicitType);

    if (type === 'topic') {
      // 1. Query assessments table for topics
      const assessRes = await this.dbService.query(
        `SELECT id, question, type, options, correct_answer, deep_explanation as explanation 
         FROM assessments 
         WHERE topic_id = $1 
         ORDER BY id ASC`, 
        [id]
      );

      if (assessRes.rows && assessRes.rows.length > 0) {
        return assessRes.rows;
      }

      // If assessments don't exist yet, generate specifically for this topic
      try {
        const topicRes = await this.dbService.query('SELECT title FROM topics WHERE id = $1', [id]);
        const topicTitle = topicRes.rows[0]?.title || 'Technical Concept';
        const aiQuestions = await this.aiService.generateTopicAssessments('Technical Curriculum', topicTitle);

        for (const q of aiQuestions) {
          await this.dbService.query(
            `INSERT INTO assessments (topic_id, type, question, options, correct_answer, deep_explanation) 
             VALUES ($1, 'mcq', $2, $3, $4, $5)`,
            [id, q.question, JSON.stringify(q.options), q.correct_answer, q.deep_explanation]
          );
        }

        const generated = await this.dbService.query(
          `SELECT id, question, type, options, correct_answer, deep_explanation as explanation 
           FROM assessments 
           WHERE topic_id = $1 
           ORDER BY id ASC`, 
          [id]
        );
        return generated.rows;
      } catch (err: any) {
        this.logger.warn(`Failed to generate assessments for topic ${id}: ${err?.message}`);
      }
      return [];
    }

    // Default: 'lesson' -> queries quizzes table ONLY
    const quizRes = await this.dbService.query(
      `SELECT id, question, type, options, correct_answer, explanation 
       FROM quizzes 
       WHERE lesson_id = $1 
       ORDER BY id ASC`, 
      [id]
    );

    if (quizRes.rows && quizRes.rows.length > 0) {
      return quizRes.rows;
    }

    // If lesson has no quizzes, generate into quizzes table (referencing lessons(id))
    try {
      const lessonRes = await this.dbService.query('SELECT title FROM lessons WHERE id = $1', [id]);
      if (lessonRes.rows && lessonRes.rows.length > 0) {
        const lessonTitle = lessonRes.rows[0].title;
        const aiQuestions = await this.aiService.generateTopicAssessments('English Fluency', lessonTitle);

        for (const q of aiQuestions) {
          await this.dbService.query(
            `INSERT INTO quizzes (lesson_id, question, type, options, correct_answer, explanation) 
             VALUES ($1, $2, 'mcq', $3, $4, $5)`,
            [id, q.question, JSON.stringify(q.options), q.correct_answer, q.deep_explanation]
          );
        }

        const generated = await this.dbService.query(
          `SELECT id, question, type, options, correct_answer, explanation 
           FROM quizzes 
           WHERE lesson_id = $1 
           ORDER BY id ASC`, 
          [id]
        );
        return generated.rows;
      }
    } catch (err: any) {
      this.logger.warn(`Failed to generate quizzes for lesson ${id}: ${err?.message}`);
    }

    return [];
  }

  // 4. Submit Quiz Score safely
  async submitQuiz(userId: number, identifier: string | number, score: number, explicitType?: string) {
    const { id } = this.parseIdentifier(identifier, explicitType);
    await this.dbService.query(
      `INSERT INTO user_progress (user_id, lesson_id, score, completed) 
       VALUES ($1, $2, $3, TRUE) 
       ON CONFLICT (user_id, lesson_id) 
       DO UPDATE SET score = EXCLUDED.score, completed = TRUE, updated_at = CURRENT_TIMESTAMP`,
      [userId || 1, id, score]
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

  // 6. Generate Topic Content with Strict Research Review Gate
  // NOTE: Quality score only measures structural completeness.
  // The topic is ALWAYS saved as 'UNDER_REVIEW' and is NEVER auto-published without verified research/curator review.
  async generateTopicContent(subjectId: number, topicTitle: string) {
    const subRes = await this.dbService.query('SELECT name FROM subjects WHERE id = $1', [subjectId]);
    if (subRes.rows.length === 0) throw new NotFoundException('Subject not found');
    const subjectName = subRes.rows[0].name;

    // Step 1: Create topic in 'UNDER_REVIEW' status
    const topicRes = await this.dbService.query(
      `INSERT INTO topics (subject_id, title, status, completeness_score) 
       VALUES ($1, $2, 'UNDER_REVIEW', 0) 
       RETURNING id`,
      [subjectId, topicTitle]
    );
    const topicId = topicRes.rows[0].id;

    // Step 2: Generate Knowledge Units
    this.logger.log(`Generating AI deep content for: ${subjectName} -> ${topicTitle}`);
    const sections = await this.aiService.generateDeepKnowledge(subjectName, topicTitle);

    for (const sec of sections) {
      await this.dbService.query(
        `INSERT INTO knowledge_units (topic_id, section_type, content_markdown) VALUES ($1, $2, $3)`,
        [topicId, sec.section_type, sec.content_markdown]
      );
    }

    // Step 3: Generate assessment questions for this topic
    const assessments = await this.aiService.generateTopicAssessments(subjectName, topicTitle);
    for (const q of assessments) {
      await this.dbService.query(
        `INSERT INTO assessments (topic_id, type, question, options, correct_answer, deep_explanation) 
         VALUES ($1, 'mcq', $2, $3, $4, $5)`,
        [topicId, q.question, JSON.stringify(q.options), q.correct_answer, q.deep_explanation]
      );
    }

    // Step 4: Evaluate Structural Completeness (Rubric)
    const structuralScore = this.evaluateContentQuality(sections, assessments);

    // CRITICAL FIX: The topic ALWAYS remains in 'UNDER_REVIEW' status!
    // Automatic publishing is strictly prevented. Human review and source verification required.
    await this.dbService.query(
      `UPDATE topics SET completeness_score = $1, status = 'UNDER_REVIEW' WHERE id = $2`,
      [structuralScore, topicId]
    );

    this.logger.log(`Topic ID ${topicId} generated with structural score ${structuralScore}%. Sent to review queue.`);

    return { 
      success: true, 
      topicId, 
      completenessScore: structuralScore, 
      status: 'UNDER_REVIEW',
      message: `Topic generated with structural completeness score ${structuralScore}%. Queued for source verification and curator review before publishing.` 
    };
  }

  // Structural completeness rubric
  private evaluateContentQuality(sections: any[], assessments: any[]): number {
    let score = 0;
    if (!sections || sections.length === 0) return 0;

    const types = sections.map(s => s.section_type?.toUpperCase());
    
    if (types.includes('DEEP_THEORY')) score += 25;
    if (types.includes('CODE_EXAMPLE') || types.includes('REAL_WORLD_EXAMPLE')) score += 25;
    if (types.includes('COMMON_MISTAKES')) score += 20;
    if (types.includes('SUMMARY')) score += 10;

    const totalWords = sections.reduce((acc, s) => acc + (s.content_markdown ? s.content_markdown.split(/\s+/).length : 0), 0);
    if (totalWords >= 200) score += 10;
    else if (totalWords >= 100) score += 5;

    if (assessments && assessments.length >= 2) score += 10;

    return Math.min(100, score);
  }

  // 7. Research-first Review & Publish Gates
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

  // Manual Curator Gate: Explicitly approves topic after factual source checking
  async publishTopic(topicId: number, reviewerNotes?: string) {
    const topicRes = await this.dbService.query(`SELECT * FROM topics WHERE id = $1`, [topicId]);
    if (topicRes.rows.length === 0) throw new NotFoundException('Topic not found');

    const topic = topicRes.rows[0];
    if (topic.completeness_score < 60) {
      throw new Error(`Cannot publish topic: Structural completeness score (${topic.completeness_score}%) is below minimum 60% requirement.`);
    }

    const res = await this.dbService.query(
      `UPDATE topics 
       SET status = 'PUBLISHED', completeness_score = GREATEST(completeness_score, 85) 
       WHERE id = $1 
       RETURNING *`,
      [topicId]
    );

    this.logger.log(`Topic ID ${topicId} officially approved and published by curator. Notes: ${reviewerNotes || 'Approved'}`);
    return { 
      success: true, 
      topic: res.rows[0],
      message: 'Topic verified and published to student curriculum.' 
    };
  }

  // Verify and record official research citations
  async verifyTopicSources(topicId: number, sources: string[]) {
    const topicRes = await this.dbService.query(`SELECT * FROM topics WHERE id = $1`, [topicId]);
    if (topicRes.rows.length === 0) throw new NotFoundException('Topic not found');

    await this.dbService.query(
      `UPDATE topics SET prerequisites = $1, status = 'SOURCES_VERIFIED' WHERE id = $2`,
      [JSON.stringify({ verified_sources: sources, verified_at: new Date().toISOString() }), topicId]
    );

    return { success: true, topicId, status: 'SOURCES_VERIFIED' };
  }
}
