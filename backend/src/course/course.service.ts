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
    await this.seedInitialCourseContent();
  }

  async seedInitialCourseContent() {
    await this.dbService.query(`DELETE FROM user_progress`);
    await this.dbService.query(`DELETE FROM quizzes`);
    await this.dbService.query(`DELETE FROM lessons`);

    this.logger.log('Seeding Comprehensive English Course Book Content...');
    
    const courseData = [
      {
        title: 'Chapter 1: The Foundation - Nouns & Pronouns',
        description: 'Learn the very basics of naming words and their replacements to build a strong foundation.',
        level: 'beginner',
        content: `
# Welcome to Chapter 1: Nouns & Pronouns!

To speak fluent English, you must know what things are called and how to refer to them without repeating their names.

## 1. Nouns (Naming Words)
A **Noun** is a word used to name a person, place, thing, or idea.
- **Common Noun:** A general name. Example: *laptop, city, programmer, company.*
- **Proper Noun:** A specific name (always starts with a capital letter). Example: *Pankaj, Jaipur, Google, Microsoft.*
- **Abstract Noun:** An idea or feeling you cannot touch. Example: *knowledge, success, happiness.*

## 2. Pronouns (Replacement Words)
A **Pronoun** takes the place of a noun. If we don't use pronouns, we sound like robots!
- *Bad:* "Pankaj is a coder. Pankaj loves Pankaj's laptop."
- *Good:* "Pankaj is a coder. **He** loves **his** laptop."

**Important Subject Pronouns:** I, You, He, She, It, We, They.
**Important Object Pronouns:** Me, You, Him, Her, It, Us, Them.

Study this well! Your test below will check if your foundation is strong.
        `.trim(),
        quizzes: [
          { q: 'Which of the following is a PROPER noun?', type: 'mcq', opts: ['server', 'database', 'Oracle', 'code'], ans: 'Oracle', exp: 'Oracle is a specific company name.' },
          { q: 'Pankaj fixed the bug. ____ is a great developer.', type: 'fill_in_the_blank', opts: ['He', 'She', 'It', 'They'], ans: 'He', exp: 'He replaces Pankaj (male).' },
          { q: 'We need to deploy the application. Please send it to ____.', type: 'fill_in_the_blank', opts: ['we', 'us', 'our', 'they'], ans: 'us', exp: 'Us is the object pronoun for We.' },
          { q: 'Which of these is an ABSTRACT noun?', type: 'mcq', opts: ['keyboard', 'success', 'mouse', 'office'], ans: 'success', exp: 'Success is an idea/concept you cannot physically touch.' }
        ]
      },
      {
        title: 'Chapter 2: Master the Tenses (Time Travel)',
        description: 'Understand Present, Past, and Future tenses. Crucial for telling interviewers what you DID and what you CAN DO.',
        level: 'intermediate',
        content: `
# Chapter 2: Master the Tenses!

Tenses tell us **WHEN** an action happened. In IT interviews, you need perfect tenses to explain your past projects and future goals.

## 1. Present Tense (Happening Now / Routine)
- **Simple Present:** Facts, habits, routines. 
  - *Example:* "I **write** code every day."
- **Present Continuous:** Happening exactly right now.
  - *Example:* "I **am fixing** a bug right now."

## 2. Past Tense (Finished Actions)
- **Simple Past:** Completed action in the past. Always use the 2nd form of the verb (V2).
  - *Example:* "I **developed** an app yesterday." (Not 'develop')
- **Past Continuous:** Was happening in the past when something else happened.
  - *Example:* "I **was debugging** when the server crashed."

## 3. Future Tense (Yet to Happen)
- **Simple Future:** Use 'will' or 'shall'.
  - *Example:* "I **will learn** React Native tomorrow."

**Pro Tip:** Never mix Past and Present incorrectly. Don't say "Yesterday I go to office." Say "Yesterday I **went** to office."
        `.trim(),
        quizzes: [
          { q: 'Yesterday, I ____ a new API for the mobile app.', type: 'fill_in_the_blank', opts: ['create', 'created', 'will create', 'creating'], ans: 'created', exp: 'Because of "Yesterday", use past tense (created).' },
          { q: 'Right now, the server ____ normally.', type: 'mcq', opts: ['run', 'ran', 'is running', 'will run'], ans: 'is running', exp: '"Right now" indicates Present Continuous tense.' },
          { q: 'I ____ complete this task by tomorrow evening.', type: 'fill_in_the_blank', opts: ['am', 'was', 'will', 'have'], ans: 'will', exp: 'Tomorrow indicates future tense (will).' },
          { q: 'Every morning, I ____ my emails first.', type: 'fill_in_the_blank', opts: ['checking', 'check', 'checked', 'am check'], ans: 'check', exp: 'For daily routines, use Simple Present (check).' },
          { q: 'While I ____ the code, my laptop shut down.', type: 'mcq', opts: ['am compiling', 'was compiling', 'compile', 'will compile'], ans: 'was compiling', exp: 'Past continuous (was compiling) is used for an ongoing past action interrupted by another.' }
        ]
      },
      {
        title: 'Chapter 3: IT Professional Vocabulary',
        description: 'Learn the exact words and phrases used in corporate IT environments and emails.',
        level: 'advanced',
        content: `
# Chapter 3: Corporate IT Vocabulary

To sound like a professional software engineer, you need to use the right vocabulary in your emails and stand-up meetings.

## Key Professional Phrases:
1. **"Reach out"** instead of "Contact".
   - *Example:* "Please reach out to the backend team."
2. **"Bandwidth"** instead of "Time/Energy".
   - *Example:* "I don't have the bandwidth to take this new task today."
3. **"Sync up"** instead of "Meet".
   - *Example:* "Let's sync up at 4 PM to discuss the bug."
4. **"Deploy / Push"** instead of "Put on live".
   - *Example:* "I will push the code to production tonight."
5. **"Blocker"** instead of "Big problem stopping me".
   - *Example:* "The database error is a blocker for my current ticket."

## Email Etiquette:
Always start with polite greetings like "Hi Team," or "Dear Manager,".
End with "Best regards," or "Thanks,".
        `.trim(),
        quizzes: [
          { q: 'In a meeting, instead of saying "I don\'t have time", what professional word can you use?', type: 'mcq', opts: ['No clock', 'Zero space', 'No bandwidth', 'Empty slot'], ans: 'No bandwidth', exp: 'Bandwidth is a professional term for having the capacity/time to do work.' },
          { q: 'Let\'s ____ at 3 PM to discuss the project requirements.', type: 'fill_in_the_blank', opts: ['sync up', 'fight', 'shout', 'sleep'], ans: 'sync up', exp: '"Sync up" is standard corporate jargon for meeting to align on topics.' },
          { q: 'The server crash is a major ____ for our release.', type: 'fill_in_the_blank', opts: ['helper', 'blocker', 'runner', 'jumper'], ans: 'blocker', exp: 'A blocker is an issue that prevents progress.' },
          { q: 'I will ____ to the client to ask for the API keys.', type: 'fill_in_the_blank', opts: ['reach out', 'run out', 'cry out', 'shout out'], ans: 'reach out', exp: 'Reach out is a professional way of saying "contact".' }
        ]
      }
    ];

    let orderIndex = 1;
    for (const chapter of courseData) {
      const lessonRes = await this.dbService.query(
        `INSERT INTO lessons (title, description, content, level, order_index) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [chapter.title, chapter.description, chapter.content, chapter.level, orderIndex++]
      );
      const lessonId = lessonRes.rows[0].id;

      for (const q of chapter.quizzes) {
        await this.dbService.query(
          `INSERT INTO quizzes (lesson_id, question, type, options, correct_answer, explanation) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [lessonId, q.q, q.type, JSON.stringify(q.opts), q.ans, q.exp]
        );
      }
    }
  }

  async getLessons() {
    const res = await this.dbService.query(`SELECT * FROM lessons ORDER BY order_index ASC`);
    return res.rows;
  }

  async getQuizzes(lessonId: number) {
    const res = await this.dbService.query(`SELECT * FROM quizzes WHERE lesson_id = $1`, [lessonId]);
    return res.rows;
  }

  async submitQuiz(userId: number, lessonId: number, score: number) {
    await this.dbService.query(
      `INSERT INTO user_progress (user_id, lesson_id, score, completed) 
       VALUES ($1, $2, $3, TRUE) 
       ON CONFLICT (user_id, lesson_id) 
       DO UPDATE SET score = EXCLUDED.score, completed = TRUE`,
      [userId, lessonId, score]
    );
    return { success: true, score };
  }

  async analyzeMistakes(mistakes: any[]) {
    // Format mistakes for AI
    const prompt = `A student made the following mistakes in an English quiz. Explain their mistakes briefly and give them a tip to improve:\n` + 
      mistakes.map(m => `Q: ${m.question}\nTheir Answer: ${m.userAnswer}\nCorrect Answer: ${m.correctAnswer}`).join('\n\n');
    
    // Use AiService (Gemini) to generate feedback
    const response = await this.aiService.chat(prompt);
    return { feedback: response.response };
  }
}
