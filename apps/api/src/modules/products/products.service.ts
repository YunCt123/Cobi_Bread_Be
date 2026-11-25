import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { QueryProductDto } from './dto/query-product.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

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

function formatProduct(product: any, lang: string = 'vi') {
  const isEn = lang === 'en';
  return {
    ...product,
    displayName: isEn && product.nameEn ? product.nameEn : product.name,
    displayDescription:
      isEn && product.descriptionEn
        ? product.descriptionEn
        : (product.description ?? null),
    displayIngredients:
      isEn && product.ingredientsEn
        ? product.ingredientsEn
        : product.ingredients,
    ...(product.category && {
      category: {
        ...product.category,
        displayName:
          isEn && product.category.nameEn
            ? product.category.nameEn
            : product.category.name,
      },
    }),
  };
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryProductDto) {
    const {
      categorySlug,
      storageType,
      isB2b,
      search,
      page = 1,
      limit = 20,
      lang = 'vi',
    } = query;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    if (categorySlug) {
      where.category = {
        slug: categorySlug.trim().toLowerCase(),
      };
    }

    if (storageType) {
      where.storageType = storageType;
    }

    if (isB2b !== undefined) {
      where.isB2b = isB2b;
    }

    if (search && search.trim() !== '') {
      const searchTerm = search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { nameEn: { contains: searchTerm, mode: 'insensitive' } },
        { sku: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { descriptionEn: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              nameEn: true,
              slug: true,
            },
          },
        },
      }),
    ]);

    return {
      data: items.map((item) => formatProduct(item, lang)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBySlug(slug: string, lang: string = 'vi') {
    const product = await this.prisma.product.findUnique({
      where: { slug: slug.trim().toLowerCase() },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            slug: true,
            displayOrder: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với slug: ${slug}`);
    }

    return formatProduct(product, lang);
  }

  async create(dto: CreateProductDto) {
    // 1. Kiểm tra Category
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục với ID: ${dto.categoryId}`);
    }

    // 2. Kiểm tra SKU
    const existingSku = await this.prisma.product.findUnique({
      where: { sku: dto.sku.trim() },
    });
    if (existingSku) {
      throw new ConflictException(`SKU '${dto.sku}' đã tồn tại trong hệ thống`);
    }

    // 3. Chuẩn hóa & kiểm tra Slug
    const slug = dto.slug ? dto.slug.trim().toLowerCase() : slugify(dto.name);
    const existingSlug = await this.prisma.product.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      throw new ConflictException(`Slug '${slug}' đã tồn tại trong hệ thống`);
    }

    return this.prisma.product.create({
      data: {
        sku: dto.sku.trim(),
        name: dto.name.trim(),
        nameEn: dto.nameEn?.trim() || null,
        slug,
        categoryId: dto.categoryId,
        price: dto.price,
        netWeightG: dto.netWeightG,
        storageType: dto.storageType,
        shelfLifeFrozenDays: dto.shelfLifeFrozenDays ?? null,
        shelfLifeChilledDays: dto.shelfLifeChilledDays,
        isB2b: dto.isB2b ?? false,
        ingredients: dto.ingredients.trim(),
        ingredientsEn: dto.ingredientsEn?.trim() || null,
        nutritionJson: dto.nutritionJson ?? Prisma.JsonNull,
        images: dto.images ?? [],
        description: dto.description?.trim() ?? null,
        descriptionEn: dto.descriptionEn?.trim() || null,
        isActive: dto.isActive ?? true,
      },
      include: {
        category: true,
      },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với ID: ${id}`);
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(`Không tìm thấy danh mục với ID: ${dto.categoryId}`);
      }
    }

    if (dto.sku && dto.sku.trim() !== existing.sku) {
      const duplicateSku = await this.prisma.product.findUnique({
        where: { sku: dto.sku.trim() },
      });
      if (duplicateSku && duplicateSku.id !== id) {
        throw new ConflictException(`SKU '${dto.sku}' đã tồn tại trong hệ thống`);
      }
    }

    const slug = dto.slug ? dto.slug.trim().toLowerCase() : undefined;
    if (slug && slug !== existing.slug) {
      const duplicateSlug = await this.prisma.product.findUnique({
        where: { slug },
      });
      if (duplicateSlug && duplicateSlug.id !== id) {
        throw new ConflictException(`Slug '${slug}' đã tồn tại trong hệ thống`);
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.sku && { sku: dto.sku.trim() }),
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.nameEn !== undefined && {
          nameEn: dto.nameEn?.trim() || null,
        }),
        ...(slug && { slug }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.netWeightG !== undefined && { netWeightG: dto.netWeightG }),
        ...(dto.storageType && { storageType: dto.storageType }),
        ...(dto.shelfLifeFrozenDays !== undefined && {
          shelfLifeFrozenDays: dto.shelfLifeFrozenDays,
        }),
        ...(dto.shelfLifeChilledDays !== undefined && {
          shelfLifeChilledDays: dto.shelfLifeChilledDays,
        }),
        ...(dto.isB2b !== undefined && { isB2b: dto.isB2b }),
        ...(dto.ingredients && { ingredients: dto.ingredients.trim() }),
        ...(dto.ingredientsEn !== undefined && {
          ingredientsEn: dto.ingredientsEn?.trim() || null,
        }),
        ...(dto.nutritionJson !== undefined && {
          nutritionJson: dto.nutritionJson ?? Prisma.JsonNull,
        }),
        ...(dto.images !== undefined && { images: dto.images }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() ?? null,
        }),
        ...(dto.descriptionEn !== undefined && {
          descriptionEn: dto.descriptionEn?.trim() || null,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        category: true,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với ID: ${id}`);
    }

    return this.prisma.product.delete({
      where: { id },
    });
  }
}
