import prisma from '../config/prisma';
import { BusinessSettings, Prisma } from '@prisma/client';

export class BusinessSettingsRepository {
  async findFirst(): Promise<BusinessSettings | null> {
    return prisma.businessSettings.findFirst();
  }

  async create(data: Prisma.BusinessSettingsCreateInput): Promise<BusinessSettings> {
    return prisma.businessSettings.create({ data });
  }

  async update(id: string, data: Prisma.BusinessSettingsUpdateInput): Promise<BusinessSettings> {
    return prisma.businessSettings.update({ where: { id }, data });
  }

  async upsert(data: Prisma.BusinessSettingsCreateInput): Promise<BusinessSettings> {
    const existing = await this.findFirst();
    if (existing) {
      return this.update(existing.id, data);
    }
    return this.create(data);
  }
}

export const businessSettingsRepository = new BusinessSettingsRepository();