import { orderRepository } from '../repositories/order';
import { businessSettingsRepository } from '../repositories/settings';
import { createAuditLog, getAuditDataFromRequest } from '../utils/audit';
import { NotFoundError, InsufficientStockError, ConflictError, BadRequestError } from '../utils/errors';
import { AuthenticatedRequest } from '../types';
import { eventHub } from '../utils/eventHub';
import { loyaltyService } from './loyalty';
import { OrderStatus, OrderType, InventoryTransactionType, ProductAvailability, Prisma, PaymentMethod, PaymentStatus } from '@prisma/client';
import { generateOrderNumber, calculateTax, calculateTotal } from '../utils/helpers';
import prisma from '../config/prisma';

interface CreateOrderData {
  type: OrderType;
  tableNumber?: number;
  customerId?: string;
  items: Array<{ productId: string; quantity: number; notes?: string }>;
  notes?: string;
  addressId?: string;
  paymentMethod?: PaymentMethod;
  paymentDetails?: {
    cardNumber?: string;
    cardHolder?: string;
    expiry?: string;
    transactionId?: string;
  };
}

interface UpdateOrderStatusData {
  status: OrderStatus;
  cancellationReason?: string;
}

const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.DELIVERED, OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.DELIVERED, OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.DELIVERED, OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.DELIVERED, OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

// Ingredients are deducted on the PENDING -> CONFIRMED transition, so only an
// order that already reached one of these states has stock to give back when
// it is cancelled. Restoring a still-PENDING order would invent inventory.
const INVENTORY_DEDUCTED_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED,
];

export class OrderService {
  async create(data: CreateOrderData, req: AuthenticatedRequest) {
    const settings = await businessSettingsRepository.findFirst();
    const allowOutOfStock = settings?.allowOutOfStockOrders ?? false;

    // Rule: Takeout (PICKUP) and Delivery (DELIVERY) require upfront card/online payment to prevent fake orders
    if ((data.type === OrderType.PICKUP || data.type === OrderType.DELIVERY) && data.paymentMethod === PaymentMethod.CASH) {
      throw new BadRequestError('Para pedidos de retiro (Takeout) y domicilio (Delivery) se requiere pago anticipado con tarjeta o en línea.');
    }

    // A customer's order is always attributed to that customer. Taking
    // customerId from the request body would both let a caller file an order
    // under someone else's account and leave the order unattributed (and so
    // missing from order history) whenever the client omitted the field.
    const customerId =
      req.user?.role === 'CUSTOMER' ? req.user.customer?.id : data.customerId;

    const order = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];

      // Ingredient needs are accumulated across every line item before being
      // compared to stock: two products sharing an ingredient must not each
      // pass a check they would jointly fail.
      const requiredByIngredient = new Map<string, number>();

      for (const item of data.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new NotFoundError(`Product ${item.productId}`);
        if (product.availability === ProductAvailability.UNAVAILABLE) {
          throw new ConflictError(`Product ${product.name} is unavailable`);
        }

        // Price comes from the database, never from the client payload.
        const unitPrice = Number(product.price);
        const totalPrice = unitPrice * item.quantity;
        subtotal += totalPrice;

        orderItems.push({
          product: { connect: { id: item.productId } },
          quantity: item.quantity,
          unitPrice,
          totalPrice,
          notes: item.notes,
        });

        const recipe = await tx.recipe.findUnique({
          where: { productId: item.productId },
          include: { ingredients: true },
        });
        for (const ri of recipe?.ingredients ?? []) {
          const need = Number(ri.quantity) * item.quantity;
          requiredByIngredient.set(
            ri.ingredientId,
            (requiredByIngredient.get(ri.ingredientId) ?? 0) + need
          );
        }
      }

      if (!allowOutOfStock && requiredByIngredient.size > 0) {
        const ingredients = await tx.ingredient.findMany({
          where: { id: { in: [...requiredByIngredient.keys()] } },
          select: { id: true, name: true, currentStock: true },
        });

        const shortfalls = ingredients
          .filter((ing) => Number(ing.currentStock) < (requiredByIngredient.get(ing.id) ?? 0))
          .map((ing) => {
            const required = requiredByIngredient.get(ing.id) ?? 0;
            return `${ing.name} (need ${required}, have ${Number(ing.currentStock)})`;
          });

        if (shortfalls.length > 0) {
          throw new InsufficientStockError(shortfalls.join(', '), 0, 0);
        }
      }

