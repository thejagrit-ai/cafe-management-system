# Business Rules

The invariants the system enforces. These live in the service layer, so they hold
regardless of which client calls the API.

---

## Pricing

**Prices always come from the database, never from the request body.**

`OrderService.create` looks up each product inside the transaction and computes:

```
lineTotal   = product.price * quantity        (price read from the DB)
subtotal    = sum(lineTotal)
taxAmount   = round(subtotal * taxRate / 100)
deliveryFee = type === DELIVERY ? settings.deliveryFee : 0
total       = subtotal + taxAmount - discountAmount + deliveryFee
```

Any `subtotal`, `total` or `taxAmount` a client sends is ignored. A client that
posts `total: 0.01` for a $9.00 order still gets charged $9.90.

`taxRate` and `deliveryFee` come from `BusinessSettings`, not from the client.

### Historical pricing

`OrderItem.unitPrice` and `OrderItem.totalPrice` are written at order time. Changing
a product's price later never alters an existing order — reports and receipts stay
correct.

---

## Order Lifecycle

```
PENDING ──► CONFIRMED ──► PREPARING ──► READY ──┬─► DELIVERED ──► COMPLETED
   │            │              │            │    └─► COMPLETED
   │            │              │            │
   └────────────┴──────────────┴────────────┴─────► CANCELLED
```

`COMPLETED` and `CANCELLED` are terminal. Any transition not on this diagram is
rejected with **409 Conflict** — a client cannot move an order from `PENDING`
straight to `READY`, nor revive a cancelled order.

Timestamps are stamped on entry: `confirmedAt`, `completedAt` (on `DELIVERED` or
`COMPLETED`), and `cancelledAt` together with `cancellationReason`.

Only `ADMIN` and `STAFF` may change order status.

---

## Inventory Deduction

**Ingredients are deducted on the `PENDING → CONFIRMED` transition** — not when the
order is created, and not again on later transitions.

For each order item with a recipe:

```
required = recipeIngredient.quantity * orderItem.quantity
ingredient.currentStock -= required
```

Every deduction writes an `InventoryTransaction` of type `ORDER_CONSUMPTION`
referencing the order. Stock never changes silently.

A product without a recipe (a bottled drink, say) consumes nothing.

### Cancellation

Cancelling an order restores stock **only if the order actually reached a state
where stock was deducted** (`CONFIRMED`, `PREPARING`, `READY`, `DELIVERED`,
`COMPLETED`). Cancelling a still-`PENDING` order restores nothing — otherwise the
system would invent inventory that was never consumed.

Restorations write their own `InventoryTransaction` rows, so the history remains
auditable.

---

## Stock Validation

Before an order is created, required quantities are **summed per ingredient across
every line item**, then compared to stock once:

```
requiredByIngredient = {}
for each item:
    for each recipeIngredient:
        requiredByIngredient[ingredientId] += quantity * item.quantity
```

Checking each line item independently would let two products that share an
ingredient each pass a check they jointly fail.

This runs **inside the same transaction** as the order insert, so stock cannot change
between the check and the write.

If any ingredient falls short the order is rejected with **400** and a message naming
the shortfall, and no order or order item rows remain.

`BusinessSettings.allowOutOfStockOrders` disables this check when a café chooses to
accept orders it cannot yet fulfil.

---

## Low Stock

An ingredient is low when:

```
currentStock <= minStock
```

Surfaced through `GET /api/ingredients/low-stock` and on the admin dashboard.

---

## Payments

| Method                | Initial status | Rationale                                      |
| --------------------- | -------------- | ---------------------------------------------- |
| `CASH`, `CARD`, `UPI` | `PAID`         | Recorded by staff who took the money in person |
| `ONLINE`              | `PENDING`      | No provider has confirmed it yet               |

An `ONLINE` payment is never reported as successful on creation. It is promoted with
`PUT /api/payments/:id/status`, which is the hook a real payment provider's webhook
would call. Only `ADMIN` may change payment status, including refunds.

A payment that would push the total paid above the order total is rejected with
**409**.

---

## Authorization

Roles are `ADMIN`, `STAFF`, `CUSTOMER`. `authorize(...)` is typed to the Prisma
`Role` enum, so an invalid role name fails to compile rather than silently denying
every request at runtime.

Customers are additionally scoped to their own data: `GET /api/orders` rewrites the
customer filter to the caller's own id, and reading another customer's order returns
**403**.

---

## Auditing

`AuditLog` records logins and create/update/status actions on orders, products,
recipes, employees and payments, with the acting user, the before/after values and
the request IP where available. Audit failures are swallowed — an audit problem must
never fail the business operation it describes.
