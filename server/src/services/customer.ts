import { customerRepository } from '../repositories/customer';
import { addressRepository } from '../repositories/address';
import { orderRepository } from '../repositories/order';
import { createAuditLog, getAuditDataFromRequest } from '../utils/audit';
import { NotFoundError } from '../utils/errors';
import { AuthenticatedRequest } from '../types';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';

export class CustomerService {
  async findAll(params: { page: number; limit: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; search?: string }) {
    // `search` was previously handed to the repository, which only understands
    // `where` — so the term was silently dropped and every query returned the
    // full list. Translate it into a filter here.
    const where: Prisma.CustomerWhereInput | undefined = params.search
      ? {
          OR: [
            { firstName: { contains: params.search, mode: 'insensitive' } },
            { lastName: { contains: params.search, mode: 'insensitive' } },
            { phone: { contains: params.search, mode: 'insensitive' } },
            { user: { email: { contains: params.search, mode: 'insensitive' } } },
          ],
        }
      : undefined;

    return customerRepository.findWithStats({
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      where,
    });
  }

  async findById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        user: true,
        addresses: true,
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { items: { include: { product: true } } },
        },
      },
    });
    if (!customer) {
      throw new NotFoundError('Customer');
    }
    return customer;
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; phone?: string; dateOfBirth?: string }, req: AuthenticatedRequest) {
    const customer = await prisma.customer.findUnique({ where: { userId } });
    if (!customer) {
      throw new NotFoundError('Customer');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedCustomer = await tx.customer.update({
        where: { id: customer.id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        },
        include: { user: true, addresses: true },
      });

      await createAuditLog({
        userId: req.user?.id,
        action: 'UPDATE_PROFILE',
        entity: 'Customer',
        entityId: customer.id,
        oldData: customer,
        newData: updatedCustomer,
        ...getAuditDataFromRequest(req),
      });

      return updatedCustomer;
    });

    return updated;
  }

  async getAddresses(customerId: string) {
    return addressRepository.findByCustomer(customerId);
  }

  async createAddress(customerId: string, data: { label: string; street: string; city: string; state: string; postalCode: string; country?: string; isDefault?: boolean; instructions?: string }, req: AuthenticatedRequest) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new NotFoundError('Customer');
    }

    const address = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.address.updateMany({
          where: { customerId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const newAddress = await tx.address.create({
        data: {
          customerId,
          label: data.label,
          street: data.street,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country ?? 'USA',
          isDefault: data.isDefault ?? false,
          instructions: data.instructions,
        },
      });

      await createAuditLog({
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'Address',
        entityId: newAddress.id,
        newData: newAddress,
        ...getAuditDataFromRequest(req),
      });

      return newAddress;
    });

    return address;
  }

  async updateAddress(addressId: string, customerId: string, data: any, req: AuthenticatedRequest) {
    const address = await prisma.address.findFirst({ where: { id: addressId, customerId } });
    if (!address) {
      throw new NotFoundError('Address');
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.address.updateMany({
          where: { customerId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const updatedAddress = await tx.address.update({
        where: { id: addressId },
        data,
      });

      await createAuditLog({
        userId: req.user?.id,
        action: 'UPDATE',
        entity: 'Address',
        entityId: addressId,
        oldData: address,
        newData: updatedAddress,
        ...getAuditDataFromRequest(req),
      });

      return updatedAddress;
    });

    return updated;
  }

  async deleteAddress(addressId: string, customerId: string, req: AuthenticatedRequest) {
    const address = await prisma.address.findFirst({ where: { id: addressId, customerId } });
    if (!address) {
      throw new NotFoundError('Address');
    }

    await prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id: addressId } });

      await createAuditLog({
        userId: req.user?.id,
        action: 'DELETE',
        entity: 'Address',
        entityId: addressId,
        oldData: address,
        ...getAuditDataFromRequest(req),
      });
    });
  }

  async getOrders(customerId: string, params: { page: number; limit: number }) {
    return orderRepository.findByCustomer(customerId, params);
  }
}

export const customerService = new CustomerService();