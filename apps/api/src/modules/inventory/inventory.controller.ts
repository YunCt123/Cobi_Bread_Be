import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { InventoryService } from './inventory.service.js';
import { QueryBatchesDto } from './dto/query-batches.dto.js';
import { CreateBatchDto } from './dto/create-batch.dto.js';
import { UpdateBatchDto } from './dto/update-batch.dto.js';
import { AvailabilityQueryDto } from './dto/availability-query.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { BranchScopeGuard } from '../../common/guards/branch-scope.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('availability')
  @ApiOperation({
    summary:
      'Kiểm tra tồn kho khả dụng (chưa hết hạn) của sản phẩm tại chi nhánh (Public)',
  })
  async getAvailability(@Query() query: AvailabilityQueryDto) {
    return this.inventoryService.getAvailability(query);
  }

  @Get('batches')
  @UseGuards(JwtAuthGuard, RolesGuard, BranchScopeGuard)
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Danh sách lô hàng FEFO (hỗ trợ lọc branchId, productId, expiringWithinDays)',
  })
  async findBatches(
    @Query() query: QueryBatchesDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inventoryService.findBatches(
      query,
      user.role as Role,
      user.branchId,
    );
  }

  @Post('batches')
  @UseGuards(JwtAuthGuard, RolesGuard, BranchScopeGuard)
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Nhập lô hàng tồn kho mới (ADMIN / BRANCH_MANAGER)' })
  async createBatch(
    @Body() dto: CreateBatchDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inventoryService.createBatch(
      dto,
      user.role as Role,
      user.branchId,
    );
  }

  @Patch('batches/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, BranchScopeGuard)
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cập nhật số lượng hoặc hạn dùng lô hàng (ADMIN / BRANCH_MANAGER)',
  })
  async updateBatch(
    @Param('id') id: string,
    @Body() dto: UpdateBatchDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inventoryService.updateBatch(
      id,
      dto,
      user.role as Role,
      user.branchId,
    );
  }
}
