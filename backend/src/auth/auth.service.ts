import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service.js';
import * as nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private transporter: nodemailer.Transporter;
  private googleClient: OAuth2Client;

  constructor(
    private readonly dbService: DatabaseService,
    private configService: ConfigService,
  ) {
    // Setup Nodemailer Transporter
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('EMAIL_HOST'),
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_PASS'),
      },
    });

    // Setup Google Client
    this.googleClient = new OAuth2Client(
      this.configService.get('GOOGLE_CLIENT_ID')
    );
  }

  // Generate 4-digit OTP
  private generateOtp(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  async requestOtp(email: string) {
    const otp = this.generateOtp();
    
    await this.dbService.query(
      `INSERT INTO otps (email, otp_code) VALUES ($1, $2)`,
      [email, otp]
    );

    try {
      await this.transporter.sendMail({
        from: `"StudyBuddy" <${this.configService.get('EMAIL_USER')}>`,
        to: email,
        subject: 'Your Login OTP - StudyBuddy',
        text: `Your OTP is ${otp}. It will expire soon.`,
        html: `<b>Your OTP is ${otp}</b>. It will expire soon.`,
      });
      this.logger.log(`OTP sent to ${email}`);
      return { message: 'OTP sent successfully' };
    } catch (error) {
      this.logger.error('Failed to send email', error);
      this.logger.log(`[DEV MODE] OTP generated for ${email}: ${otp}`);
      return { message: 'OTP generated (Check server logs)' }; 
    }
  }

  async verifyOtp(email: string, otp: string) {
    const res = await this.dbService.query(
      `SELECT * FROM otps WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
      [email]
    );

    if (res.rows.length === 0 || res.rows[0].otp_code !== otp) {
      throw new HttpException('Invalid OTP', HttpStatus.UNAUTHORIZED);
    }

    const userRes = await this.dbService.query(`SELECT * FROM users WHERE email = $1`, [email]);
    let user;
    if (userRes.rows.length === 0) {
      const newUser = await this.dbService.query(
        `INSERT INTO users (email, auth_provider) VALUES ($1, 'email') RETURNING *`,
        [email]
      );
      user = newUser.rows[0];
    } else {
      user = userRes.rows[0];
    }

    await this.dbService.query(`DELETE FROM otps WHERE email = $1`, [email]);

    return { message: 'Login successful', user: { id: user.id, email: user.email } };
  }

  async googleLogin(idToken: string) {
    try {
      const clientId = this.configService.get('GOOGLE_CLIENT_ID');
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: clientId || undefined,
      });
      
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new HttpException('No email found in Google token payload', HttpStatus.BAD_REQUEST);
      }
      const email = payload.email.toLowerCase();
      const name = payload.name || 'Google User';
      const googleId = payload.sub;

      const userRes = await this.dbService.query(`SELECT * FROM users WHERE email = $1`, [email]);
      let user;
      
      if (userRes.rows.length === 0) {
        // Register new verified Google user
        const newUser = await this.dbService.query(
          `INSERT INTO users (email, name, google_id, auth_provider) VALUES ($1, $2, $3, 'google') RETURNING *`,
          [email, name, googleId]
        );
        user = newUser.rows[0];
      } else {
        user = userRes.rows[0];
        if (!user.google_id && googleId) {
          await this.dbService.query(`UPDATE users SET google_id = $1 WHERE id = $2`, [googleId, user.id]);
          user.google_id = googleId;
        }
      }

      return { 
        message: 'Google Login successful', 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        target_goals: user.target_goals,
        user: { id: user.id, email: user.email, name: user.name, target_goals: user.target_goals } 
      };
    } catch (error: any) {
      this.logger.error('Google token cryptographic verification failed', error?.message || error);
      throw new HttpException('Invalid Google Token: Signature verification failed', HttpStatus.UNAUTHORIZED);
    }
  }
}
