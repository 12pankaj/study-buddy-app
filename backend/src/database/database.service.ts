import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResult } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private configService: ConfigService) { }

  async onModuleInit() {
    this.pool = new Pool({
      host: this.configService.get<string>('DB_HOST') || 'localhost',
      port: this.configService.get<number>('DB_PORT') || 5432,
      user: this.configService.get<string>('DB_USER') || 'postgres',
      password: this.configService.get<string>('DB_PASSWORD') || 'root',
      database: this.configService.get<string>('DB_NAME') || 'studybuddy_db',
    });

    this.pool.on('error', (err) => {
      this.logger.error('Unexpected error on idle client', err);
    });

    try {
      // Test connection and initialize schema
      await this.pool.query('SELECT NOW()');
      this.logger.log('Database connection successful');
      await this.initSchema();
    } catch (error: any) {
      this.logger.error('Failed to connect to database or init schema. Please check your local PostgreSQL credentials in .env file.', error?.message || error);
    }
  }

  private async initSchema() {
    const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        auth_provider VARCHAR(50) DEFAULT 'email',
        education VARCHAR(255),
        target_goals JSONB,
        english_level VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createOtpsTableQuery = `
      CREATE TABLE IF NOT EXISTS otps (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp_code VARCHAR(10) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createJobsTableQuery = `
      CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        link TEXT NOT NULL UNIQUE,
        source VARCHAR(100) NOT NULL,
        deadline TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createLearningTracksTableQuery = `
      CREATE TABLE IF NOT EXISTS learning_tracks (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE
      );
    `;

    const createSubjectsTableQuery = `
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        track_id INTEGER REFERENCES learning_tracks(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL
      );
    `;

    const createTopicsTableQuery = `
      CREATE TABLE IF NOT EXISTS topics (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        prerequisites JSONB,
        completeness_score INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'DRAFT'
      );
    `;

    const createKnowledgeUnitsTableQuery = `
      CREATE TABLE IF NOT EXISTS knowledge_units (
        id SERIAL PRIMARY KEY,
        topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
        section_type VARCHAR(100) NOT NULL,
        content_markdown TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createAssessmentsTableQuery = `
      CREATE TABLE IF NOT EXISTS assessments (
        id SERIAL PRIMARY KEY,
        topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        question TEXT NOT NULL,
        options JSONB,
        correct_answer TEXT NOT NULL,
        deep_explanation TEXT
      );
    `;

    await this.query(createUsersTableQuery);
    await this.query(createOtpsTableQuery);
    await this.query(createJobsTableQuery);

    // Drop old tables
    await this.query('DROP TABLE IF EXISTS user_progress CASCADE;');
    await this.query('DROP TABLE IF EXISTS quizzes CASCADE;');
    await this.query('DROP TABLE IF EXISTS lessons CASCADE;');

    // Create new knowledge base tables
    await this.query(createLearningTracksTableQuery);
    await this.query(createSubjectsTableQuery);
    await this.query(createTopicsTableQuery);
    await this.query(createKnowledgeUnitsTableQuery);
    await this.query(createAssessmentsTableQuery);

    const createStudyPlansTableQuery = `
      CREATE TABLE IF NOT EXISTS study_plans (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date DATE DEFAULT CURRENT_DATE,
        plan_json JSONB,
        is_completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
      );
    `;

    const createExamSyllabusTableQuery = `
      CREATE TABLE IF NOT EXISTS exam_syllabus (
        id SERIAL PRIMARY KEY,
        target_goal VARCHAR(255) NOT NULL,
        subject_name VARCHAR(255) NOT NULL,
        weightage INTEGER DEFAULT 10
      );
    `;

    const createQuestionBankTableQuery = `
      CREATE TABLE IF NOT EXISTS question_bank (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER REFERENCES exam_syllabus(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        options_json JSONB NOT NULL,
        correct_answer VARCHAR(255) NOT NULL,
        explanation TEXT,
        is_pyq BOOLEAN DEFAULT false
      );
    `;

    await this.query(createStudyPlansTableQuery);
    await this.query(createExamSyllabusTableQuery);
    await this.query(createQuestionBankTableQuery);

    try {
      await this.query(`ALTER TABLE users ADD COLUMN name VARCHAR(255), ADD COLUMN education VARCHAR(255), ADD COLUMN target_goals JSONB, ADD COLUMN english_level VARCHAR(50), ADD COLUMN email VARCHAR(255), ADD COLUMN google_id VARCHAR(255);`);
    } catch (e) { }

    this.logger.log('All Database tables checked/created');
    await this.seedExamContent();
  }

  async seedExamContent() {
    const res = await this.query(`SELECT COUNT(*) FROM exam_syllabus`);
    if (parseInt(res.rows[0].count) > 0) return;

    this.logger.log('Seeding Exam Mock Data...');

    // 1. Target: RPSC Programmer
    const rpscSubjects = [
      { name: 'Computer Fundamentals', w: 10 },
      { name: 'Programming (Java)', w: 20 },
      { name: 'DBMS', w: 25 },
      { name: 'Networking', w: 25 },
      { name: 'Software Engineering', w: 20 }
    ];

    for (const sub of rpscSubjects) {
      const subRes = await this.query(
        `INSERT INTO exam_syllabus (target_goal, subject_name, weightage) VALUES ($1, $2, $3) RETURNING id`,
        ['RPSC Programmer', sub.name, sub.w]
      );
      const subId = subRes.rows[0].id;

      if (sub.name === 'DBMS') {
        await this.query(
          `INSERT INTO question_bank (subject_id, question, options_json, correct_answer, explanation, is_pyq) VALUES 
          ($1, 'Which of the following is the primary key in a relational database?', '["Foreign Key", "Primary Key", "Candidate Key", "Unique Key"]', 'Primary Key', 'Primary key uniquely identifies a row in a table.', true),
          ($1, 'What does SQL stand for?', '["Structured Query Language", "Strong Question Language", "Structured Query List", "Simple Query Language"]', 'Structured Query Language', 'SQL is a standard language for accessing databases.', false)`
          , [subId]
        );
      }
    }

    // 2. Target: Infosys Full Stack
    const infosysSubjects = [
      { name: 'JavaScript ES6+', w: 30 },
      { name: 'React.js', w: 30 },
      { name: 'Node.js/Express', w: 25 },
      { name: 'System Design', w: 15 }
    ];

    for (const sub of infosysSubjects) {
      const subRes = await this.query(
        `INSERT INTO exam_syllabus (target_goal, subject_name, weightage) VALUES ($1, $2, $3) RETURNING id`,
        ['Infosys Full Stack', sub.name, sub.w]
      );
      const subId = subRes.rows[0].id;

      if (sub.name === 'React.js') {
        await this.query(
          `INSERT INTO question_bank (subject_id, question, options_json, correct_answer, explanation, is_pyq) VALUES 
          ($1, 'Which hook is used to perform side effects in a functional component?', '["useState", "useEffect", "useContext", "useReducer"]', 'useEffect', 'useEffect is the hook for side effects like API calls and DOM manipulation.', true)`
          , [subId]
        );
      }
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('Database connection pool closed');
  }

  // Wrapper for executing raw queries
  async query(text: string, params?: any[]): Promise<QueryResult> {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      this.logger.debug(`Executed query: { text: ${text}, duration: ${duration}ms, rows: ${res.rowCount} }`);
      return res;
    } catch (error) {
      this.logger.error(`Error executing query: ${text}`, error);
      throw error;
    }
  }
}
