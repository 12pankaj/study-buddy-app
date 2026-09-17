import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-otp')
  async requestOtp(@Body('email') email: string) {
    if (!email) {
      return { message: 'Email is required' };
    }
    return this.authService.requestOtp(email);
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body('email') email: string, 
    @Body('otp') otp: string
  ) {
    if (!email || !otp) {
      return { message: 'Email and OTP are required' };
    }
    return this.authService.verifyOtp(email, otp);
  }

  @Post('google')
  async googleLogin(@Body('idToken') idToken: string) {
    if (!idToken) {
      return { message: 'Google ID Token is required' };
    }
    return this.authService.googleLogin(idToken);
  }
}
