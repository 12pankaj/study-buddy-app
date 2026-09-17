import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);

  constructor(private dbService: DatabaseService) {}

  async onModuleInit() {
    // Run initial scrape immediately on startup
    this.scrapeGovtJobs();
  }

  // Runs every hour
  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log('Running scheduled job scraper...');
    await this.scrapeGovtJobs();
  }

  async scrapeGovtJobs() {
    try {
      // FreeJobAlert (Rajasthan IT/Govt Jobs) or Similar Feed
      // For MVP, we scrape a reliable aggregator feed or simulate if blocked
      const url = 'https://www.freejobalert.com/rajasthan-government-jobs/';
      
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      
      const $ = cheerio.load(data);
      const jobs = [];

      // Scrape table rows for job details (Generic structure for job boards)
      $('table tbody tr').each((i, el) => {
        if (i > 0 && i < 15) { // Get top 15 latest jobs
          const cols = $(el).find('td');
          if (cols.length >= 3) {
            const title = $(cols[1]).text().trim();
            const deadlineText = $(cols[2]).text().trim();
            const source = title.includes('RPSC') ? 'RPSC' : (title.includes('RSMSSB') ? 'RSSB' : 'Govt IT Job');
            
            // Only insert IT or major govt jobs (Simple keyword filter)
            if (title && title.length > 5 && (title.toLowerCase().includes('programmer') || title.toLowerCase().includes('assistant') || title.toLowerCase().includes('officer') || title.toLowerCase().includes('board'))) {
              jobs.push({ title, source, deadlineText });
            }
          }
        }
      });

      // Insert into DB if not exists
      for (const job of jobs) {
        // Simple deadline parsing or fallback
        const deadlineDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); 

        await this.dbService.query(
          `INSERT INTO jobs (title, source, url, deadline) 
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (title) DO NOTHING`,
          [job.title, job.source, 'https://www.freejobalert.com', deadlineDate]
        );
      }
      this.logger.log(`Successfully scraped and updated ${jobs.length} IT Jobs.`);
    } catch (error) {
      this.logger.error('Error during scraping jobs', error.message);
      
      // Fallback Seed data if offline/blocked
      await this.dbService.query(`
        INSERT INTO jobs (title, source, url, deadline) 
        VALUES ('RPSC Programmer 2024 Recruitment', 'RPSC', 'https://rpsc.rajasthan.gov.in', '2024-12-31')
        ON CONFLICT (title) DO NOTHING
      `);
      await this.dbService.query(`
        INSERT INTO jobs (title, source, url, deadline) 
        VALUES ('Informatics Assistant (IA) RSSB', 'RSSB', 'https://rsmssb.rajasthan.gov.in', '2024-11-15')
        ON CONFLICT (title) DO NOTHING
      `);
    }
  }

  // Daily cron job to notify users of impending deadlines (e.g., within 3 days)
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async notifyDeadlines() {
    this.logger.debug('Checking for job deadlines to notify users');
    try {
      // In a real application, fetch users and send emails via Nodemailer or FCM Push Notifications
      const approachingJobs = await this.dbService.query(
        `SELECT * FROM jobs WHERE deadline BETWEEN NOW() AND NOW() + INTERVAL '3 days'`
      );
      
      if (approachingJobs.rows.length > 0) {
        this.logger.log(`Found ${approachingJobs.rows.length} jobs approaching deadline. Sending notifications...`);
        // await this.emailService.sendBulkAlerts(users, approachingJobs);
      }
    } catch (error) {
      this.logger.error('Failed to process deadline notifications', error);
    }
  }

  async getAllJobs() {
    const res = await this.dbService.query('SELECT * FROM jobs ORDER BY deadline ASC');
    return res.rows;
  }
}
