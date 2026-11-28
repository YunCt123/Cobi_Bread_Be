import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { BranchesService } from './branches.service.js';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@ApiTags('Branches')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách chi nhánh (hỗ trợ song ngữ ?lang=vi|en)' })
  @ApiQuery({ name: 'lang', required: false, enum: ['vi', 'en'] })
  async findAll(@Query('lang') lang?: string) {
    return this.branchesService.findAll(lang);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết chi nhánh theo ID' })
  @ApiQuery({ name: 'lang', required: false, enum: ['vi', 'en'] })
  async findOne(@Param('id') id: string, @Query('lang') lang?: string) {
    return this.branchesService.findOne(id, lang);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo chi nhánh mới (ADMIN)' })
  async create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật thông tin chi nhánh (ADMIN)' })
  async update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa chi nhánh chưa phát sinh dữ liệu (ADMIN)' })
  async remove(@Param('id') id: string) {
    return this.branchesService.remove(id);
  }
}
