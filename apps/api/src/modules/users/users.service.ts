import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { OrderStatus, Prisma, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateManagerDto,
  QueryUsersDto,
  UpdateProfileDto,
  UpdateUserBranchDto,
  UpdateUserStatusDto,
} from './dto/user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryUsersDto) {
    const { role, search, page = 1, limit = 20 } = query;

    const where: Prisma.UserWhereInput = {};

    if (role) {
      where.role = role;
    }

    if (search && search.trim() !== '') {
      const term = search.trim();
      where.OR = [
        { email: { contains: term, mode: 'insensitive' } },
        { fullName: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          isActive: true,
          addresses: true,
          role: true,
          branchId: true,
          branch: {
            select: {
              id: true,
              name: true,
              nameEn: true,
              city: true,
              cityEn: true,
            },
          },
          orders: {
            select: {
              status: true,
              totalAmount: true,
            },
          },
          createdAt: true,
        },
      }),
    ]);

    const data = users.map((u) => {
      const totalOrders = u.orders.length;
      const totalSpent = u.orders
        .filter((o) => o.status !== OrderStatus.CANCELLED)
        .reduce((sum, o) => sum + o.totalAmount, 0);

      const { orders: _, ...userWithoutOrders } = u;

      return {
        ...userWithoutOrders,
        totalOrders,
        totalSpent,
      };
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createManager(dto: CreateManagerDto) {
    const email = dto.email.toLowerCase().trim();

    const [existingUser, branch] = await Promise.all([
      this.prisma.user.findUnique({ where: { email } }),
      this.prisma.branch.findUnique({ where: { id: dto.branchId } }),
    ]);

    if (existingUser) {
      throw new ConflictException(`Email '${email}' đã tồn tại trong hệ thống`);
    }

    if (!branch) {
      throw new NotFoundException(
        `Không tìm thấy chi nhánh với ID: ${dto.branchId}`,
      );
    }

    const rawPassword = dto.password?.trim() || '123456';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: dto.fullName.trim(),
        phone: dto.phone?.trim() || null,
        role: Role.BRANCH_MANAGER,
        branchId: dto.branchId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        isActive: true,
        role: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            city: true,
            cityEn: true,
          },
        },
        createdAt: true,
      },
    });
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${id}`);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        isActive: dto.isActive,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        isActive: true,
        role: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            city: true,
          },
        },
        createdAt: true,
      },
    });
  }

  async updateBranch(id: string, dto: UpdateUserBranchDto) {
    const [existing, branch] = await Promise.all([
      this.prisma.user.findUnique({ where: { id } }),
      this.prisma.branch.findUnique({ where: { id: dto.branchId } }),
    ]);

    if (!existing) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${id}`);
    }

    if (!branch) {
      throw new NotFoundException(
        `Không tìm thấy chi nhánh với ID: ${dto.branchId}`,
      );
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        branchId: dto.branchId,
        ...(existing.role === Role.CUSTOMER && {
          role: Role.BRANCH_MANAGER,
        }),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        isActive: true,
        role: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            city: true,
            cityEn: true,
          },
        },
        createdAt: true,
      },
    });
  }

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        isActive: true,
        addresses: true,
        role: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            address: true,
            addressEn: true,
            city: true,
            cityEn: true,
            openHours: true,
            phone: true,
          },
        },
        orders: {
          select: {
            status: true,
            totalAmount: true,
          },
        },
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng');
    }

    const totalOrders = user.orders.length;
    const totalSpent = user.orders
      .filter((o) => o.status !== OrderStatus.CANCELLED)
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const { orders: _, ...profile } = user;

    return {
      ...profile,
      totalOrders,
      totalSpent,
    };
  }

  async updateMyProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName.trim() }),
        ...(dto.phone !== undefined && {
          phone: dto.phone?.trim() || null,
        }),
        ...(dto.addresses !== undefined && {
          addresses: dto.addresses,
        }),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        isActive: true,
        addresses: true,
        role: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            city: true,
          },
        },
        createdAt: true,
      },
    });
  }
}
