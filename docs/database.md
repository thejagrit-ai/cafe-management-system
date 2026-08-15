# Database Schema

PostgreSQL via Prisma. Source of truth: `server/prisma/schema.prisma`.
Table names are snake_case via `@@map`; model names are PascalCase.

---

## Entity relationships

```
User ──1:1─► Customer ──1:N─► Address
  │              └──1:N─► Order
  ├──1:1─► Employee ──1:N─► Order
  └──1:N─► RefreshToken

Category ──1:N─► Product ──1:1─► Recipe ──1:N─► RecipeIngredient ──N:1─► Ingredient
                    │                                                        │
                    ├──1:N─► OrderItem                                        │
                    └──1:1─► Inventory                    Supplier ──1:N──────┘
                                                                              │
Order ──1:N─► OrderItem                          InventoryTransaction ────────┘
  ├──1:N─► Payment
  └──N:1─► Address
```

---

## Enums

| Enum                       | Values                                                                     |
| -------------------------- | -------------------------------------------------------------------------- |
| `Role`                     | `ADMIN`, `STAFF`, `CUSTOMER`                                               |
| `OrderStatus`              | `PENDING`, `CONFIRMED`, `PREPARING`, `READY`, `DELIVERED`, `COMPLETED`, `CANCELLED` |
| `OrderType`                | `DINE_IN`, `PICKUP`, `DELIVERY`                                            |
| `PaymentStatus`            | `PENDING`, `PAID`, `FAILED`, `REFUNDED`, `PARTIAL`                         |
| `PaymentMethod`            | `CASH`, `CARD`, `UPI`, `ONLINE`                                            |
| `ProductAvailability`      | `AVAILABLE`, `UNAVAILABLE`, `LIMITED`                                      |
| `InventoryTransactionType` | `RECEIVED`, `ADDED`, `DEDUCTED`, `ADJUSTMENT`, `WASTE`, `DAMAGED`, `ORDER_CONSUMPTION` |

These names are used verbatim in the API, the Zod validators and the frontend types.
A value that is not in this table is not valid anywhere in the stack.

---

## Tables

### Identity

**`users`** — credentials and role. `email` unique. `passwordHash` is bcrypt and is
stripped from every API response. Deleting a user cascades to its customer,
employee and refresh tokens.

**`refresh_tokens`** — issued refresh tokens with `expiresAt` and optional
`revokedAt`. Indexed on `userId`.

**`customers`** / **`employees`** — profile rows, each `1:1` with a user via a unique
`userId`. Employees carry `position`, `hireDate` and `isActive`.

**`addresses`** — customer delivery addresses, one may be `isDefault`.

### Catalog

**`categories`** — `name`, `description`, `imageUrl`, `sortOrder`, `isActive`.

**`products`** — `name`, `description`, `price` `Decimal(10,2)`, `imageUrl`,
`categoryId`, `availability`, `isFeatured`, `isPopular`, `sortOrder`.
Indexed on `categoryId` and `availability`.

**`inventory`** — optional per-product finished-goods count, distinct from
ingredient stock. `1:1` with product.

### Recipes and ingredients

**`ingredients`** — `name`, unique `sku`, `unit`, and `currentStock` / `minStock` /
`maxStock` as `Decimal(12,3)` so fractional grams and millilitres are exact.
`costPerUnit` is `Decimal(10,4)`. Optional `supplierId`.

**`suppliers`** — supplier contact details.

**`recipes`** — `1:1` with a product (`productId` unique). Holds `instructions`,
`prepTime`, `cookTime`, `servings`. Deleting the product cascades.

**`recipe_ingredients`** — join row with `quantity` `Decimal(10,3)` and `unit`.
`@@unique([recipeId, ingredientId])` prevents listing the same ingredient twice.

**`inventory_transactions`** — append-only stock history: `type`, `quantity`,
`unitCost`, `totalCost`, and `referenceId` / `referenceType` linking back to the
order that caused it. Indexed on `ingredientId`, `createdAt`, and
`(referenceId, referenceType)`.

### Orders and money

**`orders`** — unique `orderNumber`, optional `customerId` and `employeeId`,
`status`, `type`, `tableNumber` (int, dine-in), the money columns
(`subtotal`, `taxAmount`, `discountAmount`, `deliveryFee`, `total`, all
`Decimal(10,2)`), optional `addressId`, and lifecycle timestamps `confirmedAt`,
`completedAt`, `cancelledAt` plus `cancellationReason`.
Indexed on `customerId`, `employeeId`, `status`, `createdAt`.

**`order_items`** — `quantity`, `unitPrice`, `totalPrice` captured at order time.
Deleting the order cascades; products are never cascade-deleted out from under an
order.

**`payments`** — `amount`, `method`, `status`, `transactionId`, `referenceNumber`,
`paidAt`. Indexed on `orderId` and `status`.

### Configuration and audit

**`business_settings`** — `taxRate`, `deliveryFee`, `allowOutOfStockOrders`,
`currency`, `openingTime`, `closingTime`.

**`audit_logs`** — `userId`, `action`, `entity`, `entityId`, `oldData`/`newData`
(JSON), `ipAddress`, `userAgent`. Indexed on `userId`, `(entity, entityId)` and
`createdAt`.

---

## Conventions

- Primary keys are `cuid()` strings.
- Money is `Decimal`, never float. Read it with `Number(...)` at the boundary only.
- `createdAt` / `updatedAt` on every mutable table.
- Cascades follow ownership: deleting an order removes its items; deleting a product
  removes its recipe. Nothing cascades in a direction that would erase history.

---

## Migrations

`server/prisma/migrations/0_init` is the baseline covering the full schema.

```bash
npm run db:migrate                            # create + apply (development)
npm run db:migrate:prod --workspace=server    # prisma migrate deploy (production)
```

For a database that already has the tables, baseline instead of migrating:

```bash
cd server && npx prisma migrate resolve --applied 0_init
```