      const taxRate = Number(settings?.taxRate ?? 0);
      const taxAmount = calculateTax(subtotal, taxRate);
      const deliveryFee = data.type === OrderType.DELIVERY ? Number(settings?.deliveryFee ?? 0) : 0;
      const discountAmount = 0;
      const totalAmount = calculateTotal(subtotal, taxAmount, discountAmount, deliveryFee);

      const orderNumber = generateOrderNumber();

      // If customer paid upfront with Card/Online/UPI, set status directly to CONFIRMED
      const isPaidUpfront = data.paymentMethod && data.paymentMethod !== PaymentMethod.CASH;
      const initialStatus = isPaidUpfront ? OrderStatus.CONFIRMED : OrderStatus.PENDING;

      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          type: data.type,
          status: initialStatus,
          confirmedAt: isPaidUpfront ? new Date() : undefined,
          tableNumber: data.tableNumber,
          customerId,
          employeeId: req.user?.employee?.id,
          subtotal,
          taxAmount,
          discountAmount,
          deliveryFee,
          total: totalAmount,
          notes: data.notes,
          addressId: data.addressId,
          items: { create: orderItems },
        },
        include: { items: { include: { product: true } } },
      });

      // If paid upfront, record the approved payment in the database
      if (isPaidUpfront && data.paymentMethod) {
        await tx.payment.create({
          data: {
            orderId: newOrder.id,
            amount: totalAmount,
            method: data.paymentMethod,
            status: PaymentStatus.PAID,
            paidAt: new Date(),
            transactionId: data.paymentDetails?.transactionId || `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          },
        });

        // Deduct recipe ingredients immediately since the order is paid and confirmed
        await this.deductInventory(tx, newOrder);
      }

      await createAuditLog({
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'Order',
        entityId: newOrder.id,
        newData: { orderNumber: newOrder.orderNumber, total: newOrder.total, status: newOrder.status, paidUpfront: isPaidUpfront },
        ...getAuditDataFromRequest(req),
      });

      return newOrder;
    });

    eventHub.broadcast('ORDER_CREATED', order);
    if (order.status === OrderStatus.CONFIRMED) {
      eventHub.broadcast('INVENTORY_UPDATED', { orderId: order.id }, ['ADMIN', 'STAFF']);
    }

    return order;
  }

  private async deductInventory(tx: Prisma.TransactionClient, order: any) {
    for (const item of order.items) {
      const recipe = await tx.recipe.findUnique({
        where: { productId: item.productId },
        include: { ingredients: { include: { ingredient: { select: { costPerUnit: true } } } } },
      });

      if (recipe) {
        for (const ri of recipe.ingredients) {
          const requiredQty = Number(ri.quantity) * item.quantity;
          
          await tx.ingredient.update({
            where: { id: ri.ingredientId },
            data: { currentStock: { decrement: requiredQty } },
          });

          await tx.inventoryTransaction.create({
            data: {
              ingredientId: ri.ingredientId,
              type: InventoryTransactionType.ORDER_CONSUMPTION,
              quantity: requiredQty,
              unitCost: Number(ri.ingredient.costPerUnit ?? 0),
              totalCost: requiredQty * Number(ri.ingredient.costPerUnit ?? 0),
              referenceId: order.id,
              referenceType: 'ORDER',
              notes: `Consumed for order ${order.orderNumber}`,
              performedById: order.employeeId,
            },
          });
        }
      }
    }
  }

  async findAll(params: { page: number; limit: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; search?: string; status?: OrderStatus; type?: OrderType; customerId?: string; employeeId?: string; dateFrom?: string; dateTo?: string }) {
    const where: any = {};
    if (params.search) {
      where.OR = [
        { orderNumber: { contains: params.search, mode: 'insensitive' } },
        { customer: { firstName: { contains: params.search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: params.search, mode: 'insensitive' } } },
      ];
    }
    if (params.status) where.status = params.status;
    if (params.type) where.type = params.type;
    if (params.customerId) where.customerId = params.customerId;
    if (params.employeeId) where.employeeId = params.employeeId;
    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) where.createdAt.gte = new Date(params.dateFrom);
      if (params.dateTo) where.createdAt.lte = new Date(params.dateTo);
    }

    return orderRepository.findMany({
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      where,
    });
  }

  async findById(id: string) {
    const order = await orderRepository.findWithDetails(id);
    if (!order) {
      throw new NotFoundError('Order');
    }
    return order;
  }

  async findByOrderNumber(orderNumber: string) {
    const order = await orderRepository.findByOrderNumber(orderNumber);
    if (!order) {
      throw new NotFoundError('Order');
    }
    return order;
  }

  async findByCustomer(customerId: string, params: { page: number; limit: number }) {
    return orderRepository.findByCustomer(customerId, params);
  }

  async updateStatus(id: string, data: UpdateOrderStatusData, req: AuthenticatedRequest) {
    const order = await orderRepository.findById(id);
    if (!order) {
      throw new NotFoundError('Order');
    }
    if (order.status === data.status) {
      return order;
    }

    const isAdmin = req.user?.role === 'ADMIN';
    const validTransitions = VALID_STATUS_TRANSITIONS[order.status] || [];

    // Allow Admin to set any status, or check valid transitions for staff
    if (!isAdmin && !validTransitions.includes(data.status)) {
      throw new ConflictError(`Invalid status transition from ${order.status} to ${data.status}`);
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updateData: Prisma.OrderUpdateInput = { status: data.status };
      if (data.status === OrderStatus.CONFIRMED && !order.confirmedAt) {
        updateData.confirmedAt = new Date();
      }
      if (data.status === OrderStatus.CANCELLED) {
        updateData.cancelledAt = new Date();
        updateData.cancellationReason = data.cancellationReason || 'Cancelado por administración';
      }
      if ((data.status === OrderStatus.COMPLETED || data.status === OrderStatus.DELIVERED) && !order.completedAt) {
        updateData.completedAt = new Date();
      }

      const updated = await tx.order.update({
        where: { id },
        data: updateData,
        include: { items: { include: { product: true } } },
      });

      const wasDeducted = INVENTORY_DEDUCTED_STATUSES.includes(order.status);
      const willBeDeducted = INVENTORY_DEDUCTED_STATUSES.includes(data.status);

      // If moving from PENDING (not deducted) to any fulfilled/active status, deduct inventory
      if (!wasDeducted && willBeDeducted) {
        await this.deductInventory(tx, updated);
      }

      // If moving from a deducted status to CANCELLED or PENDING, restore inventory
      if (wasDeducted && !willBeDeducted) {
        await this.restoreInventory(tx, updated);
      }

      await createAuditLog({
        userId: req.user?.id,
        action: 'UPDATE_STATUS',
        entity: 'Order',
        entityId: id,
        oldData: { status: order.status },
        newData: { status: data.status },
        ...getAuditDataFromRequest(req),
      });

      return updated;
    });

    if (
      (data.status === OrderStatus.COMPLETED || data.status === OrderStatus.DELIVERED) &&
      order.status !== OrderStatus.COMPLETED &&
      order.status !== OrderStatus.DELIVERED &&
      order.customerId
    ) {
      try {
        await loyaltyService.earnPointsForOrder(order.customerId, order.id, Number(order.subtotal));
      } catch (err) {
        console.error('Error awarding loyalty points:', err);
      }
    }

    eventHub.broadcast('ORDER_STATUS_UPDATED', updatedOrder);
    eventHub.broadcast('INVENTORY_UPDATED', { orderId: id }, ['ADMIN', 'STAFF']);

    return updatedOrder;
  }

  private async restoreInventory(tx: Prisma.TransactionClient, order: any) {
    for (const item of order.items) {
      const recipe = await tx.recipe.findUnique({
        where: { productId: item.productId },
        include: { ingredients: { include: { ingredient: { select: { costPerUnit: true } } } } },
      });

      if (recipe) {
        for (const ri of recipe.ingredients) {
          const requiredQty = Number(ri.quantity) * item.quantity;
          
          await tx.ingredient.update({
            where: { id: ri.ingredientId },
            data: { currentStock: { increment: requiredQty } },
          });

          await tx.inventoryTransaction.create({
            data: {
              ingredientId: ri.ingredientId,
              type: InventoryTransactionType.ADJUSTMENT,
              quantity: requiredQty,
              unitCost: Number(ri.ingredient.costPerUnit ?? 0),
              totalCost: requiredQty * Number(ri.ingredient.costPerUnit ?? 0),
              referenceId: order.id,
              referenceType: 'ORDER_CANCELLED',
              notes: `Restored due to order ${order.orderNumber} cancellation`,
              performedById: order.employeeId,
            },
          });
        }
      }
    }
  }

  async getTodaysStats() {
    return orderRepository.getTodaysStats();
  }

  async getPendingOrders() {
    return orderRepository.findPendingOrders();
  }
}

export const orderService = new OrderService();