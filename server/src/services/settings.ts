import { businessSettingsRepository } from '../repositories/settings';
import { createAuditLog, getAuditDataFromRequest } from '../utils/audit';
import { AuthenticatedRequest } from '../types';
import prisma from '../config/prisma';

/** The updatable columns of BusinessSettings, matching the Zod validator. */
export interface BusinessSettingsInput {
  taxRate?: number;
  deliveryFee?: number;
  allowOutOfStockOrders?: boolean;
  currency?: string;
  openingTime?: string;
  closingTime?: string;
}

export class SettingsService {
  async find() {
    let settings = await businessSettingsRepository.findFirst();
    if (!settings) {
      settings = await businessSettingsRepository.create({});
    }
    return settings;
  }

  async update(data: BusinessSettingsInput, req: AuthenticatedRequest) {
    const existing = await businessSettingsRepository.findFirst();

    const settings = await prisma.$transaction(async (tx) => {
      let updated;
      if (existing) {
        updated = await tx.businessSettings.update({
          where: { id: existing.id },
          data,
        });
      } else {
        updated = await tx.businessSettings.create({ data });
      }

      await createAuditLog({
        userId: req.user?.id,
        action: 'UPDATE',
        entity: 'BusinessSettings',
        entityId: updated.id,
        oldData: existing ?? undefined,
        newData: updated,
        ...getAuditDataFromRequest(req),
      });

      return updated;
    });

    return settings;
  }
}

export const settingsService = new SettingsService();