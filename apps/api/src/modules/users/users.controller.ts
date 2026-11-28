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
import { UsersService } from './users.service.js';
import {
  CreateManagerDto,
  QueryUsersDto,
  UpdateProfileDto,
  UpdateUserBranchDto,
  UpdateUserStatusDto,
} from './dto/user.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Xem hồ sơ cá nhân & sổ địa chỉ của tài khoản hiện tại' })
  async getMyProfile(@CurrentUser('userId') userId: string) {
    return this.usersService.getMyProfile(userId);
  }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cập nhật họ tên, số điện thoại, sổ địa chỉ cá nhân' })
  async updateMyProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateMyProfile(userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Danh sách người dùng kèm tổng số đơn & tổng chi tiêu (ADMIN)',
  })
  async findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Post('managers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo tài khoản Quản lý chi nhánh mới (ADMIN)' })
  async createManager(@Body() dto: CreateManagerDto) {
    return this.usersService.createManager(dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Khóa / mở khóa tài khoản người dùng (ADMIN)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateStatus(id, dto);
  }

  @Patch(':id/branch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Đổi chi nhánh phụ trách cho Quản lý (ADMIN)' })
  async updateBranch(
    @Param('id') id: string,
    @Body() dto: UpdateUserBranchDto,
  ) {
    return this.usersService.updateBranch(id, dto);
  }
}
