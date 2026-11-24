import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';

@Injectable()
export class BranchScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Truy cập bị từ chối: Chưa xác thực');
    }

    // ADMIN có toàn quyền xem tất cả chi nhánh
    if (user.role === Role.ADMIN) {
      return true;
    }

    // BRANCH_MANAGER chỉ được truy cập dữ liệu thuộc branchId của mình
    if (user.role === Role.BRANCH_MANAGER) {
      if (!user.branchId) {
        throw new ForbiddenException('Quản lý chi nhánh chưa được gán vào chi nhánh nào');
      }

      // Kiểm tra branchId từ params (:branchId hoặc :id), query, hoặc body
      const targetBranchId =
        request.params?.branchId ??
        request.params?.id ??
        request.query?.branchId ??
        request.body?.branchId;

      if (targetBranchId && targetBranchId !== user.branchId) {
        throw new ForbiddenException(
          `Truy cập bị từ chối: Bạn chỉ có quyền truy cập chi nhánh của mình (${user.branchId})`,
        );
      }

      // Tự động gán branchId vào query filter nếu chưa có
      if (!request.query?.branchId && !request.params?.branchId) {
        request.query = { ...request.query, branchId: user.branchId };
      }

      return true;
    }

    return true;
  }
}
