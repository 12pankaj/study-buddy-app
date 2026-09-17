import { Controller, Get } from '@nestjs/common';
import { JobsService } from './jobs.service.js';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  async getJobs() {
    return this.jobsService.getAllJobs();
  }
}
