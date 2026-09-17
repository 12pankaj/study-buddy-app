import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class ExamService {
  constructor(private dbService: DatabaseService) {}

  async getSyllabus(targetGoal: string) {
    const res = await this.dbService.query(
      `SELECT * FROM exam_syllabus WHERE target_goal = $1 ORDER BY id ASC`,
      [targetGoal]
    );
    if (res.rows.length === 0) {
      throw new NotFoundException(`No syllabus found for goal: ${targetGoal}`);
    }
    return res.rows;
  }

  async getMockTest(subjectId: number) {
    const res = await this.dbService.query(
      `SELECT * FROM question_bank WHERE subject_id = $1 ORDER BY RANDOM() LIMIT 15`,
      [subjectId]
    );
    return res.rows;
  }
}
