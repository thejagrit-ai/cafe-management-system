import { orderRepository } from '../repositories/order';
import { businessSettingsRepository } from '../repositories/settings';
import { createAuditLog, getAuditDataFromRequest } from '../utils/audit';
import { NotFoundError, InsufficientStockError, ConflictError, BadRequestError } from '../utils/errors';
import { AuthenticatedRequest } from '../types';
import { eventHub } from '../utils/eventHub';
import { loyaltyService, POINT_REDEMPTION_VALUE } from './loyalty';
import { syncAvailabilityForIngredients, announceStockLevels } from './stockSync';
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
  redeemPoints?: number;
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

/**
 * Forward-by-one movement through the fulfilment flow, plus cancellation from
 * any state that has not finished yet.
 *
 * Staff advance orders one step at a time — the barista console renders a
 * single "Avanzar →" button computed from the current status, so skipping is
 * not something the product actually offers. Letting the API accept jumps
 * anyway only allowed states the UI cannot produce, and a skipped CONFIRMED
 * left `confirmedAt` null, quietly losing the record of when the order was
 * accepted.
 *
 * Admins are exempt from this check in `updateStatus` below, which is the
 * intended escape hatch for corrections.
 */
const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  // Dine-in and pickup finish at COMPLETED; delivery goes out as DELIVERED
  // first and is closed once the courier confirms.
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

    const { order, touchedIngredientIds } = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      let touched: string[] = [];
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

      // Loyalty redemption. The programme awarded points from day one but
      // nothing ever spent them: the discount was pinned at zero and the
      // `loyaltyPointsUsed` / `loyaltyDiscount` columns were never written, so
      // a customer's balance could only ever grow.
      let pointsRedeemed = 0;
      let discountAmount = 0;

      if (customerId && data.redeemPoints && data.redeemPoints > 0) {
        const customer = await tx.customer.findUnique({
          where: { id: customerId },
          select: { loyaltyPoints: true },
        });
        if (!customer) throw new NotFoundError('Customer');

        if (data.redeemPoints > customer.loyaltyPoints) {
          throw new BadRequestError(
            `Insufficient loyalty points balance. You have ${customer.loyaltyPoints} points available.`
          );
        }

        pointsRedeemed = loyaltyService.maxRedeemablePoints(data.redeemPoints, subtotal);
      }

      const taxRate = Number(settings?.taxRate ?? 0);
      const taxAmount = calculateTax(subtotal, taxRate);
      const deliveryFee = data.type === OrderType.DELIVERY ? Number(settings?.deliveryFee ?? 0) : 0;
      if (pointsRedeemed > 0) {
        discountAmount = pointsRedeemed * POINT_REDEMPTION_VALUE;
      }
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
          loyaltyPointsUsed: pointsRedeemed,
          loyaltyDiscount: discountAmount,
          total: totalAmount,
          notes: data.notes,
          addressId: data.addressId,
          items: { create: orderItems },
        },
        include: { items: { include: { product: true } } },
      });

      // Debited in the same transaction as the order it discounts, so a
      // failed order can never leave a customer short of points.
      if (customerId && pointsRedeemed > 0) {
        await loyaltyService.applyRedemption(tx, customerId, pointsRedeemed, newOrder.id);
      }

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
        touched = await this.deductInventory(tx, newOrder);
        // The menu has to follow the pantry: an espresso drink whose beans
        // just ran out must stop being orderable in the same commit that
        // consumed them, or the next customer gets as far as checkout before
        // the shortfall is discovered.
        await syncAvailabilityForIngredients(tx, touched);
      }

      await createAuditLog({
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'Order',
        entityId: newOrder.id,
        newData: { orderNumber: newOrder.orderNumber, total: newOrder.total, status: newOrder.status, paidUpfront: isPaidUpfront },
        ...getAuditDataFromRequest(req),
      });

      return { order: newOrder, touchedIngredientIds: touched };
    });

    eventHub.broadcast('ORDER_CREATED', order);
    // Announced after the commit so the levels quoted in the alert are the
    // ones that were actually persisted.
    await announceStockLevels(touchedIngredientIds);

    return order;
  }

  /** Consumes each line item's recipe. Returns the ingredient ids it moved. */
  private async deductInventory(tx: Prisma.TransactionClient, order: any): Promise<string[]> {
    const touched = new Set<string>();

    for (const item of order.items) {
      const recipe = await tx.recipe.findUnique({
        where: { productId: item.productId },
        include: { ingredients: { include: { ingredient: { select: { costPerUnit: true } } } } },
      });

      if (recipe) {
        for (const ri of recipe.ingredients) {
          const requiredQty = Number(ri.quantity) * item.quantity;
          touched.add(ri.ingredientId);

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

    return [...touched];
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

    const { updatedOrder, touchedIngredientIds } = await prisma.$transaction(async (tx) => {
      let touched: string[] = [];
      const updateData: Prisma.OrderUpdateInput = { status: data.status };
      // Any state from CONFIRMED onward means the order was accepted, so stamp
      // the acceptance time if it is still missing. Staff now move one step at
      // a time and always pass through CONFIRMED, but an admin correction may
      // jump straight to a later state — this keeps that from silently losing
      // the record of when the order was taken.
      if (INVENTORY_DEDUCTED_STATUSES.includes(data.status) && !order.confirmedAt) {
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
        touched = await this.deductInventory(tx, updated);
      }

      // If moving from a deducted status to CANCELLED or PENDING, restore inventory
      if (wasDeducted && !willBeDeducted) {
        touched = await this.restoreInventory(tx, updated);
      }

      // Both directions move the menu: a confirmation can exhaust an
      // ingredient, and a cancellation puts one back, which should re-list
      // whatever was taken down because of it.
      await syncAvailabilityForIngredients(tx, touched);

      await createAuditLog({
        userId: req.user?.id,
        action: 'UPDATE_STATUS',
        entity: 'Order',
        entityId: id,
        oldData: { status: order.status },
        newData: { status: data.status },
        ...getAuditDataFromRequest(req),
      });

      return { updatedOrder: updated, touchedIngredientIds: touched };
    });

    if (
      (data.status === OrderStatus.COMPLETED || data.status === OrderStatus.DELIVERED) &&
      order.status !== OrderStatus.COMPLETED &&
      order.status !== OrderStatus.DELIVERED &&
      order.customerId
    ) {
      try {
        // Net of any points already spent on this order - otherwise a
        // redemption immediately earns back a slice of itself.
        const earnableBase = Math.max(Number(order.subtotal) - Number(order.discountAmount), 0);
        await loyaltyService.earnPointsForOrder(order.customerId, order.id, earnableBase);
      } catch (err) {
        console.error('Error awarding loyalty points:', err);
      }
    }

    eventHub.broadcast('ORDER_STATUS_UPDATED', updatedOrder);
    await announceStockLevels(touchedIngredientIds);

    return updatedOrder;
  }

  /** Puts a cancelled order's recipes back. Returns the ingredient ids moved. */
  private async restoreInventory(tx: Prisma.TransactionClient, order: any): Promise<string[]> {
    const touched = new Set<string>();

    for (const item of order.items) {
      const recipe = await tx.recipe.findUnique({
        where: { productId: item.productId },
        include: { ingredients: { include: { ingredient: { select: { costPerUnit: true } } } } },
      });

      if (recipe) {
        for (const ri of recipe.ingredients) {
          const requiredQty = Number(ri.quantity) * item.quantity;
          touched.add(ri.ingredientId);

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

    return [...touched];
  }

  async getTodaysStats() {
    return orderRepository.getTodaysStats();
  }

  async getPendingOrders() {
    return orderRepository.findPendingOrders();
  }
}

export const orderService = new OrderService();