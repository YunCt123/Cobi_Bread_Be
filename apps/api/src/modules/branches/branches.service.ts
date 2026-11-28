import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto.js';

function formatBranch(branch: any, lang: string = 'vi') {
  const isEn = lang === 'en';
  return {
    ...branch,
    displayName: isEn && branch.nameEn ? branch.nameEn : branch.name,
    displayAddress:
      isEn && branch.addressEn ? branch.addressEn : branch.address,
    displayCity: isEn && branch.cityEn ? branch.cityEn : branch.city,
  };
}

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(lang: string = 'vi') {
    const branches = await this.prisma.branch.findMany({
      orderBy: {
        name: 'asc',
      },
    });
    return branches.map((b) => formatBranch(b, lang));
  }

  async findOne(id: string, lang: string = 'vi') {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
    });
    if (!branch) {
      throw new NotFoundException(`Không tìm thấy chi nhánh với ID: ${id}`);
    }
    return formatBranch(branch, lang);
  }

  async create(dto: CreateBranchDto) {
    const created = await this.prisma.branch.create({
      data: {
        name: dto.name.trim(),
        nameEn: dto.nameEn?.trim() || null,
        address: dto.address.trim(),
        addressEn: dto.addressEn?.trim() || null,
        city: dto.city.trim(),
        cityEn: dto.cityEn?.trim() || null,
        openHours: dto.openHours.trim(),
        phone: dto.phone.trim(),
        mapEmbedUrl: dto.mapEmbedUrl?.trim() || null,
        isActive: dto.isActive ?? true,
      },
    });
    return formatBranch(created);
  }

  async update(id: string, dto: UpdateBranchDto) {
    const existing = await this.prisma.branch.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy chi nhánh với ID: ${id}`);
    }

    const updated = await this.prisma.branch.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.nameEn !== undefined && {
          nameEn: dto.nameEn?.trim() || null,
        }),
        ...(dto.address !== undefined && { address: dto.address.trim() }),
        ...(dto.addressEn !== undefined && {
          addressEn: dto.addressEn?.trim() || null,
        }),
        ...(dto.city !== undefined && { city: dto.city.trim() }),
        ...(dto.cityEn !== undefined && {
          cityEn: dto.cityEn?.trim() || null,
        }),
        ...(dto.openHours !== undefined && { openHours: dto.openHours.trim() }),
        ...(dto.phone !== undefined && { phone: dto.phone.trim() }),
        ...(dto.mapEmbedUrl !== undefined && {
          mapEmbedUrl: dto.mapEmbedUrl?.trim() || null,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
    return formatBranch(updated);
  }

  async remove(id: string) {
    const existing = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true,
            inventoryBatches: true,
            users: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Không tìm thấy chi nhánh với ID: ${id}`);
    }

    if (
      existing._count.orders > 0 ||
      existing._count.inventoryBatches > 0 ||
      existing._count.users > 0
    ) {
      throw new ConflictException(
        `Không thể xóa chi nhánh đang có dữ liệu liên kết (${existing._count.orders} đơn hàng, ${existing._count.inventoryBatches} lô tồn kho, ${existing._count.users} nhân sự). Hãy chuyển trạng thái isActive = false.`,
      );
    }

    return this.prisma.branch.delete({
      where: { id },
    });
  }
}
