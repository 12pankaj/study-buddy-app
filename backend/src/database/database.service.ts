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

    // Persistent Core Lessons & Quizzes Schema (NO DROP TABLE)
    const createLessonsTableQuery = `
      CREATE TABLE IF NOT EXISTS lessons (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        content TEXT,
        level VARCHAR(50) DEFAULT 'beginner',
        order_index INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createQuizzesTableQuery = `
      CREATE TABLE IF NOT EXISTS quizzes (
        id SERIAL PRIMARY KEY,
        lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'mcq',
        options JSONB NOT NULL,
        correct_answer VARCHAR(255) NOT NULL,
        explanation TEXT
      );
    `;

    const createUserProgressTableQuery = `
      CREATE TABLE IF NOT EXISTS user_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        lesson_id INTEGER,
        score INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT false,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, lesson_id)
      );
    `;

    await this.query(createLessonsTableQuery);
    await this.query(createQuizzesTableQuery);
    await this.query(createUserProgressTableQuery);

    // Create knowledge base tables
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
      await this.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);`);
      await this.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS education VARCHAR(255);`);
      await this.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS target_goals JSONB;`);
      await this.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS english_level VARCHAR(50);`);
      await this.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);`);
    } catch (e) { }

    this.logger.log('All Database tables checked/created safely');
    await this.seedInitialCourse();
    await this.seedExamContent();
  }

  async seedInitialCourse() {
    try {
      const res = await this.query('SELECT COUNT(*) FROM lessons');
      if (parseInt(res.rows[0].count) > 0) return;

      this.logger.log('Seeding Initial English Lessons and Quizzes...');

      const courseData = [
        {
          title: 'Chapter 1: Master the Basics (Nouns & Pronouns)',
          description: 'Build strong grammar foundations. Essential for clear sentence formation in English.',
          level: 'beginner',
          content: `
# Chapter 1: Master the Basics (Nouns & Pronouns)

Welcome to your first step toward complete English Fluency! To speak and write professional English, having a rock-solid foundation in grammar is non-negotiable.

## 1. Nouns (Naming Words)
A **Noun** is a word used to name a person, place, thing, or idea.
- **Common Noun:** A general name. Example: *laptop, city, programmer, company.*
- **Proper Noun:** A specific name (always starts with a capital letter). Example: *Pankaj, Jaipur, Google, Microsoft.*
- **Abstract Noun:** An idea, quality, or feeling you cannot physically touch. Example: *knowledge, success, happiness, integrity.*

## 2. Pronouns (Replacement Words)
A **Pronoun** takes the place of a noun to prevent repetitive, awkward phrasing.
- *Awkward:* "Pankaj is a coder. Pankaj loves Pankaj's laptop."
- *Professional:* "Pankaj is a coder. **He** loves **his** laptop."

### Important Pronoun Chart:
- **Subject Pronouns:** I, You, He, She, It, We, They. (Used as the doer of the action).
- **Object Pronouns:** Me, You, Him, Her, It, Us, Them. (Used as the receiver of the action).

**Key Takeaway:** Master subject-verb agreement with pronouns: "He writes code" vs "They write code".
          `.trim(),
          quizzes: [
            { q: 'Which of the following is a PROPER noun?', type: 'mcq', opts: ['server', 'database', 'Oracle', 'code'], ans: 'Oracle', exp: 'Oracle is a specific, capitalized corporate brand name.' },
            { q: 'Pankaj resolved the critical bug. ____ is an outstanding software engineer.', type: 'fill_in_the_blank', opts: ['He', 'She', 'It', 'They'], ans: 'He', exp: '"He" correctly replaces Pankaj as a male subject pronoun.' },
            { q: 'We need to deploy the application. Please send the credentials to ____.', type: 'fill_in_the_blank', opts: ['we', 'us', 'our', 'they'], ans: 'us', exp: '"Us" is the correct object pronoun for "We".' },
            { q: 'Which of these is an ABSTRACT noun?', type: 'mcq', opts: ['keyboard', 'success', 'mouse', 'monitor'], ans: 'success', exp: 'Success is an idea/concept that cannot be physically touched.' }
          ]
        },
        {
          title: 'Chapter 2: Master the Tenses (Time Travel)',
          description: 'Understand Present, Past, and Future tenses. Crucial for interview storytelling and project updates.',
          level: 'intermediate',
          content: `
# Chapter 2: Master the Tenses!

Tenses tell your listener **WHEN** an action happened. In technical interviews and standup meetings, accurate tenses are crucial for describing what you built and what you are doing now.

## 1. Present Tense (Habits & Current State)
- **Simple Present:** Used for daily routines and universal facts.
  - *Example:* "I **review** pull requests every morning."
- **Present Continuous:** An action occurring right now.
  - *Example:* "I **am optimizing** the database queries."

## 2. Past Tense (Completed Actions)
- **Simple Past:** Used for finished past actions. Always use V2 (second form of verb).
  - *Example:* "I **architected** a microservice yesterday." (Not 'architect')
- **Past Continuous:** Was happening in the past when another action occurred.
  - *Example:* "I **was running** the test suite when the power failed."

## 3. Future Tense (Commitments & Roadmap)
- **Simple Future:** Use 'will' + base verb.
  - *Example:* "We **will roll out** the patch tomorrow."

**Golden Rule:** Never say "Yesterday I go to office." Say "Yesterday I **went** to office."
          `.trim(),
          quizzes: [
            { q: 'Yesterday, our team ____ a new API gateway for the app.', type: 'fill_in_the_blank', opts: ['create', 'created', 'will create', 'creating'], ans: 'created', exp: 'Because "Yesterday" denotes a finished past action, use the simple past (created).' },
            { q: 'Right now, the background worker ____ without errors.', type: 'mcq', opts: ['run', 'ran', 'is running', 'will run'], ans: 'is running', exp: '"Right now" specifies an ongoing action in the present continuous tense.' },
            { q: 'I ____ complete this feature by tomorrow evening.', type: 'fill_in_the_blank', opts: ['am', 'was', 'will', 'have'], ans: 'will', exp: 'Tomorrow indicates future intent, so "will" is required.' },
            { q: 'Every morning, the engineer ____ his emails before coding.', type: 'fill_in_the_blank', opts: ['checking', 'checks', 'checked', 'is check'], ans: 'checks', exp: 'For third-person singular daily routines, add "s/es" (checks).' },
            { q: 'While I ____ the build, my workstation rebooted.', type: 'mcq', opts: ['am running', 'was running', 'runs', 'will run'], ans: 'was running', exp: 'Past continuous (was running) describes an interrupted past action.' }
          ]
        },
        {
          title: 'Chapter 3: Corporate IT Vocabulary & Communication',
          description: 'Learn the exact words and phrases used in corporate tech environments, sprint planning, and client calls.',
          level: 'advanced',
          content: `
# Chapter 3: Corporate IT Vocabulary & Communication

To sound like a senior software professional, use standard corporate phrasing in your emails, stand-up meetings, and client calls.

## Key Professional Phrases:
1. **"Reach out"** instead of "Contact".
   - *Example:* "Please reach out to the DevOps team regarding CI/CD access."
2. **"Bandwidth"** instead of "Time/Free time".
   - *Example:* "I don't have the bandwidth to take on an extra ticket this sprint."
3. **"Sync up"** instead of "Meet/Call".
   - *Example:* "Let's sync up for 10 minutes at 4 PM to align on the architecture."
4. **"Deploy / Push"** instead of "Put on live server".
   - *Example:* "We will push the release build after automated QA passes."
5. **"Blocker"** instead of "Big problem preventing work".
   - *Example:* "The missing API credentials are a blocker for my milestone."

## Professional Email Etiquette:
- Open with: "Hi Team," or "Dear [Name],"
- State the objective clearly in the first two sentences.
- End with: "Best regards," or "Thanks & regards,".
          `.trim(),
          quizzes: [
            { q: 'In a sprint meeting, what professional term signifies that you do not have sufficient time/capacity?', type: 'mcq', opts: ['No clock', 'No bandwidth', 'Zero space', 'Empty battery'], ans: 'No bandwidth', exp: 'Bandwidth is standard corporate jargon for capacity/availability.' },
            { q: "Let's ____ at 3 PM to align on the architectural roadmap.", type: 'fill_in_the_blank', opts: ['sync up', 'fight', 'shout', 'run around'], ans: 'sync up', exp: '"Sync up" is the professional phrase for meeting to align on topics.' },
            { q: 'The third-party payment gateway downtime is a critical ____ for our release.', type: 'fill_in_the_blank', opts: ['helper', 'blocker', 'runner', 'booster'], ans: 'blocker', exp: 'A blocker is an obstacle preventing progress.' },
            { q: 'I will ____ to the customer success team regarding user feedback.', type: 'fill_in_the_blank', opts: ['reach out', 'run out', 'cry out', 'fall out'], ans: 'reach out', exp: '"Reach out" is professional for contacting someone.' }
          ]
        },
        {
          title: 'Chapter 4: Cracking the Technical Interview in English',
          description: 'Master the STAR method and confident technical explanations for HR and technical interviewers.',
          level: 'advanced',
          content: `
# Chapter 4: Cracking the Technical Interview in English

Technical interviews test not just your coding ability, but how clearly and logically you articulate your solutions.

## The STAR Method for Behavioral & Experience Questions:
- **S (Situation):** Set the context ("In my previous project, we had high latency...").
- **T (Task):** Explain the challenge ("My goal was to reduce query response time...").
- **A (Action):** Detail your specific actions ("I implemented Redis caching and indexed foreign keys...").
- **R (Result):** Quantify the positive outcome ("This lowered latency by 45%...").

## Articulating Code Solutions:
- Avoid saying: "I write this loop, then it does that thing."
- Instead say: "I iterate over the collection with O(N) linear time complexity to aggregate the results."
- Always speak at a measured pace and make polite transitions: "Allow me to walk you through my thought process."
          `.trim(),
          quizzes: [
            { q: 'What does the "STAR" interview technique stand for?', type: 'mcq', opts: ['Situation, Task, Action, Result', 'Standard, Test, Analyze, Review', 'Scope, Time, Action, Report', 'Speed, Talent, Ability, React'], ans: 'Situation, Task, Action, Result', exp: 'STAR stands for Situation, Task, Action, and Result.' },
            { q: 'When explaining code complexity, which description sounds most professional?', type: 'mcq', opts: ['It runs fast enough', 'The algorithm achieves O(N log N) time complexity with constant space', 'It loops around and does stuff', 'Code is very quick'], ans: 'The algorithm achieves O(N log N) time complexity with constant space', exp: 'Clear, standardized asymptotic notation conveys strong technical competence.' },
            { q: 'Which polite phrase helps introduce your algorithmic explanation?', type: 'mcq', opts: ['Look at this now', 'Allow me to walk you through my thought process', 'You need to see my code', 'This is simple'], ans: 'Allow me to walk you through my thought process', exp: 'This phrase is respectful, structured, and confident.' }
          ]
        }
      ];

      for (const chapter of courseData) {
        const lessonRes = await this.query(
          `INSERT INTO lessons (title, description, content, level, order_index) 
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [chapter.title, chapter.description, chapter.content, chapter.level, chapter.quizzes.length]
        );
        const lessonId = lessonRes.rows[0].id;

        for (const q of chapter.quizzes) {
          await this.query(
            `INSERT INTO quizzes (lesson_id, question, type, options, correct_answer, explanation) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [lessonId, q.q, q.type, JSON.stringify(q.opts), q.ans, q.exp]
          );
        }
      }
      this.logger.log('Initial English course seeded successfully!');
    } catch (err: any) {
      this.logger.error('Failed to seed initial course: ' + (err?.message || err));
    }
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
          ($1, 'What does SQL stand for?', '["Structured Query Language", "Strong Question Language", "Structured Query List", "Simple Query Language"]', 'Structured Query Language', 'SQL is a standard language for accessing databases.', false),
          ($1, 'Which normal form eliminates partial dependency?', '["1NF", "2NF", "3NF", "BCNF"]', '2NF', 'Second Normal Form (2NF) removes partial dependencies on a composite primary key.', true)`
          , [subId]
        );
      } else if (sub.name === 'Programming (Java)') {
        await this.query(
          `INSERT INTO question_bank (subject_id, question, options_json, correct_answer, explanation, is_pyq) VALUES 
          ($1, 'Which Java feature prevents memory leaks by reclaiming unused objects?', '["Garbage Collector", "JVM Compiler", "ClassLoader", "Security Manager"]', 'Garbage Collector', 'Garbage Collector automatically deallocates heap memory of unreferenced objects.', true),
          ($1, 'Can an interface in Java 8 have method implementations?', '["No, never", "Yes, using default or static keywords", "Only abstract methods allowed", "Only final methods allowed"]', 'Yes, using default or static keywords', 'Java 8 introduced default and static methods in interfaces.', false)`
          , [subId]
        );
      } else if (sub.name === 'Networking') {
        await this.query(
          `INSERT INTO question_bank (subject_id, question, options_json, correct_answer, explanation, is_pyq) VALUES 
          ($1, 'Which layer in the OSI model is responsible for end-to-end reliability and flow control?', '["Network Layer", "Transport Layer", "Data Link Layer", "Session Layer"]', 'Transport Layer', 'The Transport layer (TCP/UDP) handles end-to-end transmission and reliability.', true),
          ($1, 'What is the default port for HTTPS protocol?', '["80", "8080", "443", "22"]', '443', 'HTTPS operates over port 443 by default.', false)`
          , [subId]
        );
      } else if (sub.name === 'Computer Fundamentals') {
        await this.query(
          `INSERT INTO question_bank (subject_id, question, options_json, correct_answer, explanation, is_pyq) VALUES 
          ($1, 'What type of memory is volatile and loses its contents when power is turned off?', '["ROM", "RAM", "Hard Disk", "Flash Storage"]', 'RAM', 'RAM (Random Access Memory) is volatile primary memory.', true)`
          , [subId]
        );
      } else if (sub.name === 'Software Engineering') {
        await this.query(
          `INSERT INTO question_bank (subject_id, question, options_json, correct_answer, explanation, is_pyq) VALUES 
          ($1, 'In Agile methodology, what is the term for a short, time-boxed period of development?', '["Milestone", "Sprint", "Water-cycle", "Epic"]', 'Sprint', 'A sprint is a fixed duration iteration (usually 1-4 weeks) in Scrum/Agile.', true)`
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
          ($1, 'Which hook is used to perform side effects in a functional component?', '["useState", "useEffect", "useContext", "useReducer"]', 'useEffect', 'useEffect is the hook for side effects like API calls and DOM manipulation.', true),
          ($1, 'What is the purpose of React.memo?', '["To mutate state directly", "To prevent unnecessary re-renders of functional components", "To bind event handlers", "To manage global store"]', 'To prevent unnecessary re-renders of functional components', 'React.memo is a higher-order component that memoizes component rendering.', false)`
          , [subId]
        );
      } else if (sub.name === 'JavaScript ES6+') {
        await this.query(
          `INSERT INTO question_bank (subject_id, question, options_json, correct_answer, explanation, is_pyq) VALUES 
          ($1, 'What is the output of typeof NaN in JavaScript?', '["nan", "number", "undefined", "object"]', 'number', 'In JavaScript specifications, NaN is of type number.', true),
          ($1, 'Which keyword creates a block-scoped, reassignable variable?', '["var", "let", "const", "def"]', 'let', 'let is block-scoped and allows reassignment.', false)`
          , [subId]
        );
      } else if (sub.name === 'Node.js/Express') {
        await this.query(
          `INSERT INTO question_bank (subject_id, question, options_json, correct_answer, explanation, is_pyq) VALUES 
          ($1, 'Which Node.js core library handles asynchronous I/O via the Event Loop?', '["libuv", "v8", "http-parser", "zlib"]', 'libuv', 'libuv is the multi-platform C library providing the event loop and async I/O in Node.js.', true),
          ($1, 'In Express middleware, which function must be called to pass control to the next handler?', '["continue()", "next()", "proceed()", "done()"]', 'next()', 'Calling next() invokes the subsequent middleware in the stack.', false)`
          , [subId]
        );
      } else if (sub.name === 'System Design') {
        await this.query(
          `INSERT INTO question_bank (subject_id, question, options_json, correct_answer, explanation, is_pyq) VALUES 
          ($1, 'According to the CAP theorem, which property guarantees that every read receives the most recent write?', '["Consistency", "Availability", "Partition Tolerance", "Durability"]', 'Consistency', 'Consistency ensures all clients see the same data at the same time.', true)`
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
