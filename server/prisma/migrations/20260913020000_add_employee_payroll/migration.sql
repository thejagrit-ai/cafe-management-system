CREATE TYPE "PayrollType" AS ENUM ('HOURLY', 'MONTHLY');

ALTER TABLE "employees"
ADD COLUMN "payrollType" "PayrollType" NOT NULL DEFAULT 'HOURLY',
ADD COLUMN "hourlyRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "monthlySalary" DECIMAL(10,2) NOT NULL DEFAULT 0;

UPDATE "employees"
SET "hourlyRate" = 120.00,
    "monthlySalary" = 22000.00
WHERE "hourlyRate" = 0 AND "monthlySalary" = 0;
