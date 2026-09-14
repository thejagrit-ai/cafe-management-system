-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
CREATE TYPE "CouponStatus" AS ENUM ('ACTIVE', 'PAUSED', 'EXPIRED');
CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "coupons" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" "CouponType" NOT NULL,
  "value" DECIMAL(10,2) NOT NULL,
  "minOrderAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "maxDiscount" DECIMAL(10,2),
  "usageLimit" INTEGER,
  "perCustomerLimit" INTEGER,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "status" "CouponStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "coupon_redemptions" (
  "id" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "customerId" TEXT,
  "discount" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_favorites" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_favorites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_reviews" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "orderId" TEXT,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_shifts" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "clockInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "clockOutAt" TIMESTAMP(3),
  "breakMinutes" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "employee_shifts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_permissions" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "permission" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "employee_permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_orders" (
  "id" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "supplierId" TEXT,
  "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "expectedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_order_items" (
  "id" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "ingredientId" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "unitCost" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "receivedQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");
CREATE INDEX "coupons_code_idx" ON "coupons"("code");
CREATE INDEX "coupons_status_idx" ON "coupons"("status");
CREATE INDEX "coupon_redemptions_couponId_idx" ON "coupon_redemptions"("couponId");
CREATE INDEX "coupon_redemptions_customerId_idx" ON "coupon_redemptions"("customerId");
CREATE INDEX "coupon_redemptions_orderId_idx" ON "coupon_redemptions"("orderId");
CREATE UNIQUE INDEX "customer_favorites_customerId_productId_key" ON "customer_favorites"("customerId", "productId");
CREATE INDEX "customer_favorites_customerId_idx" ON "customer_favorites"("customerId");
CREATE UNIQUE INDEX "product_reviews_customerId_productId_orderId_key" ON "product_reviews"("customerId", "productId", "orderId");
CREATE INDEX "product_reviews_productId_idx" ON "product_reviews"("productId");
CREATE INDEX "product_reviews_customerId_idx" ON "product_reviews"("customerId");
CREATE INDEX "employee_shifts_employeeId_idx" ON "employee_shifts"("employeeId");
CREATE INDEX "employee_shifts_clockInAt_idx" ON "employee_shifts"("clockInAt");
CREATE INDEX "employee_shifts_status_idx" ON "employee_shifts"("status");
CREATE UNIQUE INDEX "employee_permissions_employeeId_permission_key" ON "employee_permissions"("employeeId", "permission");
CREATE INDEX "employee_permissions_employeeId_idx" ON "employee_permissions"("employeeId");
CREATE UNIQUE INDEX "purchase_orders_orderNumber_key" ON "purchase_orders"("orderNumber");
CREATE INDEX "purchase_orders_supplierId_idx" ON "purchase_orders"("supplierId");
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");
CREATE INDEX "purchase_order_items_purchaseOrderId_idx" ON "purchase_order_items"("purchaseOrderId");
CREATE INDEX "purchase_order_items_ingredientId_idx" ON "purchase_order_items"("ingredientId");

-- ForeignKeys
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_favorites" ADD CONSTRAINT "customer_favorites_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_favorites" ADD CONSTRAINT "customer_favorites_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employee_shifts" ADD CONSTRAINT "employee_shifts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_permissions" ADD CONSTRAINT "employee_permissions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
