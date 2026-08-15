# API Reference

Base URL: `/api`. All responses are JSON.

## Conventions

**Success**

```json
{ "success": true, "data": {}, "message": "Operation successful" }
```

**Paginated**

```json
{
  "success": true,
  "data": [],
  "pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

**Error**

```json
{ "success": false, "message": "Validation failed", "errors": { "body.price": ["Price must be positive"] } }
```

**Status codes** — `200` OK, `201` created, `400` validation or insufficient stock,
`401` missing/invalid token, `403` wrong role, `404` not found, `409` conflict
(duplicate, illegal status transition, unavailable product), `429` rate limited,
`500` unexpected.

**Authentication** — a JWT is set as an httpOnly cookie on login and is also returned
in the body for non-browser clients, which may send `Authorization: Bearer <token>`.

**Common list parameters** — `page`, `limit` (max 100), `sortBy`, `sortOrder`
(`asc`/`desc`), `search`. Boolean filters accept only `true` or `false`; omitting one
means "do not filter" rather than "filter to false".

Roles below: **A** = admin, **S** = staff, **C** = customer, **—** = public.

---

## `/api/auth`

| Method | Path               | Roles | Notes                                     |
| ------ | ------------------ | ----- | ----------------------------------------- |
| POST   | `/register`        | —     | Creates a CUSTOMER plus customer profile  |
| POST   | `/login`           | —     | Returns user and tokens                   |
| POST   | `/logout`          | A S C | Clears auth cookies                       |
| POST   | `/refresh`         | —     | Exchanges a refresh token                 |
| GET    | `/me`              | A S C | Current user with profile                 |
| PUT    | `/profile`         | A S C | Update own profile                        |
| PUT    | `/change-password` | A S C | Requires the current password             |

Passwords must be at least 8 characters. `passwordHash` never appears in a response.

---

## `/api/products`

| Method | Path         | Roles | Notes                              |
| ------ | ------------ | ----- | ---------------------------------- |
| GET    | `/`          | —     | Menu listing                       |
| GET    | `/featured`  | —     | Featured products                  |
| GET    | `/popular`   | —     | Popular products                   |
| GET    | `/:id`       | —     | Product with category and recipe   |
| POST   | `/`          | A     | Create                             |
| PUT    | `/:id`       | A     | Partial update                     |
| DELETE | `/:id`       | A     | Delete                             |

Filters: `categoryId`, `availability` (`AVAILABLE`/`UNAVAILABLE`/`LIMITED`),
`isFeatured`, `isPopular`.

Body fields: `name`, `description`, `price`, `categoryId`, `imageUrl`, `sortOrder`,
`isFeatured`, `isPopular`, `availability`.

---

## `/api/categories`

| Method | Path     | Roles | Notes                          |
| ------ | -------- | ----- | ------------------------------ |
| GET    | `/`      | —     | Includes product counts        |
| GET    | `/:id`   | —     |                                |
| POST   | `/`      | A     | `name`, `imageUrl`, `sortOrder` |
| PUT    | `/:id`   | A     |                                |
| DELETE | `/:id`   | A     | Blocked while products exist   |

---

## `/api/ingredients`

| Method | Path                 | Roles | Notes                                  |
| ------ | -------------------- | ----- | -------------------------------------- |
| GET    | `/`                  | A S   | Filters: `isActive`, `lowStock`        |
| GET    | `/low-stock`         | A S   | `currentStock <= minStock`             |
| GET    | `/:id`               | A S   |                                        |
| GET    | `/:id/transactions`  | A S   | Stock history                          |
| POST   | `/`                  | A     |                                        |
| PUT    | `/:id`               | A     |                                        |
| DELETE | `/:id`               | A     |                                        |
| POST   | `/:id/adjust-stock`  | A S   | Records a transaction                  |

`adjust-stock` body: `type` (`RECEIVED`, `ADDED`, `DEDUCTED`, `ADJUSTMENT`, `WASTE`,
`DAMAGED`), `quantity` (positive), optional `unitCost`, `notes`.
`RECEIVED`/`ADDED` increase stock; `DEDUCTED`/`WASTE`/`DAMAGED` decrease it;
`ADJUSTMENT` sets an absolute value.

---

## `/api/recipes`

| Method | Path     | Roles | Notes                                   |
| ------ | -------- | ----- | --------------------------------------- |
| GET    | `/`      | A S   |                                         |
| GET    | `/:id`   | A S   | With ingredients                        |
| POST   | `/`      | A     | One recipe per product                  |
| PUT    | `/:id`   | A     | Replaces the ingredient list            |
| DELETE | `/:id`   | A     |                                         |

Body: `productId`, `instructions`, `prepTime`, `cookTime`, `servings`, and
`ingredients[]` of `{ ingredientId, quantity, unit, notes? }`.

---

## `/api/orders`

| Method | Path             | Roles | Notes                                        |
| ------ | ---------------- | ----- | -------------------------------------------- |
| GET    | `/`              | A S C | Customers are scoped to their own orders     |
| GET    | `/my-orders`     | C     | Order history                                |
| GET    | `/pending`       | A S   | Live queue                                   |
| GET    | `/stats/today`   | A S   | Today's totals                               |
| GET    | `/number/:num`   | A S C | Lookup by order number                       |
| GET    | `/:id`           | A S C | 403 for another customer's order             |
| POST   | `/`              | A S C | Creates as `PENDING`                         |
| PUT    | `/:id/status`    | A S   | Enforces the transition rules                |

Create body:

```json
{
  "type": "DINE_IN | PICKUP | DELIVERY",
  "tableNumber": 7,
  "customerId": "optional",
  "addressId": "required for DELIVERY",
  "notes": "optional",
  "items": [{ "productId": "...", "quantity": 2, "notes": "optional" }]
}
```

Totals are computed server-side; any amounts in the request are ignored.
Status body: `{ "status": "...", "cancellationReason": "optional" }`.

See [business-rules.md](./business-rules.md) for the transition diagram and the
inventory consequences of each transition.

---

## `/api/payments`

| Method | Path                | Roles | Notes                                    |
| ------ | ------------------- | ----- | ---------------------------------------- |
| GET    | `/`                 | A S   | Filters: `status`, `method`, date range  |
| GET    | `/order/:orderId`   | A S C | Payments for one order                   |
| GET    | `/totals-by-method` | A     | Breakdown for reporting                  |
| POST   | `/`                 | A S   | Record a payment                         |
| PUT    | `/:id/status`       | A     | Settle, fail or refund                   |

`CASH`/`CARD`/`UPI` are recorded as `PAID`; `ONLINE` is recorded as `PENDING` until
confirmed via `PUT /:id/status`. Over-payment beyond the order total is refused.

---

## `/api/employees`, `/api/customers`, `/api/suppliers`

| Method | Path                    | Roles | Notes                              |
| ------ | ----------------------- | ----- | ---------------------------------- |
| GET    | `/employees`            | A     | Filter `isActive`                  |
| POST   | `/employees`            | A     | Creates the STAFF user too         |
| PUT    | `/employees/:id`        | A     |                                    |
| PUT    | `/employees/:id/password` | A   | Reset a password                   |
| GET    | `/customers`            | A     | With order counts and spend        |
| GET    | `/customers/addresses`  | C     | Own addresses                      |
| POST   | `/customers/addresses`  | C     | Add an address                     |
| GET    | `/suppliers`            | A     |                                    |
| POST   | `/suppliers`            | A     |                                    |

---

## `/api/reports` and `/api/dashboard`

| Method | Path                  | Roles | Notes                                       |
| ------ | --------------------- | ----- | ------------------------------------------- |
| GET    | `/reports/sales`      | A     | Revenue by day, product, category, method   |
| GET    | `/reports/inventory`  | A     | Stock levels, movements, low stock          |
| GET    | `/reports/products`   | A     | Best and worst sellers                      |
| GET    | `/dashboard`          | A     | Admin figures and charts                    |
| GET    | `/dashboard/staff`    | A S   | Staff queue view                            |

Reports accept `dateFrom` and `dateTo` as ISO datetimes. Every figure is computed
from live database rows.

---

## `/api/settings`

| Method | Path  | Roles | Notes                                                        |
| ------ | ----- | ----- | ------------------------------------------------------------ |
| GET    | `/`   | A S C | Tax rate, delivery fee and currency drive checkout totals     |
| PUT    | `/`   | A     | Update business settings                                      |

---

## `/api/health`

`GET /api/health` → `{ "success": true, "message": "Server is healthy", "timestamp": "..." }`

---

## Rate limiting

100 requests per 15 minutes per IP across `/api/`, returning `429`. Disabled when
`NODE_ENV=test`.
