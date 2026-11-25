import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { QueryOrdersDto } from './dto/query-orders.dto.js';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(dto: CreateOrderDto, userId?: string | null) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Kiểm tra Chi nhánh
      const branch = await tx.branch.findUnique({
        where: { id: dto.branchId },
      });
      if (!branch) {
        throw new NotFoundException(`Chi nhánh với ID '${dto.branchId}' không tồn tại`);
      }

      // 2. Gộp số lượng nếu client gửi trùng productId
      const itemQuantityMap = new Map<string, number>();
      for (const item of dto.items) {
        const currentQty = itemQuantityMap.get(item.productId) || 0;
        itemQuantityMap.set(item.productId, currentQty + item.quantity);
      }

      const orderItemsToCreate: Array<{
        productId: string;
        batchId: string;
        quantity: number;
        unitPrice: number;
      }> = [];

      const now = new Date();

      // 3. Phân bổ tồn kho theo nguyên tắc FEFO cho từng sản phẩm
      for (const [productId, requestedQuantity] of itemQuantityMap.entries()) {
        const product = await tx.product.findUnique({
          where: { id: productId },
        });

        if (!product || !product.isActive) {
          throw new NotFoundException(
            `Sản phẩm với ID '${productId}' không tồn tại hoặc đã ngừng kinh doanh`,
          );
        }

        // Tìm tất cả các lô còn hàng và chưa hết hạn, sắp xếp hạn dùng tăng dần (FEFO)
        const availableBatches = await tx.inventoryBatch.findMany({
          where: {
            branchId: dto.branchId,
            productId,
            quantity: { gt: 0 },
            expiresAt: { gt: now },
          },
          orderBy: {
            expiresAt: 'asc', // First Expired, First Out
          },
        });

        const totalAvailable = availableBatches.reduce(
          (sum, b) => sum + b.quantity,
          0,
        );

        if (totalAvailable < requestedQuantity) {
          throw new BadRequestException(
            `Sản phẩm '${product.name}' tại chi nhánh '${branch.name}' không đủ số lượng (Yêu cầu: ${requestedQuantity}, Tồn khả dụng: ${totalAvailable})`,
          );
        }

        // Trừ tồn kho tuần tự theo lô hết hạn sớm nhất
        let remainingNeeded = requestedQuantity;
        for (const batch of availableBatches) {
          if (remainingNeeded <= 0) break;

          const deductAmount = Math.min(batch.quantity, remainingNeeded);

          await tx.inventoryBatch.update({
            where: { id: batch.id },
            data: {
              quantity: { decrement: deductAmount },
            },
          });

          orderItemsToCreate.push({
            productId,
            batchId: batch.id,
            quantity: deductAmount,
            unitPrice: product.price,
          });

          remainingNeeded -= deductAmount;
        }
      }

      // 4. Tính tổng tiền thực tế từ giá sản phẩm trong CSDL
      const totalAmount = orderItemsToCreate.reduce(
        (sum, it) => sum + it.quantity * it.unitPrice,
        0,
      );

      // 5. Tạo mã đơn hàng dạng CB-YYYYMMDD-XXXX
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const orderCode = `CB-${dateStr}-${randomSuffix}`;

      // 6. Lưu đơn hàng và các order item
      const order = await tx.order.create({
        data: {
          orderCode,
          userId: userId ?? null,
          branchId: dto.branchId,
          status: OrderStatus.PENDING,
          paymentMethod: dto.paymentMethod,
          paymentStatus: PaymentStatus.UNPAID,
          deliveryType: dto.deliveryType,
          totalAmount,
          shippingAddress: dto.shippingAddress,
          note: dto.note?.trim() ?? null,
          items: {
            create: orderItemsToCreate,
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                },
              },
              batch: {
                select: {
                  id: true,
                  batchCode: true,
                  expiresAt: true,
                },
              },
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
            },
          },
        },
      });

      return order;
    });
  }

  async getMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                images: true,
              },
            },
            batch: {
              select: {
                id: true,
                batchCode: true,
                expiresAt: true,
              },
            },
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

  async findAll(
    query: QueryOrdersDto,
    userRole: Role,
    userBranchId?: string | null,
  ) {
    const where: Prisma.OrderWhereInput = {};

    if (userRole === Role.BRANCH_MANAGER) {
      if (!userBranchId) {
        throw new ForbiddenException('Quản lý chưa được gán chi nhánh');
      }
      where.branchId = userBranchId;
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.status) {
      where.status = query.status;
    }

    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
              },
            },
            batch: {
              select: {
                id: true,
                batchCode: true,
                expiresAt: true,
              },
            },
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });
  }

  async findOne(id: string, userRole: Role, userId: string, userBranchId?: string | null) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            batch: true,
          },
        },
        branch: true,
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID: ${id}`);
    }

    if (userRole === Role.CUSTOMER && order.userId !== userId) {
      throw new ForbiddenException('Không có quyền xem đơn hàng này');
    }

    if (userRole === Role.BRANCH_MANAGER && order.branchId !== userBranchId) {
      throw new ForbiddenException('Chỉ có quyền xem đơn hàng thuộc chi nhánh mình');
    }

    return order;
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    userRole: Role,
    userId: string,
    userBranchId?: string | null,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID: ${id}`);
    }

    // Kiểm tra quyền hạn
    if (userRole === Role.CUSTOMER) {
      if (order.userId !== userId) {
        throw new ForbiddenException('Bạn không có quyền thao tác trên đơn hàng này');
      }
      if (dto.status !== OrderStatus.CANCELLED) {
        throw new ForbiddenException('Khách hàng chỉ có quyền yêu cầu hủy đơn');
      }
      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException(
          `Chỉ có thể hủy đơn khi đang ở trạng thái PENDING (Trạng thái hiện tại: ${order.status})`,
        );
      }
    } else if (userRole === Role.BRANCH_MANAGER) {
      if (order.branchId !== userBranchId) {
        throw new ForbiddenException(
          'Bạn chỉ có quyền quản lý đơn hàng thuộc chi nhánh của mình',
        );
      }
    }

    // Thực hiện cập nhật trạng thái và hoàn tồn kho nếu hủy đơn trong Transaction
    return this.prisma.$transaction(async (tx) => {
      // Nếu hủy đơn và đơn chưa từng bị hủy trước đó -> Hoàn lại tồn kho vào đúng lô hàng ban đầu
      if (
        dto.status === OrderStatus.CANCELLED &&
        order.status !== OrderStatus.CANCELLED
      ) {
        for (const item of order.items) {
          if (item.batchId) {
            await tx.inventoryBatch.update({
              where: { id: item.batchId },
              data: {
                quantity: { increment: item.quantity },
              },
            });
          }
        }
      }

      // Xử lý cập nhật PaymentStatus tương ứng
      let paymentStatus = order.paymentStatus;
      if (
        dto.status === OrderStatus.DELIVERED &&
        order.paymentMethod === PaymentMethod.COD
      ) {
        paymentStatus = PaymentStatus.PAID;
      } else if (
        dto.status === OrderStatus.CANCELLED &&
        order.paymentStatus === PaymentStatus.PAID
      ) {
        paymentStatus = PaymentStatus.REFUNDED;
      }

      return tx.order.update({
        where: { id },
        data: {
          status: dto.status,
          paymentStatus,
        },
        include: {
          items: {
            include: {
              product: true,
              batch: true,
            },
          },
          branch: true,
        },
      });
    });
  }
}
