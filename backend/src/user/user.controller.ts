import { Controller, Get, Put, Body, Param } from '@nestjs/common';
import { UserService } from './user.service.js';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Put('profile/:id')
  async updateProfile(@Param('id') id: string, @Body() profileData: any) {
    return this.userService.updateProfile(parseInt(id), profileData);
  }

  @Get('profile/:id')
  async getProfile(@Param('id') id: string) {
    return this.userService.getProfile(parseInt(id));
  }
}
