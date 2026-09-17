import { Controller, Post, Body, Get, Query, Req } from '@nestjs/common';
import { AiService } from './ai.service.js';
import { DatabaseService } from '../database/database.service.js';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly dbService: DatabaseService
  ) {}

  @Post('chat')
  async chat(@Body('message') message: string, @Body('history') history: any[]) {
    return this.aiService.chat(message, history);
  }

  @Post('speech')
  async speech(@Body('audioBase64') audioBase64: string, @Body('mimeType') mimeType: string) {
    if (!audioBase64) return { error: 'No audio provided' };
    return this.aiService.handleVoiceChat(audioBase64, mimeType || 'audio/m4a');
  }

  @Post('daily-plan')
  async getDailyPlan(@Body('userId') userId: number) {
    // Check if plan exists for today
    const existingPlan = await this.dbService.query(
      `SELECT plan_json FROM study_plans WHERE user_id = $1 AND date = CURRENT_DATE`,
      [userId]
    );

    if (existingPlan.rows.length > 0) {
      return existingPlan.rows[0].plan_json;
    }

    // Fetch user profile
    const profileRes = await this.dbService.query(`SELECT * FROM users WHERE id = $1`, [userId]);
    const profile = profileRes.rows[0] || {};

    // Generate new plan
    const newPlan = await this.aiService.generateDailyPlan(profile);

    // Save to DB
    await this.dbService.query(
      `INSERT INTO study_plans (user_id, plan_json) VALUES ($1, $2)`,
      [userId, JSON.stringify(newPlan)]
    );

    return newPlan;
  }

  @Get('study-plan')
  async getStudyPlan(
    @Query('level') level: string,
    @Query('exam') exam: string
  ) {
    return this.aiService.generateStudyPlan(level || 'beginner', exam || 'Information Assistant');
  }
}
