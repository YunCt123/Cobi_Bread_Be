import {
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { OrderStatus, Prisma, Role, StorageType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  AdminOverviewQueryDto,
  BranchOverviewQueryDto,
  TrackVisitDto,
} from './dto/analytics.dto.js';

function parseRangeDays(range?: string): number {
  if (range === '7d') return 7;
  if (range === '90d') return 90;
  return 30;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildDateBuckets(days: number, now: Date): {
  startDate: Date;
  dateKeys: string[];
} {
  const dayMs = 24 * 60 * 60 * 1000;
  const todayUtcStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const startDate = new Date(todayUtcStart.getTime() - (days - 1) * dayMs);

  const dateKeys: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate.getTime() + i * dayMs);
    dateKeys.push(toDateKey(d));
  }

  return { startDate, dateKeys };
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async trackVisit(dto: TrackVisitDto) {
    return this.prisma.trafficLog.create({
      data: {
        path: dto.path.trim(),
        sessionId: dto.sessionId?.trim() || null,
      },
    });
  }

  async getAdminOverview(query: AdminOverviewQueryDto) {
    const days = parseRangeDays(query.range);
    const now = new Date();
    const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const { startDate, dateKeys } = buildDateBuckets(days, now);

    const [
      ordersInRange,
      visitsInRange,
      branches,
      categories,
      expiringSoonBatchesCount,
      pendingOrdersCount,
    ] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          createdAt: { gte: startDate },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  nameEn: true,
                  images: true,
                  categoryId: true,
                  category: {
                    select: {
                      id: true,
                      name: true,
                      nameEn: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.trafficLog.findMany({
        where: {
          createdAt: { gte: startDate },
        },
        select: {
          createdAt: true,
        },
      }),
      this.prisma.branch.findMany({
        orderBy: { name: 'asc' },
      }),
      this.prisma.category.findMany({
        orderBy: { displayOrder: 'asc' },
      }),
      this.prisma.inventoryBatch.count({
        where: {
          quantity: { gt: 0 },
          expiresAt: {
            gt: now,
            lte: twoDaysLater,
          },
        },
      }),
      this.prisma.order.count({
        where: {
          status: OrderStatus.PENDING,
        },
      }),
    ]);

    const validOrders = ordersInRange.filter(
      (o) => o.status !== OrderStatus.CANCELLED,
    );

    const totalRevenue = validOrders.reduce(
      (sum, o) => sum + o.totalAmount,
      0,
    );
    const totalOrders = ordersInRange.length;
    const averageOrderValue =
      validOrders.length > 0
        ? Math.round(totalRevenue / validOrders.length)
        : 0;
    const totalVisits = visitsInRange.length;
    const conversionRate =
      totalVisits > 0
        ? Number(((totalOrders / totalVisits) * 100).toFixed(2))
        : 0;

    // Daily buckets for revenueSeries & trafficSeries
    const dailyMap = new Map<
      string,
      { revenue: number; orders: number; visits: number }
    >();
    for (const key of dateKeys) {
      dailyMap.set(key, { revenue: 0, orders: 0, visits: 0 });
    }

    for (const order of ordersInRange) {
      const key = toDateKey(order.createdAt);
      const bucket = dailyMap.get(key);
      if (bucket) {
        bucket.orders += 1;
        if (order.status !== OrderStatus.CANCELLED) {
          bucket.revenue += order.totalAmount;
        }
      }
    }

    for (const visit of visitsInRange) {
      const key = toDateKey(visit.createdAt);
      const bucket = dailyMap.get(key);
      if (bucket) {
        bucket.visits += 1;
      }
    }

    const revenueSeries = dateKeys.map((date) => {
      const b = dailyMap.get(date)!;
      return {
        date,
        revenue: b.revenue,
        orders: b.orders,
      };
    });

    const trafficSeries = dateKeys.map((date) => {
      const b = dailyMap.get(date)!;
      return {
        date,
        visits: b.visits,
        orders: b.orders,
      };
    });

    // Branch comparison
    const branchStatsMap = new Map<
      string,
      { revenue: number; orders: number }
    >();
    for (const b of branches) {
      branchStatsMap.set(b.id, { revenue: 0, orders: 0 });
    }

    for (const order of ordersInRange) {
      const stat = branchStatsMap.get(order.branchId);
      if (stat) {
        stat.orders += 1;
        if (order.status !== OrderStatus.CANCELLED) {
          stat.revenue += order.totalAmount;
        }
      }
    }

    const branchComparison = branches.map((b) => {
      const stat = branchStatsMap.get(b.id) ?? { revenue: 0, orders: 0 };
      return {
        branchId: b.id,
        branchName: b.name,
        branchNameEn: b.nameEn,
        revenue: stat.revenue,
        orders: stat.orders,
      };
    });

    // Category breakdown & Top products (from non-cancelled orders)
    const categoryStatsMap = new Map<
      string,
      {
        categoryName: string;
        categoryNameEn: string | null;
        revenue: number;
        quantitySold: number;
      }
    >();
    for (const cat of categories) {
      categoryStatsMap.set(cat.id, {
        categoryName: cat.name,
        categoryNameEn: cat.nameEn,
        revenue: 0,
        quantitySold: 0,
      });
    }

    const productStatsMap = new Map<
      string,
      {
        productId: string;
        sku: string;
        name: string;
        nameEn: string | null;
        image: string | null;
        images: any;
        quantitySold: number;
        revenue: number;
      }
    >();

    for (const order of validOrders) {
      for (const item of order.items) {
        const lineRevenue = item.quantity * item.unitPrice;
        const prod = item.product;

        if (prod) {
          const catStat = categoryStatsMap.get(prod.categoryId);
          if (catStat) {
            catStat.revenue += lineRevenue;
            catStat.quantitySold += item.quantity;
          }

          const existingProd = productStatsMap.get(prod.id);
          if (existingProd) {
            existingProd.quantitySold += item.quantity;
            existingProd.revenue += lineRevenue;
          } else {
            const imgs = Array.isArray(prod.images) ? prod.images : [];
            productStatsMap.set(prod.id, {
              productId: prod.id,
              sku: prod.sku,
              name: prod.name,
              nameEn: prod.nameEn,
              image: (imgs[0] as string) ?? null,
              images: imgs,
              quantitySold: item.quantity,
              revenue: lineRevenue,
            });
          }
        }
      }
    }

    const categoryBreakdown = Array.from(categoryStatsMap.values()).sort(
      (a, b) => b.revenue - a.revenue,
    );

    const topProducts = Array.from(productStatsMap.values())
      .sort((a, b) => b.quantitySold - a.quantitySold || b.revenue - a.revenue)
      .slice(0, 5);

    return {
      range: query.range ?? '30d',
      kpis: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        totalVisits,
        conversionRate,
        expiringSoonBatchesCount,
        pendingOrdersCount,
      },
      revenueSeries,
      trafficSeries,
      branchComparison,
      categoryBreakdown,
      topProducts,
    };
  }

  async getBranchOverview(
    query: BranchOverviewQueryDto,
    userRole: Role,
    userBranchId?: string | null,
  ) {
    let targetBranchId: string | undefined;

    if (userRole === Role.BRANCH_MANAGER) {
      if (!userBranchId) {
        throw new ForbiddenException(
          'Quản lý chi nhánh chưa được gán vào chi nhánh nào',
        );
      }
      targetBranchId = userBranchId;
    } else if (query.branchId) {
      targetBranchId = query.branchId;
    }

    const days = parseRangeDays(query.range);
    const now = new Date();
    const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const todayKey = toDateKey(now);
    const { startDate, dateKeys } = buildDateBuckets(days, now);

    const branchOrderWhere: Prisma.OrderWhereInput = {
      ...(targetBranchId && { branchId: targetBranchId }),
    };

    const branchBatchWhere: Prisma.InventoryBatchWhereInput = {
      ...(targetBranchId && { branchId: targetBranchId }),
    };

    const [
      ordersInRange,
      pendingOrdersCount,
      shippingOrdersCount,
      expiringSoonBatchesCount,
      activeBatches,
      branchInfo,
    ] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          ...branchOrderWhere,
          createdAt: { gte: startDate },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  nameEn: true,
                  storageType: true,
                  images: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.order.count({
        where: {
          ...branchOrderWhere,
          status: OrderStatus.PENDING,
        },
      }),
      this.prisma.order.count({
        where: {
          ...branchOrderWhere,
          status: OrderStatus.SHIPPING,
        },
      }),
      this.prisma.inventoryBatch.count({
        where: {
          ...branchBatchWhere,
          quantity: { gt: 0 },
          expiresAt: {
            gt: now,
            lte: twoDaysLater,
          },
        },
      }),
      this.prisma.inventoryBatch.findMany({
        where: {
          ...branchBatchWhere,
          quantity: { gt: 0 },
          expiresAt: { gt: now },
        },
        include: {
          product: {
            select: {
              storageType: true,
            },
          },
        },
      }),
      targetBranchId
        ? this.prisma.branch.findUnique({ where: { id: targetBranchId } })
        : Promise.resolve(null),
    ]);

    const todayOrdersList = ordersInRange.filter(
      (o) => toDateKey(o.createdAt) === todayKey,
    );
    const todayOrders = todayOrdersList.length;
    const todayRevenue = todayOrdersList
      .filter((o) => o.status !== OrderStatus.CANCELLED)
      .reduce((sum, o) => sum + o.totalAmount, 0);

    // Daily revenueSeries
    const dailyMap = new Map<string, { revenue: number; orders: number }>();
    for (const key of dateKeys) {
      dailyMap.set(key, { revenue: 0, orders: 0 });
    }

    for (const order of ordersInRange) {
      const key = toDateKey(order.createdAt);
      const bucket = dailyMap.get(key);
      if (bucket) {
        bucket.orders += 1;
        if (order.status !== OrderStatus.CANCELLED) {
          bucket.revenue += order.totalAmount;
        }
      }
    }

    const revenueSeries = dateKeys.map((date) => {
      const b = dailyMap.get(date)!;
      return {
        date,
        revenue: b.revenue,
        orders: b.orders,
      };
    });

    // StorageType breakdown (FRESH vs FROZEN vs AMBIENT)
    const storageMap = new Map<
      StorageType,
      {
        storageType: StorageType;
        revenue: number;
        quantitySold: number;
        stockQuantity: number;
      }
    >([
      [
        StorageType.FRESH,
        {
          storageType: StorageType.FRESH,
          revenue: 0,
          quantitySold: 0,
          stockQuantity: 0,
        },
      ],
      [
        StorageType.FROZEN,
        {
          storageType: StorageType.FROZEN,
          revenue: 0,
          quantitySold: 0,
          stockQuantity: 0,
        },
      ],
      [
        StorageType.AMBIENT,
        {
          storageType: StorageType.AMBIENT,
          revenue: 0,
          quantitySold: 0,
          stockQuantity: 0,
        },
      ],
    ]);

    for (const batch of activeBatches) {
      const st = batch.product?.storageType;
      if (st && storageMap.has(st)) {
        storageMap.get(st)!.stockQuantity += batch.quantity;
      }
    }

    const validOrders = ordersInRange.filter(
      (o) => o.status !== OrderStatus.CANCELLED,
    );

    const productStatsMap = new Map<
      string,
      {
        productId: string;
        sku: string;
        name: string;
        nameEn: string | null;
        image: string | null;
        images: any;
        quantitySold: number;
        revenue: number;
      }
    >();

    for (const order of validOrders) {
      for (const item of order.items) {
        const lineRevenue = item.quantity * item.unitPrice;
        const prod = item.product;

        if (prod) {
          const stStat = storageMap.get(prod.storageType);
          if (stStat) {
            stStat.revenue += lineRevenue;
            stStat.quantitySold += item.quantity;
          }

          const existingProd = productStatsMap.get(prod.id);
          if (existingProd) {
            existingProd.quantitySold += item.quantity;
            existingProd.revenue += lineRevenue;
          } else {
            const imgs = Array.isArray(prod.images) ? prod.images : [];
            productStatsMap.set(prod.id, {
              productId: prod.id,
              sku: prod.sku,
              name: prod.name,
              nameEn: prod.nameEn,
              image: (imgs[0] as string) ?? null,
              images: imgs,
              quantitySold: item.quantity,
              revenue: lineRevenue,
            });
          }
        }
      }
    }

    const storageTypeBreakdown = Array.from(storageMap.values());
    const topProducts = Array.from(productStatsMap.values())
      .sort((a, b) => b.quantitySold - a.quantitySold || b.revenue - a.revenue)
      .slice(0, 5);

    return {
      range: query.range ?? '30d',
      branchId: targetBranchId ?? null,
      branchName: branchInfo?.name ?? 'Tất cả chi nhánh',
      branchNameEn: branchInfo?.nameEn ?? 'All Branches',
      kpis: {
        todayRevenue,
        todayOrders,
        pendingOrdersCount,
        shippingOrdersCount,
        expiringSoonBatchesCount,
      },
      revenueSeries,
      storageTypeBreakdown,
      topProducts,
    };
  }
}
