import { Controller, Get, Param, Query } from '@nestjs/common';
import { BranchesService } from './branches.service.js';

@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  async findAll(@Query('lang') lang?: string) {
    return this.branchesService.findAll(lang);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Query('lang') lang?: string) {
    return this.branchesService.findOne(id, lang);
  }
}
