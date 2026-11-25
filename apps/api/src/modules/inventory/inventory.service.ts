import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { QueryBatchesDto } from './dto/query-batches.dto.js';
import { CreateBatchDto } from './dto/create-batch.dto.js';
import { UpdateBatchDto } from './dto/update-batch.dto.js';
import { AvailabilityQueryDto } from './dto/availability-query.dto.js';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findBatches(
    query: QueryBatchesDto,
    userRole?: Role,
    userBranchId?: string | null,
  ) {
    const where: Prisma.InventoryBatchWhereInput = {};

    // Ràng buộc chi nhánh theo quyền hạn
    if (userRole === Role.BRANCH_MANAGER) {
      if (!userBranchId) {
        throw new ForbiddenException('Quản lý chưa được gán vào chi nhánh');
      }
      where.branchId = userBranchId;
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.productId) {
      where.productId = query.productId;
    }

    if (query.expiringWithinDays !== undefined) {
      const now = new Date();
      const targetDate = new Date(
        now.getTime() + query.expiringWithinDays * 24 * 60 * 60 * 1000,
      );
      where.expiresAt = {
        lte: targetDate,
        gte: now, // Chưa hết hạn
      };
      where.quantity = { gt: 0 }; // Còn tồn kho
    }

    return this.prisma.inventoryBatch.findMany({
      where,
      orderBy: {
        expiresAt: 'asc', // FEFO: Ưu tiên lô hết hạn sớm nhất
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            storageType: true,
            price: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
    });
  }

  async createBatch(
    dto: CreateBatchDto,
    userRole: Role,
    userBranchId?: string | null,
  ) {
    let targetBranchId = dto.branchId;
    if (userRole === Role.BRANCH_MANAGER) {
      targetBranchId = userBranchId ?? undefined;
    }

    if (!targetBranchId) {
      throw new BadRequestException('branchId là bắt buộc');
    }

    const branch = await this.prisma.branch.findUnique({
      where: { id: targetBranchId },
    });
    if (!branch) {
      throw new NotFoundException(`Không tìm thấy chi nhánh với ID: ${targetBranchId}`);
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với ID: ${dto.productId}`);
    }

    return this.prisma.inventoryBatch.create({
      data: {
        branchId: targetBranchId,
        productId: dto.productId,
        batchCode: dto.batchCode.trim(),
        quantity: dto.quantity,
        manufacturedAt: new Date(dto.manufacturedAt),
        expiresAt: new Date(dto.expiresAt),
      },
      include: {
        product: true,
        branch: true,
      },
    });
  }

  async updateBatch(
    id: string,
    dto: UpdateBatchDto,
    userRole: Role,
    userBranchId?: string | null,
  ) {
    const existing = await this.prisma.inventoryBatch.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy lô hàng với ID: ${id}`);
    }

    if (userRole === Role.BRANCH_MANAGER && existing.branchId !== userBranchId) {
      throw new ForbiddenException(
        'Bạn chỉ có quyền cập nhật lô hàng thuộc chi nhánh của mình',
      );
    }

    return this.prisma.inventoryBatch.update({
      where: { id },
      data: {
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.manufacturedAt && { manufacturedAt: new Date(dto.manufacturedAt) }),
        ...(dto.expiresAt && { expiresAt: new Date(dto.expiresAt) }),
      },
      include: {
        product: true,
        branch: true,
      },
    });
  }

  async getAvailability(query: AvailabilityQueryDto) {
    const { branchId, productId } = query;

    const [branch, product] = await Promise.all([
      this.prisma.branch.findUnique({ where: { id: branchId } }),
      this.prisma.product.findUnique({ where: { id: productId } }),
    ]);

    if (!branch) {
      throw new NotFoundException(`Không tìm thấy chi nhánh với ID: ${branchId}`);
    }
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với ID: ${productId}`);
    }

    const now = new Date();
    const batches = await this.prisma.inventoryBatch.findMany({
      where: {
        branchId,
        productId,
        quantity: { gt: 0 },
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: 'asc' },
    });

    const totalAvailable = batches.reduce((sum, b) => sum + b.quantity, 0);

    return {
      branchId,
      branchName: branch.name,
      productId,
      productName: product.name,
      sku: product.sku,
      totalAvailable,
      batchesCount: batches.length,
      earliestExpiry: batches[0]?.expiresAt ?? null,
      activeBatches: batches.map((b) => ({
        id: b.id,
        batchCode: b.batchCode,
        quantity: b.quantity,
        expiresAt: b.expiresAt,
      })),
    };
  }
}
