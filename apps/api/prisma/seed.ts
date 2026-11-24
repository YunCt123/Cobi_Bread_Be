import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu Cobi Bread...');

  // 1. Seed 5 chi nhánh Cobi Bread
  const branchesData = [
    {
      name: 'Cobi Bread Tower',
      address: '69 Hoàng Văn Thái, Phường Tân Phú, Quận 7',
      city: 'TP. Hồ Chí Minh',
      openHours: '07:00 - 22:00',
      phone: '028 5411 7799',
    },
    {
      name: 'Cobi Bread Home',
      address: 'Lô ME1-1, Đường số 3, KCN Long Hậu, Xã Long Hậu, Huyện Cần Giuộc',
      city: 'Long An',
      openHours: '07:30 - 21:30',
      phone: '0272 3777 888',
    },
    {
      name: 'AEON Mall Hà Đông',
      address: 'Khu dân cư Hoàng Văn Thụ, Phường Dương Nội, Quận Hà Đông',
      city: 'Hà Nội',
      openHours: '08:00 - 22:00',
      phone: '024 3765 8899',
    },
    {
      name: 'Go! Thăng Long',
      address: '222 Trần Duy Hưng, Phường Trung Hòa, Quận Cầu Giấy',
      city: 'Hà Nội',
      openHours: '08:00 - 22:30',
      phone: '024 3784 8999',
    },
    {
      name: 'TTTM The Garden',
      address: 'Khu đô thị The Manor, Đường Mễ Trì, Phường Mỹ Đình 1, Quận Nam Từ Liêm',
      city: 'Hà Nội',
      openHours: '09:00 - 22:00',
      phone: '024 3787 5588',
    },
  ];

  const branchMap: Record<string, string> = {};

  for (const branch of branchesData) {
    const existing = await prisma.branch.findFirst({
      where: { name: branch.name },
    });

    if (existing) {
      const updated = await prisma.branch.update({
        where: { id: existing.id },
        data: branch,
      });
      branchMap[branch.name] = updated.id;
      console.log(`  ✓ Đã cập nhật chi nhánh: ${branch.name} (${updated.id})`);
    } else {
      const created = await prisma.branch.create({
        data: branch,
      });
      branchMap[branch.name] = created.id;
      console.log(`  ✓ Đã tạo chi nhánh: ${branch.name} (${created.id})`);
    }
  }

  // 2. Hash mật khẩu chung '123456'
  const defaultPassword = '123456';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(defaultPassword, salt);

  const q7BranchId = branchMap['Cobi Bread Tower'];

  // 3. Seed 3 tài khoản mẫu
  const usersData = [
    {
      email: 'admin@cobibread.com',
      fullName: 'Admin Cobi Bread',
      role: Role.ADMIN,
      branchId: null,
    },
    {
      email: 'manager.q7@cobibread.com',
      fullName: 'Quản lý Cobi Tower Q7',
      role: Role.BRANCH_MANAGER,
      branchId: q7BranchId,
    },
    {
      email: 'customer@cobibread.com',
      fullName: 'Khách hàng Cobi Bread',
      role: Role.CUSTOMER,
      branchId: null,
    },
  ];

  for (const user of usersData) {
    const upserted = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
        role: user.role,
        branchId: user.branchId,
        passwordHash,
      },
      create: {
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        branchId: user.branchId,
        passwordHash,
      },
    });

    console.log(
      `  ✓ Đã seed tài khoản: ${upserted.email} | Role: ${upserted.role} | BranchId: ${upserted.branchId ?? 'N/A'}`,
    );
  }

  console.log('✅ Seed dữ liệu thành công!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
