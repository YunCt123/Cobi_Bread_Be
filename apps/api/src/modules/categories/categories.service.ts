import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function formatCategory(cat: any, lang: string = 'vi') {
  const isEn = lang === 'en';
  return {
    ...cat,
    displayName: isEn && cat.nameEn ? cat.nameEn : cat.name,
    ...(cat.children && {
      children: cat.children.map((child: any) => formatCategory(child, lang)),
    }),
    ...(cat.products && {
      products: cat.products.map((p: any) => ({
        ...p,
        displayName: isEn && p.nameEn ? p.nameEn : p.name,
        displayDescription:
          isEn && p.descriptionEn ? p.descriptionEn : (p.description ?? null),
        displayIngredients:
          isEn && p.ingredientsEn ? p.ingredientsEn : p.ingredients,
      })),
    }),
  };
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(lang: string = 'vi') {
    const items = await this.prisma.category.findMany({
      orderBy: {
        displayOrder: 'asc',
      },
      include: {
        children: {
          orderBy: { displayOrder: 'asc' },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    return items.map((cat) => formatCategory(cat, lang));
  }

  async findOne(id: string, lang: string = 'vi') {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        parent: true,
        products: {
          where: { isActive: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục với ID: ${id}`);
    }

    return formatCategory(category, lang);
  }

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug ? dto.slug.trim().toLowerCase() : slugify(dto.name);

    const existing = await this.prisma.category.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException(`Slug danh mục '${slug}' đã tồn tại`);
    }

    return this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        nameEn: dto.nameEn?.trim() || null,
        slug,
        parentId: dto.parentId ?? null,
        displayOrder: dto.displayOrder ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Không tìm thấy danh mục với ID: ${id}`);
    }

    const slug = dto.slug ? dto.slug.trim().toLowerCase() : undefined;

    if (slug && slug !== existing.slug) {
      const duplicate = await this.prisma.category.findUnique({
        where: { slug },
      });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(`Slug danh mục '${slug}' đã tồn tại`);
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.nameEn !== undefined && { nameEn: dto.nameEn?.trim() || null }),
        ...(slug && { slug }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true, children: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Không tìm thấy danh mục với ID: ${id}`);
    }

    if (existing._count.products > 0) {
      throw new ConflictException(
        `Không thể xóa danh mục đang chứa ${existing._count.products} sản phẩm`,
      );
    }

    if (existing._count.children > 0) {
      throw new ConflictException(
        `Không thể xóa danh mục đang có ${existing._count.children} danh mục con`,
      );
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }
}
