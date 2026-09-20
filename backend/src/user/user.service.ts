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

  async googleAuth(profileData: any) {
    const { email, name, google_id } = profileData;
    // Check if user exists
    let res = await this.dbService.query('SELECT * FROM users WHERE google_id = $1 OR email = $2', [google_id, email]);
    
    if (res.rows.length === 0) {
      // Create new user
      res = await this.dbService.query(
        `INSERT INTO users (phone, name, email, google_id) VALUES ($1, $2, $3, $4) RETURNING *`,
        ['GoogleUser_' + Date.now(), name, email, google_id]
      );
    } else {
      // Update google_id if matched by email but google_id is null
      if (!res.rows[0].google_id) {
        res = await this.dbService.query(
          `UPDATE users SET google_id = $1 WHERE email = $2 RETURNING *`,
          [google_id, email]
        );
      }
    }
    
    return res.rows[0];
  }
}
