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
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { QueryOrdersDto } from './dto/query-orders.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { BranchScopeGuard } from '../../common/guards/branch-scope.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly jwtService: JwtService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Body() dto: CreateOrderDto, @Req() req: Request) {
    let userId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded: any = this.jwtService.decode(token);
        userId = decoded?.sub ?? decoded?.userId ?? null;
      } catch {
        userId = null;
      }
    }

    return this.ordersService.createOrder(dto, userId);
  }

  @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  async getMyOrders(@CurrentUser('userId') userId: string) {
    return this.ordersService.getMyOrders(userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, BranchScopeGuard)
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  async findAll(
    @Query() query: QueryOrdersDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.ordersService.findAll(
      query,
      user.role as Role,
      user.branchId,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.ordersService.findOne(
      id,
      user.role as Role,
      user.userId,
      user.branchId,
    );
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.ordersService.updateStatus(
      id,
      dto,
      user.role as Role,
      user.userId,
      user.branchId,
    );
  }
}
