import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UserService } from './user.service.js';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile/:id')
  async getProfile(@Param('id') id: string) {
    return this.userService.getProfile(parseInt(id));
  }

  @Post('profile/:id')
  async updateProfile(@Param('id') id: string, @Body() body: any) {
    return this.userService.updateProfile(parseInt(id), body);
  }

  @Post('google-auth')
  async googleAuth(@Body() body: any) {
    return this.userService.googleAuth(body);
  }
}
