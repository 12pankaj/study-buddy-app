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
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.configService.get('GOOGLE_CLIENT_ID'),
      });
      
      const payload = ticket.getPayload();
      const email = payload.email;
      const name = payload.name;

      if (!email) {
        throw new HttpException('No email found in Google payload', HttpStatus.BAD_REQUEST);
      }

      const userRes = await this.dbService.query(`SELECT * FROM users WHERE email = $1`, [email]);
      let user;
      
      if (userRes.rows.length === 0) {
        // Register new Google user
        const newUser = await this.dbService.query(
          `INSERT INTO users (email, name, auth_provider) VALUES ($1, $2, 'google') RETURNING *`,
          [email, name]
        );
        user = newUser.rows[0];
      } else {
        user = userRes.rows[0];
      }

      return { message: 'Google Login successful', user: { id: user.id, email: user.email, name: user.name } };
    } catch (error) {
      this.logger.error('Google token verification failed', error);
      throw new HttpException('Invalid Google Token', HttpStatus.UNAUTHORIZED);
    }
  }
}
