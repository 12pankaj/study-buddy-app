import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private dbService: DatabaseService) {}

  async updateProfile(userId: number, profileData: any) {
    const { name, education, target_goals, english_level } = profileData;
    
    // target_goals is passed as an array, store as JSON
    const res = await this.dbService.query(
      `UPDATE users 
       SET name = $1, education = $2, target_goals = $3, english_level = $4 
       WHERE id = $5 RETURNING *`,
      [name, education, JSON.stringify(target_goals), english_level, userId]
    );

    return res.rows[0];
  }

  async getProfile(userId: number) {
    const res = await this.dbService.query(`SELECT id, email, name, education, target_goals, english_level FROM users WHERE id = $1`, [userId]);
    return res.rows[0];
  }
}
