import {
  DeliveryType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  Role,
  StorageType,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu Cobi Bread (Bilingual Vi/En)...');

  // 1. Seed 5 chi nhánh Cobi Bread (song ngữ)
  const branchesData = [
    {
      name: 'Cobi Bread Tower',
      nameEn: 'Cobi Bread Tower',
      address: '69 Hoàng Văn Thái, Phường Tân Phú, Quận 7',
      addressEn: '69 Hoang Van Thai Street, Tan Phu Ward, District 7',
      city: 'TP. Hồ Chí Minh',
      cityEn: 'Ho Chi Minh City',
      openHours: '07:00 - 22:00',
      phone: '028 5411 7799',
    },
    {
      name: 'Cobi Bread Home',
      nameEn: 'Cobi Bread Home',
      address: 'Lô ME1-1, Đường số 3, KCN Long Hậu, Xã Long Hậu, Huyện Cần Giuộc',
      addressEn: 'Lot ME1-1, Road No. 3, Long Hau Industrial Park, Can Giuoc District',
      city: 'Long An',
      cityEn: 'Long An',
      openHours: '07:30 - 21:30',
      phone: '0272 3777 888',
    },
    {
      name: 'AEON Mall Hà Đông',
      nameEn: 'AEON Mall Ha Dong',
      address: 'Khu dân cư Hoàng Văn Thụ, Phường Dương Nội, Quận Hà Đông',
      addressEn: 'Hoang Van Thu Residential Area, Duong Noi Ward, Ha Dong District',
      city: 'Hà Nội',
      cityEn: 'Hanoi',
      openHours: '08:00 - 22:00',
      phone: '024 3765 8899',
    },
    {
      name: 'Go! Thăng Long',
      nameEn: 'Go! Thang Long',
      address: '222 Trần Duy Hưng, Phường Trung Hòa, Quận Cầu Giấy',
      addressEn: '222 Tran Duy Hung Street, Trung Hoa Ward, Cau Giay District',
      city: 'Hà Nội',
      cityEn: 'Hanoi',
      openHours: '08:00 - 22:30',
      phone: '024 3784 8999',
    },
    {
      name: 'TTTM The Garden',
      nameEn: 'The Garden Shopping Center',
      address: 'Khu đô thị The Manor, Đường Mễ Trì, Phường Mỹ Đình 1, Quận Nam Từ Liêm',
      addressEn: 'The Manor Urban Area, Me Tri Street, My Dinh 1 Ward, Nam Tu Liem District',
      city: 'Hà Nội',
      cityEn: 'Hanoi',
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
      console.log(`  ✓ Đã cập nhật chi nhánh: ${branch.name} / ${branch.nameEn} (${updated.id})`);
    } else {
      const created = await prisma.branch.create({
        data: branch,
      });
      branchMap[branch.name] = created.id;
      console.log(`  ✓ Đã tạo chi nhánh: ${branch.name} / ${branch.nameEn} (${created.id})`);
    }
  }

  // 2. Hash mật khẩu chung '123456'
  const defaultPassword = '123456';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(defaultPassword, salt);

  const q7BranchId = branchMap['Cobi Bread Tower'];

  // 3. Seed tài khoản mẫu
  const usersData = [
    {
      email: 'admin@cobibread.com',
      fullName: 'Admin Cobi Bread',
      phone: '0901234567',
      isActive: true,
      addresses: undefined,
      role: Role.ADMIN,
      branchId: null,
    },
    {
      email: 'manager.q7@cobibread.com',
      fullName: 'Quản lý Cobi Tower Q7',
      phone: '0902345678',
      isActive: true,
      addresses: undefined,
      role: Role.BRANCH_MANAGER,
      branchId: q7BranchId,
    },
    {
      email: 'customer@cobibread.com',
      fullName: 'Khách hàng Cobi Bread',
      phone: '0909888777',
      isActive: true,
      addresses: [
        {
          id: 'addr-1',
          recipientName: 'Khách hàng Cobi Bread',
          phone: '0909888777',
          address: '123 Nguyễn Lương Bằng, Phường Tân Phú, Quận 7',
          city: 'TP. Hồ Chí Minh',
          isDefault: true,
        },
      ],
      role: Role.CUSTOMER,
      branchId: null,
    },
  ];

  const userMap: Record<string, string> = {};

  for (const user of usersData) {
    const upserted = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
        phone: user.phone,
        isActive: user.isActive,
        ...(user.addresses && { addresses: user.addresses }),
        role: user.role,
        branchId: user.branchId,
        passwordHash,
      },
      create: {
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        isActive: user.isActive,
        ...(user.addresses && { addresses: user.addresses }),
        role: user.role,
        branchId: user.branchId,
        passwordHash,
      },
    });

    userMap[user.email] = upserted.id;
    console.log(
      `  ✓ Đã seed tài khoản: ${upserted.email} | Role: ${upserted.role} | BranchId: ${upserted.branchId ?? 'N/A'}`,
    );
  }

  // 4. Seed 9 danh mục sản phẩm Cobi Bread (song ngữ)
  const categoriesData = [
    { name: 'Bánh Mì Kem Tươi', nameEn: 'Fresh Cream Bread', slug: 'banh-mi-kem-tuoi', displayOrder: 1 },
    { name: 'Bánh Pocket Toast', nameEn: 'Pocket Toast', slug: 'banh-pocket-toast', displayOrder: 2 },
    { name: 'Bánh Bông Lan Sữa', nameEn: 'Milk Sponge Cake', slug: 'banh-bong-lan-sua', displayOrder: 3 },
    { name: 'Bánh Mì Đông Lạnh B2C', nameEn: 'B2C Frozen Bread', slug: 'banh-mi-dong-lanh-b2c', displayOrder: 4 },
    { name: 'Bánh Mì Đông Lạnh B2B', nameEn: 'B2B Frozen Bread', slug: 'banh-mi-dong-lanh-b2b', displayOrder: 5 },
    { name: 'Snack & Bánh Quy', nameEn: 'Snacks & Cookies', slug: 'snack-banh-quy', displayOrder: 6 },
    { name: 'Bánh Mì Que', nameEn: 'Breadsticks', slug: 'banh-mi-que', displayOrder: 7 },
    { name: 'Set Quà Tặng', nameEn: 'Gift Sets', slug: 'set-qua-tang', displayOrder: 8 },
    { name: 'Các Loại Bánh Khác', nameEn: 'Other Pastries', slug: 'cac-loai-banh-khac', displayOrder: 9 },
  ];

  const categoryMap: Record<string, string> = {};

  for (const cat of categoriesData) {
    const upsertedCat = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        nameEn: cat.nameEn,
        displayOrder: cat.displayOrder,
      },
      create: {
        name: cat.name,
        nameEn: cat.nameEn,
        slug: cat.slug,
        displayOrder: cat.displayOrder,
      },
    });
    categoryMap[cat.slug] = upsertedCat.id;
    console.log(`  ✓ Đã seed danh mục: ${upsertedCat.name} / ${upsertedCat.nameEn} (${upsertedCat.slug})`);
  }

  // 5. Seed 15 sản phẩm mẫu thực tế (song ngữ đầy đủ)
  const productsData = [
    {
      sku: 'CB-BMKT-PM-75',
      name: 'Bánh Mì Kem Tươi Phô Mai 75g',
      nameEn: 'Fresh Cream Cheese Bread 75g',
      slug: 'banh-mi-kem-tuoi-pho-mai-75g',
      categorySlug: 'banh-mi-kem-tuoi',
      price: 29000,
      netWeightG: 75,
      storageType: StorageType.FRESH,
      shelfLifeFrozenDays: 30,
      shelfLifeChilledDays: 3,
      isB2b: false,
      ingredients: 'Bột mì cao cấp, sữa tươi nguyên chất, phô mai Mascarpone (20%), kem tươi whipping cream, đường cát, bơ lạt Anchor, men bánh mì, muối tinh. Cảnh báo dị ứng: Chứa gluten (lúa mì), sữa.',
      ingredientsEn: 'Premium wheat flour, whole fresh milk, Mascarpone cheese (20%), whipping cream, granulated sugar, Anchor unsalted butter, yeast, refined salt. Allergy advice: Contains gluten (wheat), milk.',
      nutritionJson: { energyKcal: 285, carbsG: 32.5, proteinG: 6.8, fatG: 14.2 },
      images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop'],
      description: 'Bánh mì vỏ mềm mịn phong cách Hàn Quốc kết hợp nhân kem phô mai Mascarpone béo ngậy tan chảy mát lạnh.',
      descriptionEn: 'Korean-style soft and fluffy bread filled with luscious, chilled melt-in-your-mouth Mascarpone cream cheese.',
      isActive: true,
    },
    {
      sku: 'CB-BMKT-MC-75',
      name: 'Bánh Mì Kem Tươi Matcha Uji 75g',
      nameEn: 'Fresh Uji Matcha Cream Bread 75g',
      slug: 'banh-mi-kem-tuoi-matcha-75g',
      categorySlug: 'banh-mi-kem-tuoi',
      price: 32000,
      netWeightG: 75,
      storageType: StorageType.FRESH,
      shelfLifeFrozenDays: 30,
      shelfLifeChilledDays: 3,
      isB2b: false,
      ingredients: 'Bột mì, sữa tươi, bột matcha nguyên chất Uji Nhật Bản (3.5%), whipping cream, đường, trứng gà, bơ Pháp, men, muối. Cảnh báo dị ứng: Chứa gluten, sữa, trứng.',
      ingredientsEn: 'Wheat flour, fresh milk, authentic Japanese Uji matcha powder (3.5%), whipping cream, sugar, farm-fresh eggs, French butter, yeast, salt. Allergy advice: Contains gluten, milk, eggs.',
      nutritionJson: { energyKcal: 270, carbsG: 31.0, proteinG: 6.2, fatG: 13.5 },
      images: ['https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop'],
      description: 'Hương vị thanh mát đậm đà của bột trà xanh Uji cao cấp hòa quyện với lớp kem tươi mềm mịn thượng hạng.',
      descriptionEn: 'Refreshing and authentic Japanese Uji matcha blended into silky smooth whipped cream inside soft milk bread.',
      isActive: true,
    },
    {
      sku: 'CB-BMKT-SC-75',
      name: 'Bánh Mì Kem Tươi Socola Bỉ 75g',
      nameEn: 'Belgian Chocolate Fresh Cream Bread 75g',
      slug: 'banh-mi-kem-tuoi-socola-75g',
      categorySlug: 'banh-mi-kem-tuoi',
      price: 32000,
      netWeightG: 75,
      storageType: StorageType.FRESH,
      shelfLifeFrozenDays: 30,
      shelfLifeChilledDays: 3,
      isB2b: false,
      ingredients: 'Bột mì, socola đen nguyên chất Callebaut 54%, sữa tươi nguyên kem, kem béo, bơ cacao, đường, trứng gà, men tự nhiên. Cảnh báo dị ứng: Chứa gluten, sữa, trứng.',
      ingredientsEn: 'Wheat flour, Callebaut 54% Belgian dark chocolate, whole milk, dairy cream, cocoa butter, sugar, eggs, natural yeast. Allergy advice: Contains gluten, milk, eggs.',
      nutritionJson: { energyKcal: 298, carbsG: 34.0, proteinG: 7.0, fatG: 15.0 },
      images: ['https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=800&auto=format&fit=crop'],
      description: 'Nhân kem socola Bỉ đậm đà quyến rũ, ngọt ngào dịu êm bọc trong lớp vỏ bánh mì bông mềm.',
      descriptionEn: 'Decadent 54% Callebaut Belgian dark chocolate cream nestled in a pillowy soft bread bun.',
      isActive: true,
    },
    {
      sku: 'CB-PKT-XXPM-100',
      name: 'Pocket Toast Xúc Xích Phô Mai 100g',
      nameEn: 'Cheese Sausage Pocket Toast 100g',
      slug: 'pocket-toast-xuc-xich-pho-mai-100g',
      categorySlug: 'banh-pocket-toast',
      price: 35000,
      netWeightG: 100,
      storageType: StorageType.FRESH,
      shelfLifeFrozenDays: 45,
      shelfLifeChilledDays: 4,
      isB2b: false,
      ingredients: 'Bánh mì gối ép viền, xúc xích heo tiệt trùng xông khói, phô mai Cheddar, xốt mayonnaise béo ngọt, tương cà, bơ tỏi. Cảnh báo dị ứng: Chứa gluten, sữa, đậu nành.',
      ingredientsEn: 'Crustless sandwich bread, smoked pork sausage, Cheddar cheese, sweet mayo sauce, tomato ketchup, garlic butter. Allergy advice: Contains gluten, milk, soy.',
      nutritionJson: { energyKcal: 330, carbsG: 38.0, proteinG: 10.5, fatG: 15.2 },
      images: ['https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&auto=format&fit=crop'],
      description: 'Bánh sandwich túi nướng vàng giòn viền ép kín, bên trong là nhân xúc xích thơm lừng cùng xốt phô mai kéo sợi.',
      descriptionEn: 'Golden sealed-edge pocket sandwich stuffed with smoky savory sausage and stretchy melted Cheddar cheese sauce.',
      isActive: true,
    },
    {
      sku: 'CB-PKT-GTY-100',
      name: 'Pocket Toast Gà Teriyaki 100g',
      nameEn: 'Teriyaki Chicken Pocket Toast 100g',
      slug: 'pocket-toast-ga-teriyaki-100g',
      categorySlug: 'banh-pocket-toast',
      price: 35000,
      netWeightG: 100,
      storageType: StorageType.FRESH,
      shelfLifeFrozenDays: 45,
      shelfLifeChilledDays: 4,
      isB2b: false,
      ingredients: 'Bột mì, ức gà tẩm ướp xốt Teriyaki Nhật Bản, hành tây xào caramen, phô mai Mozzarella, xốt Kewpie, hạt mè rang. Cảnh báo dị ứng: Chứa gluten, sữa, đậu nành, mè.',
      ingredientsEn: 'Wheat flour, marinated chicken breast with Japanese Teriyaki sauce, caramelized onion, Mozzarella cheese, Kewpie mayo, roasted sesame seeds. Allergy advice: Contains gluten, milk, soy, sesame.',
      nutritionJson: { energyKcal: 315, carbsG: 36.5, proteinG: 12.8, fatG: 13.0 },
      images: ['https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop'],
      description: 'Vị đậm đà từ ức gà áp chảo sốt Teriyaki phong cách Tokyo, bữa sáng tiện lợi nhanh gọn giàu protein.',
      descriptionEn: 'Savory Tokyo-style pan-seared Teriyaki chicken breast with caramelized onions and Mozzarella cheese in a toasted pocket.',
      isActive: true,
    },
    {
      sku: 'CB-BBL-ST-120',
      name: 'Bánh Bông Lan Sữa Tươi Cobi 120g',
      nameEn: 'Cobi Fresh Milk Sponge Cake 120g',
      slug: 'banh-bong-lan-sua-tuoi-cobi-120g',
      categorySlug: 'banh-bong-lan-sua',
      price: 39000,
      netWeightG: 120,
      storageType: StorageType.FRESH,
      shelfLifeFrozenDays: 30,
      shelfLifeChilledDays: 5,
      isB2b: false,
      ingredients: 'Trứng gà tươi trang trại (50%), sữa bò thanh trùng Dalat Milk (25%), bột mì số 8, đường tinh luyện, dầu bắp, hương vani tự nhiên. Cảnh báo dị ứng: Chứa trứng, sữa, gluten.',
      ingredientsEn: 'Farm-fresh eggs (50%), pasteurized Dalat Milk (25%), cake flour, refined sugar, corn oil, natural vanilla extract. Allergy advice: Contains eggs, milk, gluten.',
      nutritionJson: { energyKcal: 340, carbsG: 42.0, proteinG: 8.5, fatG: 15.0 },
      images: ['https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=800&auto=format&fit=crop'],
      description: 'Bánh bông lan nướng theo phương pháp tách lòng kiểu Nhật, cốt bánh xốp mềm mịn màng như mây.',
      descriptionEn: 'Japanese chiffon sponge cake made with fresh farm milk, baked to an ultra-soft, cloud-like texture.',
      isActive: true,
    },
    {
      sku: 'CB-DL-CR-B2C-240',
      name: 'Croissant Bơ Pháp Đông Lạnh B2C (Hộp 4 cái)',
      nameEn: 'Frozen French Butter Croissant B2C (Box of 4)',
      slug: 'croissant-bo-phap-dong-lanh-b2c-hop-4-cai',
      categorySlug: 'banh-mi-dong-lanh-b2c',
      price: 79000,
      netWeightG: 240,
      storageType: StorageType.FROZEN,
      shelfLifeFrozenDays: 180,
      shelfLifeChilledDays: 2,
      isB2b: false,
      ingredients: 'Bột mì nhập khẩu Pháp T55, bơ nguyên chất Elle & Vire 82% béo (30%), men tự nhiên, nước tinh khiết, đường, muối khoáng. Cảnh báo dị ứng: Chứa gluten, sữa.',
      ingredientsEn: 'French T55 wheat flour, Elle & Vire 82% pure butter (30%), natural yeast, purified water, sugar, mineral salt. Allergy advice: Contains gluten, milk.',
      nutritionJson: { energyKcal: 380, carbsG: 40.0, proteinG: 7.2, fatG: 21.5 },
      images: ['https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop'],
      description: 'Croissant cán đa tầng bơ Pháp cấp đông công nghệ nhanh IQF, chỉ 15 phút nướng tại nhà là có bánh giòn rụm thơm lừng.',
      descriptionEn: 'Multi-layered artisanal croissant made with 82% Elle & Vire French butter, quick-frozen via IQF. Bake in 15 mins for golden flaky perfection.',
      isActive: true,
    },
    {
      sku: 'CB-DL-BR-B2C-300',
      name: 'Bánh Mì Hoa Cúc Brioche Đông Lạnh 300g',
      nameEn: 'Frozen French Brioche Bread 300g',
      slug: 'banh-mi-hoa-cuc-brioche-dong-lanh-300g',
      categorySlug: 'banh-mi-dong-lanh-b2c',
      price: 85000,
      netWeightG: 300,
      storageType: StorageType.FROZEN,
      shelfLifeFrozenDays: 120,
      shelfLifeChilledDays: 3,
      isB2b: false,
      ingredients: 'Bột mì, bơ lạt, trứng gà tươi, nước hoa cam tự nhiên, đường ngọc trai Pháp, men, mật ong nguyên chất. Cảnh báo dị ứng: Chứa gluten, trứng, sữa.',
      ingredientsEn: 'Wheat flour, unsalted butter, fresh eggs, natural orange blossom water, French pearl sugar, yeast, pure honey. Allergy advice: Contains gluten, eggs, milk.',
      nutritionJson: { energyKcal: 365, carbsG: 45.0, proteinG: 8.0, fatG: 17.0 },
      images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop'],
      description: 'Bánh mì hoa cúc Brioche thớ dài dai thơm ngát hương hoa cam, rắc đường ngọc trai giòn ngọt trên mặt.',
      descriptionEn: 'Traditional French Brioche infused with natural orange blossom water and topped with crunchy pearl sugar.',
      isActive: true,
    },
    {
      sku: 'CB-B2B-HB-70X20',
      name: 'Bánh Mì Hamburger Mè B2B (Thùng 70g x 20 cái)',
      nameEn: 'B2B Frozen Sesame Burger Buns (Box of 20 x 70g)',
      slug: 'banh-mi-hamburger-me-b2b-thung-70g-x-20',
      categorySlug: 'banh-mi-dong-lanh-b2b',
      price: 210000,
      netWeightG: 1400,
      storageType: StorageType.FROZEN,
      shelfLifeFrozenDays: 180,
      shelfLifeChilledDays: 3,
      isB2b: true,
      ingredients: 'Bột mì loại 1, mè trắng thượng hạng, bơ thực vật, sữa bột nguyên kem, đường, men tươi, chất điều vị thực phẩm an toàn. Cảnh báo dị ứng: Chứa gluten, sữa, mè.',
      ingredientsEn: 'Grade 1 wheat flour, premium white sesame, vegetable shortening, whole milk powder, sugar, active yeast, safe food conditioner. Allergy advice: Contains gluten, milk, sesame.',
      nutritionJson: { energyKcal: 275, carbsG: 48.0, proteinG: 8.2, fatG: 5.8 },
      images: ['https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=800&auto=format&fit=crop'],
      description: 'Dòng sản phẩm chuyên biệt cho chuỗi nhà hàng, cà phê và burger shop cao cấp, chuẩn kích thước, rã đông nướng nhanh.',
      descriptionEn: 'Standard commercial burger buns topped with toasted white sesame, optimized for high-end restaurants, cafes, and burger chains.',
      isActive: true,
    },
    {
      sku: 'CB-B2B-BG-50X30',
      name: 'Bánh Mì Baguette Mini B2B (Thùng 50g x 30 cái)',
      nameEn: 'B2B Frozen Mini Baguettes (Box of 30 x 50g)',
      slug: 'banh-mi-baguette-mini-b2b-thung-50g-x-30',
      categorySlug: 'banh-mi-dong-lanh-b2b',
      price: 240000,
      netWeightG: 1500,
      storageType: StorageType.FROZEN,
      shelfLifeFrozenDays: 180,
      shelfLifeChilledDays: 2,
      isB2b: true,
      ingredients: 'Bột lúa mì cứng lên men chậm 18 tiếng, men mẹ tự nhiên Sourdough, nước khoáng, muối biển tự nhiên. Cảnh báo dị ứng: Chứa gluten (lúa mì).',
      ingredientsEn: 'Hard wheat flour, 18-hour natural sourdough mother yeast, mineral water, sea salt. Allergy advice: Contains gluten (wheat).',
      nutritionJson: { energyKcal: 240, carbsG: 51.0, proteinG: 8.5, fatG: 1.2 },
      images: ['https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&auto=format&fit=crop'],
      description: 'Baguette mini vỏ giòn ruột xốp tổ ong, chuyên cung cấp cho hệ thống khách sạn 4-5 sao và tiệc buffet.',
      descriptionEn: 'Artisanal mini French baguettes fermented for 18 hours with natural sourdough starter, crispy crust and airy honeycomb crumb.',
      isActive: true,
    },
    {
      sku: 'CB-SNK-BQTR-150',
      name: 'Bánh Quy Nấm Truffle Cao Cấp 150g',
      nameEn: 'Premium Truffle Mushroom Crackers 150g',
      slug: 'banh-quy-nam-truffle-cao-cap-150g',
      categorySlug: 'snack-banh-quy',
      price: 68000,
      netWeightG: 150,
      storageType: StorageType.AMBIENT,
      shelfLifeFrozenDays: null,
      shelfLifeChilledDays: 90,
      isB2b: false,
      ingredients: 'Bột mì hữu cơ, tinh dầu nấm truffle đen Ý, bơ lạt New Zealand, muối hồng Himalaya, bột phô mai Parmesan, hành sấy. Cảnh báo dị ứng: Chứa gluten, sữa.',
      ingredientsEn: 'Organic wheat flour, Italian black truffle oil, New Zealand butter, pink Himalayan salt, Parmesan cheese powder, dried shallots. Allergy advice: Contains gluten, milk.',
      nutritionJson: { energyKcal: 450, carbsG: 55.0, proteinG: 7.5, fatG: 22.0 },
      images: ['https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&auto=format&fit=crop'],
      description: 'Bánh quy mặn giòn tan thượng hạng nồng nàn hương thơm tinh tế của nấm truffle đen và phô mai Parmesan.',
      descriptionEn: 'Crispy savory gourmet crackers infused with authentic Italian black truffle oil and aged Parmesan cheese.',
      isActive: true,
    },
    {
      sku: 'CB-SNK-BMGB-80',
      name: 'Snack Bánh Mì Giòn Vị Bơ Tỏi Đút Lò 80g',
      nameEn: 'Baked Garlic Butter Bread Crisps 80g',
      slug: 'snack-banh-mi-gion-vi-bo-toi-80g',
      categorySlug: 'snack-banh-quy',
      price: 28000,
      netWeightG: 80,
      storageType: StorageType.AMBIENT,
      shelfLifeFrozenDays: null,
      shelfLifeChilledDays: 60,
      isB2b: false,
      ingredients: 'Bánh mì nướng sấy giòn, bơ tỏi thơm lừng, ngò tây khô Parsley, đường mía, ớt paprika nhẹ. Cảnh báo dị ứng: Chứa gluten, sữa.',
      ingredientsEn: 'Toasted oven-dried bread, fragrant garlic butter, dried parsley herbs, cane sugar, mild paprika. Allergy advice: Contains gluten, milk.',
      nutritionJson: { energyKcal: 385, carbsG: 52.0, proteinG: 6.8, fatG: 16.5 },
      images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop'],
      description: 'Từng lát bánh mì mini nướng giòn rụm ngấm đượm sốt bơ tỏi thơm ngậy khó cưỡng, món ăn vặt hoàn hảo.',
      descriptionEn: 'Bite-sized oven-baked crunchy baguette slices glazed with rich aromatic garlic butter and dried parsley.',
      isActive: true,
    },
    {
      sku: 'CB-BMQ-HP-60',
      name: 'Bánh Mì Que Hải Phòng Paté Cột Đèn 60g',
      nameEn: 'Hai Phong Traditional Paté Breadstick 60g',
      slug: 'banh-mi-que-hai-phong-pate-cot-den-60g',
      categorySlug: 'banh-mi-que',
      price: 18000,
      netWeightG: 60,
      storageType: StorageType.FRESH,
      shelfLifeFrozenDays: 30,
      shelfLifeChilledDays: 3,
      isB2b: false,
      ingredients: 'Bột mì, paté gan heo truyền thống Cột Đèn béo ngậy, mỡ phần hạt lựu, tiêu đen Phú Quốc, ruốc heo, ớt chí chương. Cảnh báo dị ứng: Chứa gluten.',
      ingredientsEn: 'Wheat flour, traditional Hai Phong pork liver paté, diced lardons, Phu Quoc black pepper, pork floss, Chi Chuong chili sauce. Allergy advice: Contains gluten.',
      nutritionJson: { energyKcal: 220, carbsG: 28.0, proteinG: 7.0, fatG: 9.5 },
      images: ['https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&auto=format&fit=crop'],
      description: 'Bánh mì que giòn tan chuẩn vị đất Cảng, nhân paté thơm ngậy tan chảy cùng tương ớt chí chương cay nồng.',
      descriptionEn: 'Crispy Northern Vietnamese breadstick stuffed with rich pork liver paté and authentic spicy Chi Chuong chili sauce.',
      isActive: true,
    },
    {
      sku: 'CB-SET-CZMN-PRE',
      name: 'Set Quà Tặng Cozy Moon Premium',
      nameEn: 'Cozy Moon Premium Bakery Gift Set',
      slug: 'set-qua-tang-cozy-moon-premium',
      categorySlug: 'set-qua-tang',
      price: 389000,
      netWeightG: 650,
      storageType: StorageType.AMBIENT,
      shelfLifeFrozenDays: null,
      shelfLifeChilledDays: 45,
      isB2b: false,
      ingredients: 'Gồm: 01 Hộp Bánh Quy Truffle (150g), 01 Bánh Bông Lan Sữa Hoàng Gia (200g), 02 Bánh Pocket Toast nướng hộp thiếc, 01 Hũ mứt dâu tây Đà Lạt hữu cơ (120g). Cảnh báo dị ứng: Chứa gluten, trứng, sữa.',
      ingredientsEn: 'Includes: 01 Truffle Cracker box (150g), 01 Royal Milk Sponge Cake (200g), 02 Toasted Pocket Toasts in tin box, 01 Organic Dalat Strawberry Jam jar (120g). Allergy advice: Contains gluten, eggs, milk.',
      nutritionJson: { energyKcal: 1850, servingSize: 'Set quà 4 món' },
      images: ['https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop'],
      description: 'Hộp quà thiết kế sang trọng thanh lịch Cobi Bread dành tặng đối tác và người thân yêu trong những dịp lễ đặc biệt.',
      descriptionEn: 'Elegant premium gift box containing artisanal truffle crackers, royal sponge cake, tin-box pocket toasts, and organic strawberry jam.',
      isActive: true,
    },
    {
      sku: 'CB-KB-MFVQ-90',
      name: 'Bánh Muffin Việt Quất & Hạnh Nhân 90g',
      nameEn: 'Blueberry & Almond Muffin 90g',
      slug: 'banh-muffin-viet-quat-hanh-nhan-90g',
      categorySlug: 'cac-loai-banh-khac',
      price: 35000,
      netWeightG: 90,
      storageType: StorageType.FRESH,
      shelfLifeFrozenDays: 45,
      shelfLifeChilledDays: 4,
      isB2b: false,
      ingredients: 'Bột mì, việt quất tươi nhập khẩu New Zealand (25%), hạnh nhân lát, bơ lạt, sữa chua Hy Lạp, trứng, đường nâu tự nhiên. Cảnh báo dị ứng: Chứa gluten, trứng, sữa, các loại hạt (hạnh nhân).',
      ingredientsEn: 'Wheat flour, fresh New Zealand blueberries (25%), sliced almonds, unsalted butter, Greek yogurt, eggs, raw brown sugar. Allergy advice: Contains gluten, eggs, milk, tree nuts (almonds).',
      nutritionJson: { energyKcal: 295, carbsG: 38.0, proteinG: 5.5, fatG: 13.8 },
      images: ['https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=800&auto=format&fit=crop'],
      description: 'Bánh muffin nướng bung xốp mềm ngập tràn quả việt quất chua ngọt tự nhiên và hạnh nhân bùi bùi giòn tan.',
      descriptionEn: 'Moist and buttery bakery muffin loaded with juicy New Zealand blueberries and crunchy sliced almonds.',
      isActive: true,
    },
  ];

  const productMap: Record<string, string> = {};

  for (const prod of productsData) {
    const categoryId = categoryMap[prod.categorySlug];
    if (!categoryId) {
      console.warn(`  ⚠️ Không tìm thấy category: ${prod.categorySlug}`);
      continue;
    }

    const { categorySlug, ...dataWithoutCatSlug } = prod;

    const upsertedProduct = await prisma.product.upsert({
      where: { sku: prod.sku },
      update: {
        ...dataWithoutCatSlug,
        categoryId,
      },
      create: {
        ...dataWithoutCatSlug,
        categoryId,
      },
    });

    productMap[prod.sku] = upsertedProduct.id;
    console.log(`  ✓ Đã seed sản phẩm: ${upsertedProduct.name} / ${upsertedProduct.nameEn} [${upsertedProduct.sku}] - ${upsertedProduct.price}đ`);
  }

  // 6. Seed InventoryBatches (gồm lô bình thường và lô cận date <= 2 ngày cho FEFO)
  console.log('\n📦 Đang seed các lô tồn kho (InventoryBatch)...');
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  const batchesData = [
    // Chi nhánh Cobi Bread Tower (Q.7)
    {
      branchName: 'Cobi Bread Tower',
      sku: 'CB-BMKT-PM-75',
      batchCode: 'BATCH-Q7-PM-EXP1',
      quantity: 15,
      manufacturedAt: new Date(now.getTime() - 2 * dayMs),
      expiresAt: new Date(now.getTime() + 1 * dayMs), // CẬN DATE: còn 1 ngày
    },
    {
      branchName: 'Cobi Bread Tower',
      sku: 'CB-BMKT-PM-75',
      batchCode: 'BATCH-Q7-PM-EXP2',
      quantity: 20,
      manufacturedAt: new Date(now.getTime() - 1 * dayMs),
      expiresAt: new Date(now.getTime() + 1.8 * dayMs), // CẬN DATE: còn 1.8 ngày (<= 2 ngày)
    },
    {
      branchName: 'Cobi Bread Tower',
      sku: 'CB-BMKT-PM-75',
      batchCode: 'BATCH-Q7-PM-NORM',
      quantity: 60,
      manufacturedAt: now,
      expiresAt: new Date(now.getTime() + 5 * dayMs), // Bình thường: còn 5 ngày
    },
    {
      branchName: 'Cobi Bread Tower',
      sku: 'CB-PKT-XXPM-100',
      batchCode: 'BATCH-Q7-PKT-EXP1',
      quantity: 12,
      manufacturedAt: new Date(now.getTime() - 2 * dayMs),
      expiresAt: new Date(now.getTime() + 1.5 * dayMs), // CẬN DATE: còn 1.5 ngày
    },
    {
      branchName: 'Cobi Bread Tower',
      sku: 'CB-PKT-XXPM-100',
      batchCode: 'BATCH-Q7-PKT-NORM',
      quantity: 45,
      manufacturedAt: now,
      expiresAt: new Date(now.getTime() + 7 * dayMs), // Bình thường: còn 7 ngày
    },
    {
      branchName: 'Cobi Bread Tower',
      sku: 'CB-BMKT-MC-75',
      batchCode: 'BATCH-Q7-MC-NORM',
      quantity: 40,
      manufacturedAt: now,
      expiresAt: new Date(now.getTime() + 4 * dayMs),
    },
    {
      branchName: 'Cobi Bread Tower',
      sku: 'CB-BMKT-SC-75',
      batchCode: 'BATCH-Q7-SC-NORM',
      quantity: 35,
      manufacturedAt: now,
      expiresAt: new Date(now.getTime() + 4 * dayMs),
    },
    {
      branchName: 'Cobi Bread Tower',
      sku: 'CB-BBL-ST-120',
      batchCode: 'BATCH-Q7-BBL-NORM',
      quantity: 50,
      manufacturedAt: now,
      expiresAt: new Date(now.getTime() + 6 * dayMs),
    },
    {
      branchName: 'Cobi Bread Tower',
      sku: 'CB-DL-CR-B2C-240',
      batchCode: 'BATCH-Q7-CR-NORM',
      quantity: 80,
      manufacturedAt: now,
      expiresAt: new Date(now.getTime() + 150 * dayMs),
    },
    {
      branchName: 'Cobi Bread Tower',
      sku: 'CB-SNK-BQTR-150',
      batchCode: 'BATCH-Q7-TR-NORM',
      quantity: 100,
      manufacturedAt: now,
      expiresAt: new Date(now.getTime() + 60 * dayMs),
    },
    {
      branchName: 'Cobi Bread Tower',
      sku: 'CB-BMQ-HP-60',
      batchCode: 'BATCH-Q7-BMQ-NORM',
      quantity: 50,
      manufacturedAt: now,
      expiresAt: new Date(now.getTime() + 3 * dayMs),
    },
    {
      branchName: 'Cobi Bread Tower',
      sku: 'CB-SET-CZMN-PRE',
      batchCode: 'BATCH-Q7-SET-NORM',
      quantity: 20,
      manufacturedAt: now,
      expiresAt: new Date(now.getTime() + 40 * dayMs),
    },
    // Chi nhánh Go! Thăng Long (Hà Nội)
    {
      branchName: 'Go! Thăng Long',
      sku: 'CB-BMKT-PM-75',
      batchCode: 'BATCH-TL-PM-NORM',
      quantity: 30,
      manufacturedAt: now,
      expiresAt: new Date(now.getTime() + 5 * dayMs),
    },
    {
      branchName: 'Go! Thăng Long',
      sku: 'CB-PKT-XXPM-100',
      batchCode: 'BATCH-TL-PKT-NORM',
      quantity: 25,
      manufacturedAt: now,
      expiresAt: new Date(now.getTime() + 6 * dayMs),
    },
  ];

  for (const b of batchesData) {
    const branchId = branchMap[b.branchName];
    const productId = productMap[b.sku];

    if (!branchId || !productId) {
      console.warn(`  ⚠️ Bỏ qua lô ${b.batchCode}: không tìm thấy branch hoặc product`);
      continue;
    }

    const existingBatch = await prisma.inventoryBatch.findFirst({
      where: { batchCode: b.batchCode },
    });

    const batchPayload = {
      branchId,
      productId,
      batchCode: b.batchCode,
      quantity: b.quantity,
      manufacturedAt: b.manufacturedAt,
      expiresAt: b.expiresAt,
    };

    if (existingBatch) {
      await prisma.inventoryBatch.update({
        where: { id: existingBatch.id },
        data: batchPayload,
      });
      console.log(`  ✓ Đã cập nhật lô tồn kho: ${b.batchCode} (${b.quantity} cái, HSD: ${b.expiresAt.toISOString().slice(0, 10)})`);
    } else {
      await prisma.inventoryBatch.create({
        data: batchPayload,
      });
      console.log(`  ✓ Đã tạo lô tồn kho: ${b.batchCode} (${b.quantity} cái, HSD: ${b.expiresAt.toISOString().slice(0, 10)})`);
    }
  }

  // 7. Seed 28 đơn hàng giả lập rải đều trong 30 ngày gần nhất trên cả 5 chi nhánh
  console.log('\n🧾 Đang seed 28 đơn hàng mẫu trong 30 ngày gần nhất...');
  const branchNames = Object.keys(branchMap);
  const customerId = userMap['customer@cobibread.com'] ?? null;

  const productPriceBySku: Record<string, number> = {};
  for (const p of productsData) {
    productPriceBySku[p.sku] = p.price;
  }

  const sampleOrderSpecs: Array<{
    code: string;
    daysAgo: number;
    branchIdx: number;
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    deliveryType: DeliveryType;
    items: Array<{ sku: string; qty: number }>;
  }> = [
    { code: 'CB-SEED-2026-0001', daysAgo: 0, branchIdx: 0, status: OrderStatus.DELIVERED, paymentMethod: PaymentMethod.VNPAY, deliveryType: DeliveryType.EXPRESS_NOW, items: [{ sku: 'CB-BMKT-PM-75', qty: 4 }, { sku: 'CB-PKT-XXPM-100', qty: 2 }] },
    { code: 'CB-SEED-2026-0002', daysAgo: 0, branchIdx: 0, status: OrderStatus.PENDING, paymentMethod: PaymentMethod.COD, deliveryType: DeliveryType.EXPRESS_NOW, items: [{ sku: 'CB-BMKT-MC-75', qty: 3 }, { sku: 'CB-BBL-ST-120', qty: 2 }] },
    { code: 'CB-SEED-2026-0003', daysAgo: 0, branchIdx: 0, status: OrderStatus.SHIPPING, paymentMethod: PaymentMethod.MOMO, deliveryType: DeliveryType.EXPRESS_NOW, items: [{ sku: 'CB-DL-CR-B2C-240', qty: 2 }, { sku: 'CB-SNK-BQTR-150', qty: 1 }] },
    { code: 'CB-SEED-2026-0004', daysAgo: 1, branchIdx: 1, status: OrderStatus.DELIVERED, paymentMethod: PaymentMethod.BANK_TRANSFER, deliveryType: DeliveryType.SCHEDULED, items: [{ sku: 'CB-B2B-HB-70X20', qty: 2 }] },
    { code: 'CB-SEED-2026-0005', daysAgo: 1, branchIdx: 2, status: OrderStatus.DELIVERED, paymentMethod: PaymentMethod.VNPAY, deliveryType: DeliveryType.PICKUP, items: [{ sku: 'CB-BMKT-SC-75', qty: 5 }, { sku: 'CB-BMQ-HP-60', qty: 4 }] },
    { code: 'CB-SEED-2026-0006', daysAgo: 2, branchIdx: 0, status: OrderStatus.DELIVERED, paymentMethod: PaymentMethod.COD, deliveryType: DeliveryType.EXPRESS_NOW, items: [{ sku: 'CB-SET-CZMN-PRE', qty: 1 }, { sku: 'CB-BMKT-PM-75', qty: 3 }] },
    { code: 'CB-SEED-2026-0007', daysAgo: 3, branchIdx: 3, status: OrderStatus.DELIVERED, paymentMethod: PaymentMethod.MOMO, deliveryType: DeliveryType.EXPRESS_NOW, items: [{ sku: 'CB-PKT-GTY-100', qty: 4 }, { sku: 'CB-KB-MFVQ-90', qty: 3 }] },
    { code: 'CB-SEED-2026-0008', daysAgo: 4, branchIdx: 4, status: OrderStatus.CANCELLED, paymentMethod: PaymentMethod.COD, deliveryType: DeliveryType.SCHEDULED, items: [{ sku: 'CB-DL-BR-B2C-300', qty: 2 }] },
    { code: 'CB-SEED-2026-0009', daysAgo: 5, branchIdx: 0, status: OrderStatus.DELIVERED, paymentMethod: PaymentMethod.VNPAY, deliveryType: DeliveryType.EXPRESS_NOW, items: [{ sku: 'CB-BMKT-PM-75', qty: 6 }, { sku: 'CB-BMKT-MC-75', qty: 4 }] },
    { code: 'CB-SEED-2026-0010', daysAgo: 6, branchIdx: 2, status: OrderStatus.SHIPPING, paymentMethod: PaymentMethod.MOMO, deliveryType: DeliveryType.EXPRESS_NOW, items: [{ sku: 'CB-SNK-BQTR-150', qty: 3 }, { sku: 'CB-SNK-BMGB-80', qty: 4 }] },
    { code: 'CB-SEED-2026-0011', daysAgo: 7, branchIdx: 1, status: OrderStatus.DELIVERED, paymentMethod: PaymentMethod.BANK_TRANSFER, deliveryType: DeliveryType.SCHEDULED, items: [{ sku: 'CB-B2B-BG-50X30', qty: 2 }] },
    { code: 'CB-SEED-2026-0012', daysAgo: 8, branchIdx: 0, status: OrderStatus.DELIVERED, paymentMethod: PaymentMethod.COD, deliveryType: DeliveryType.PICKUP, items: [{ sku: 'CB-PKT-XXPM-100', qty: 5 }, { sku: 'CB-BBL-ST-120', qty: 3 }] },
    { code: 'CB-SEED-2026-0013', daysAgo: 9, branchIdx: 3, status: OrderStatus.PENDING, paymentMethod: PaymentMethod.COD, deliveryType: DeliveryType.EXPRESS_NOW, items: [{ sku: 'CB-BMKT-SC-75', qty: 4 }, { sku: 'CB-BMQ-HP-60', qty: 5 }] },
    { code: 'CB-SEED-2026-0014', daysAgo: 10, branchIdx: 4, status: OrderStatus.DELIVERED, paymentMethod: PaymentMethod.VNPAY, deliveryType: DeliveryType.EXPRESS_NOW, items: [{ sku: 'CB-SET-CZMN-PRE', qty: 2 }] },
    { code: 'CB-SEED-2026-0015', daysAgo: 11, branchIdx: 0, status: OrderStatus.DELIVERED, paymentMethod: PaymentMethod.MOMO, deliveryType: DeliveryType.EXPRESS_NOW, items: [{ sku: 'CB-DL-CR-B2C-240', qty: 3 }, { sku: 'CB-BMKT-PM-75', qty: 4 }] },
    { code: 'CB-SEED-2026-0016', daysAgo: 12, branchIdx: 2, status: OrderStatus.DELIVERED, paymentMethod: PaymentMethod.COD, deliveryType: DeliveryType.PICKUP, items: [{ sku: 'CB-KB-MFVQ-90', qty: 5 }, { sku: 'CB-PKT-GTY-100', qty: 3 }] },
    { code: 'CB-SEED-2026-0017', daysAgo: 14, branchIdx: 1, status: OrderStatus.DELIVERED, paymentMethod: PaymentMethod.BANK_TRANSFER, deliveryType: DeliveryType.SCHEDULED, items: [{ sku: 'CB-B2B-HB-70X20', qty: 3 }] },
    { code: 'CB-SEED-2026-0018', daysAgo: 15, branchIdx: 0, status: OrderStatus.CANCELLED, paymentMethod: PaymentMethod.COD, deliveryType: DeliveryType.EXPRESS_NOW, items: [{ sku: 'CB-BMKT-MC-75', qty: 2 }] },
    { code: 'CB-SEED-2026-0019', daysAgo: 16, branchIdx: 3, status: OrderStatus.DELIVERED, paymentMethod: PaymentMethod.VNPAY, deliveryType: DeliveryType.EXPRESS_NOW, items: [{ sku: 'CB-BBL-ST-120', qty: 4 }, { sku: 'CB-SNK-BQTR-150', qty: 2 }] },
    { code: 'CB-SEED-2026-0020', daysAgo: 18, branchIdx: 4, status: OrderStatus.DELIVERED, paymentMethod: PaymentMethod.MOMO, deliveryType: DeliveryType.PICKUP, items: [{ sku: 'CB-DL-BR-B2C-300', qty: 2 }, { sku: 'CB-BMQ-HP-60', qty: 6 }] },
    { code: 'CB-SEED-2026-0021', daysAgo: 19, branchIdx: 0, status: OrderStatus.DELIVERED, paymentMethod: PaymentMethod.VNPAY, deliveryType: DeliveryType.EXPRESS_NOW, items: [{ sku: 'CB-SET-CZMN-PRE', qty: 1 }, { sku: 'CB-PKT-XXPM-100', qty: 4 }] },
    { code: 'CB-SEED-2026-0022', daysAgo: 21, branchIdx: 2, status: OrderStatus.DELIVERED, paymentMethod: PaymentMethod.COD, deliveryType: DeliveryType.EXPRESS_NOW, items: [{ sku: 'CB-BMKT-PM-75', qty: 5 }, { sku: 'CB-BMKT-SC-75', qty: 4 }] },
    { code: 'CB-SEED-2026-0023', daysAgo: 22, branchIdx: 1, status: OrderStatus.DELIVERED, paymentMethod: PaymentMethod.BANK_TRANSFER, deliveryType: DeliveryType.SCHEDULED, items: [{ sku: 'CB-B2B-BG-50X30', qty: 1 }, { sku: 'CB-DL-CR-B2C-240', qty: 2 }] },
    { code: 'CB-SEED-2026-0024', daysAgo: 24, branchIdx: 3, status: OrderStatus.DELIVERED, paymentMethod: PaymentMethod.MOMO, deliveryType: DeliveryType.EXPRESS_NOW, items: [{ sku: 'CB-PKT-GTY-100', qty: 4 }, { sku: 'CB-SNK-BMGB-80', qty: 5 }] },
    { code: 'CB-SEED-2026-0025', daysAgo: 25, branchIdx: 0, status: OrderStatus.DELIVERED, paymentMethod: PaymentMethod.VNPAY, deliveryType: DeliveryType.EXPRESS_NOW, items: [{ sku: 'CB-BMKT-MC-75', qty: 6 }, { sku: 'CB-KB-MFVQ-90', qty: 3 }] },
    { code: 'CB-SEED-2026-0026', daysAgo: 27, branchIdx: 4, status: OrderStatus.DELIVERED, paymentMethod: PaymentMethod.COD, deliveryType: DeliveryType.PICKUP, items: [{ sku: 'CB-BBL-ST-120', qty: 3 }, { sku: 'CB-BMKT-PM-75', qty: 4 }] },
    { code: 'CB-SEED-2026-0027', daysAgo: 28, branchIdx: 2, status: OrderStatus.DELIVERED, paymentMethod: PaymentMethod.VNPAY, deliveryType: DeliveryType.EXPRESS_NOW, items: [{ sku: 'CB-SNK-BQTR-150', qty: 2 }, { sku: 'CB-PKT-XXPM-100', qty: 3 }] },
    { code: 'CB-SEED-2026-0028', daysAgo: 29, branchIdx: 0, status: OrderStatus.DELIVERED, paymentMethod: PaymentMethod.MOMO, deliveryType: DeliveryType.EXPRESS_NOW, items: [{ sku: 'CB-SET-CZMN-PRE', qty: 1 }, { sku: 'CB-DL-CR-B2C-240', qty: 2 }] },
  ];

  // Xóa các đơn hàng seed cũ (CB-SEED-2026-*) để tạo lại đúng ngày tương đối (30 ngày gần nhất)
  await prisma.order.deleteMany({
    where: {
      orderCode: {
        startsWith: 'CB-SEED-2026-',
      },
    },
  });

  for (const spec of sampleOrderSpecs) {
    const branchName = branchNames[spec.branchIdx % branchNames.length];
    const branchId = branchMap[branchName];
    if (!branchId) continue;

    const createdAt = new Date(now.getTime() - spec.daysAgo * dayMs);
    const itemsData = spec.items
      .map((it) => {
        const productId = productMap[it.sku];
        const unitPrice = productPriceBySku[it.sku] ?? 30000;
        if (!productId) return null;
        return {
          productId,
          quantity: it.qty,
          unitPrice,
          createdAt,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (itemsData.length === 0) continue;

    const totalAmount = itemsData.reduce(
      (sum, it) => sum + it.quantity * it.unitPrice,
      0,
    );

    const paymentStatus =
      spec.status === OrderStatus.DELIVERED
        ? PaymentStatus.PAID
        : spec.status === OrderStatus.CANCELLED
          ? PaymentStatus.REFUNDED
          : PaymentStatus.UNPAID;

    await prisma.order.create({
      data: {
        orderCode: spec.code,
        userId: customerId,
        branchId,
        status: spec.status,
        paymentMethod: spec.paymentMethod,
        paymentStatus,
        deliveryType: spec.deliveryType,
        totalAmount,
        shippingAddress: {
          recipientName: 'Khách hàng Cobi Bread',
          phone: '0909888777',
          address: '69 Hoàng Văn Thái, Quận 7, TP.HCM',
        },
        note: 'Đơn hàng mẫu phục vụ Dashboard Analytics',
        createdAt,
        updatedAt: createdAt,
        items: {
          create: itemsData,
        },
      },
    });
  }
  console.log(`  ✓ Đã seed ${sampleOrderSpecs.length} đơn hàng rải đều 30 ngày trên 5 chi nhánh`);

  // 8. Seed ~210 bản ghi TrafficLog trong 30 ngày gần nhất
  console.log('\n📈 Đang seed ~210 bản ghi TrafficLog trong 30 ngày gần nhất...');
  await prisma.trafficLog.deleteMany({
    where: {
      sessionId: {
        startsWith: 'seed-sess-',
      },
    },
  });

  const samplePaths = [
    '/',
    '/products',
    '/products/banh-mi-kem-tuoi-pho-mai-75g',
    '/products/banh-mi-kem-tuoi-matcha-75g',
    '/products/pocket-toast-xuc-xich-pho-mai-100g',
    '/products/set-qua-tang-cozy-moon-premium',
    '/branches',
    '/cart',
    '/checkout',
  ];

  const trafficLogsToCreate: Array<{
    path: string;
    sessionId: string;
    createdAt: Date;
  }> = [];

  for (let day = 0; day < 30; day++) {
    // Mỗi ngày từ 5 đến 10 lượt truy cập (tổng ~210 bản ghi)
    const visitsCount = 5 + ((day * 3 + 2) % 6);
    for (let v = 0; v < visitsCount; v++) {
      const visitTime = new Date(
        now.getTime() - day * dayMs - v * 35 * 60 * 1000,
      );
      const path = samplePaths[(day + v) % samplePaths.length];
      trafficLogsToCreate.push({
        path,
        sessionId: `seed-sess-d${day}-v${v}`,
        createdAt: visitTime,
      });
    }
  }

  await prisma.trafficLog.createMany({
    data: trafficLogsToCreate,
  });
  console.log(`  ✓ Đã seed ${trafficLogsToCreate.length} bản ghi TrafficLog`);

  console.log('✅ Seed toàn bộ dữ liệu Cobi Bread (Bilingual) thành công!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
