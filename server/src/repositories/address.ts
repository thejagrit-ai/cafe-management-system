import prisma from '../config/prisma';
import { BaseRepository } from './base';
import { Address, Prisma } from '@prisma/client';

export class AddressRepository extends BaseRepository<Address, Prisma.AddressCreateInput, Prisma.AddressUpdateInput, Prisma.AddressWhereInput> {
  protected model = prisma.address;

  async findByCustomer(customerId: string): Promise<Address[]> {
    return this.model.findMany({
      where: { customerId },
      orderBy: { isDefault: 'desc' },
    });
  }

  async findDefault(customerId: string): Promise<Address | null> {
    return this.model.findFirst({
      where: { customerId, isDefault: true },
    });
  }

  async setDefault(customerId: string, addressId: string): Promise<void> {
    await prisma.$transaction([
      this.model.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      }),
      this.model.update({
        where: { id: addressId },
        data: { isDefault: true },
      }),
    ]);
  }
}

export const addressRepository = new AddressRepository();