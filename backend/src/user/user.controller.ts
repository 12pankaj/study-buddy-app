import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { UserService } from './user.service.js';
import { AuthService } from '../auth/auth.service.js';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Get('profile/:id')
  async getProfile(@Param('id') id: string) {
    return this.userService.getProfile(parseInt(id));
  }

  @Post('profile/:id')
  async updateProfile(@Param('id') id: string, @Body() body: any) {
    return this.userService.updateProfile(parseInt(id), body);
  }

  @Post('google-auth')
  async googleAuth(@Body('idToken') idToken: string) {
    if (!idToken) {
      throw new HttpException('Google ID Token is required for authentication', HttpStatus.BAD_REQUEST);
    }
    return this.authService.googleLogin(idToken);
  }
}
