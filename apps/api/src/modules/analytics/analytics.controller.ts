import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AnalyticsService } from './analytics.service.js';
import {
  AdminOverviewQueryDto,
  BranchOverviewQueryDto,
  TrackVisitDto,
} from './dto/analytics.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('track-visit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ghi nhận lượt truy cập trang (Public TrafficLog)' })
  async trackVisit(@Body() dto: TrackVisitDto) {
    return this.analyticsService.trackVisit(dto);
  }

  @Get('admin-overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Thống kê tổng quan toàn hệ thống cho Admin Dashboard (?range=7d|30d|90d)',
  })
  async getAdminOverview(@Query() query: AdminOverviewQueryDto) {
    return this.analyticsService.getAdminOverview(query);
  }

  @Get('branch-overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BRANCH_MANAGER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Thống kê vận hành theo chi nhánh cho Branch Manager / Admin (?range=7d|30d)',
  })
  async getBranchOverview(
    @Query() query: BranchOverviewQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.analyticsService.getBranchOverview(
      query,
      user.role as Role,
      user.branchId,
    );
  }
}
