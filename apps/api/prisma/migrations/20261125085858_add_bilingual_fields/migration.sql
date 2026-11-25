-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "address_en" TEXT,
ADD COLUMN     "city_en" TEXT,
ADD COLUMN     "name_en" TEXT;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "name_en" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "description_en" TEXT,
ADD COLUMN     "ingredients_en" TEXT,
ADD COLUMN     "name_en" TEXT;
