# POSTGRES_MIGRATION_AUDIT.md
## Hunter’s Kitchen — PostgreSQL Production Migration Audit
**Generated:** 2026-10-03  
**Status:** Pre-Migration Audit Completed  
**Target Database:** PostgreSQL 18.x (Relational Source of Truth)  
**Cache/Lock Engine:** Redis (Performance/TTL/Rate-Limiting only)

---

## 1. Existing Database Engine Architecture

### A. Current Implementation Overview
The application currently uses an embedded **File-based JSON Document Database Engine** implemented in [`src/server/db.ts`](file:///d:/xampp/htdocs/hunter's-kitchen/src/server/db.ts), paired with specialized disk stores:
1. **Primary Store**: `data/database.json` (Stores Settings, Users, Categories, Menu Items, Orders, Delivery Batches, Reviews, Notifications, Addresses, and Auth Credentials).
2. **Audit Store**: `data/audit_logs.json` (Stores SHA-256 cryptographically chained audit events).
3. **Outbox Store**: `data/outbox_events.json` (Stores transactional outbox events for background worker dispatch).
4. **Idempotency Store**: `data/idempotency_store.json` (Stores API idempotency keys with TTL expiry).

### B. Current Persistence & Concurrency Characteristics
- **Persistence Mechanism**: In-memory JavaScript heap state serialized to disk using `fs.writeFileSync(..., JSON.stringify(..., null, 2))` with a modified timestamp check on disk sync.
- **Transactions**: Emulated synchronously in Node.js event loop memory; lacks true ACID rollback across failures.
- **Concurrency & Locking**: In-memory single-process mutual exclusion via Node.js single-thread execution, but prone to race conditions if multiple worker processes or containers scale out. Optimistic concurrency control via `order.version`.
- **ID Generation**: Prefix-based string IDs (`usr_...`, `ord_...`, `item_...`, `cat_...`, `addr_...`, `rev_...`, `notif_...`, `evt_...`, `batch_...`).
- **Cryptographic Security**: Passwords stored as bcrypt hashes (`$2b$10$...`) in `authCredentials` dictionary.

---

## 2. Existing Entity Inventory & Field Analysis

| Entity | Primary Key | Key Fields & Types | Relationships | Constraints & Rules |
|---|---|---|---|---|
| **RestaurantSettings** | Singleton (`rest_hunter_01`) | `restaurantName` (TEXT), `phone` (TEXT), `email` (TEXT), `address` (TEXT), `isOpen` (BOOL), `temporaryPause` (BOOL), `pauseReason` (TEXT), `openingTime` (TEXT), `closingTime` (TEXT), `deliveryRadiusKm` (NUM), `baseDeliveryFee` (NUM), `freeDeliveryThreshold` (NUM), `codEnabled` (BOOL), `onlinePaymentEnabled` (BOOL), `announcement` (TEXT) | None | Exactly 1 active settings record |
| **Users** | `id` (VARCHAR) | `name` (TEXT), `email` (TEXT), `phone` (TEXT), `role` (ENUM: CUSTOMER, STAFF, OWNER, DELIVERY_PARTNER), `staffRole` (ENUM: KITCHEN_STAFF, GENERAL_MANAGER, KITCHEN_MANAGER, etc.), `status` (ENUM: ACTIVE, INACTIVE, INVITED, SUSPENDED), `partnerStatus` (ENUM: ONLINE, OFFLINE), `vehicleNumber` (TEXT), `vehicleType` (TEXT), `currentRating` (NUM), `totalDeliveries` (INT), `joinedAt` (TIMESTAMPTZ), `permissions` (JSONB/ARRAY), `restaurantId` (TEXT), `googleId` (TEXT), `emailVerified` (BOOL) | Foreign references from Orders, Batches, Addresses, Reviews, Notifications | Unique `email` (case-insensitive), Unique `phone`, Unique `googleId` |
| **UserAuthCredentials** | `userId` (FK to Users) | `email` (TEXT), `passwordHash` (TEXT), `resetPasswordToken` (TEXT), `resetPasswordExpires` (BIGINT/TIMESTAMPTZ), `inviteToken` (TEXT), `inviteExpires` (BIGINT/TIMESTAMPTZ), `failedLoginAttempts` (INT), `lastFailedLogin` (BIGINT/TIMESTAMPTZ) | Belongs to `Users(id)` | 1-to-1 with Users. Passwords must be bcrypt hashed. |
| **CustomerAddresses** | `id` (VARCHAR) | `customerId` (FK to Users), `type` (ENUM: HOME, WORK, OTHER), `name` (TEXT), `phone` (TEXT), `doorNo` (TEXT), `street` (TEXT), `area` (TEXT), `city` (TEXT), `pincode` (TEXT), `landmark` (TEXT), `instructions` (TEXT), `coordinates` (TEXT), `isDefault` (BOOL) | Belongs to `Users(id)` | Max 1 default address per customer |
| **Categories** | `id` (VARCHAR) | `name` (TEXT), `description` (TEXT), `icon` (TEXT), `itemCount` (INT), `sortOrder` (INT) | 1-to-Many with MenuItems | Unique category `name` |
| **MenuItems** | `id` (VARCHAR) | `name` (TEXT), `description` (TEXT), `categoryId` (FK to Categories), `categoryName` (TEXT), `price` (NUMERIC), `discountPrice` (NUMERIC), `imageUrl` (TEXT), `isVeg` (BOOL), `isAvailable` (BOOL), `prepTimeMinutes` (INT), `isPopular` (BOOL), `isBestseller` (BOOL), `rating` (NUMERIC), `ratingCount` (INT), `customizations` (JSONB), `addons` (JSONB), `ingredients` (JSONB/ARRAY) | Belongs to `Categories(id)` | Non-negative prices. `discountPrice <= price`. |
| **Orders** | `id` (VARCHAR) | `orderNumber` (VARCHAR UNIQUE), `customerId` (FK to Users), `customerName` (TEXT), `customerPhone` (TEXT), `deliveryAddress` (JSONB), `orderNotes` (TEXT), `subtotal` (NUMERIC), `deliveryFee` (NUMERIC), `tax` (NUMERIC), `discount` (NUMERIC), `grandTotal` (NUMERIC), `paymentMethod` (ENUM: ONLINE, COD), `paymentStatus` (ENUM: PENDING, VERIFIED, COD_PENDING, PAID_CASH, FAILED, REFUNDED), `paymentTransactionId` (TEXT), `codCashTendered` (NUMERIC), `codChangeDue` (NUMERIC), `status` (ENUM: PLACED, ACCEPTED, REJECTED, PREPARING, READY, ASSIGNED, PICKED_UP, OUT_FOR_DELIVERY, DELIVERED, CANCELLED), `rejectionReason` (TEXT), `cancellationReason` (TEXT), `assignedStaffId` (FK to Users), `assignedDeliveryPartnerId` (FK to Users), `batchId` (VARCHAR), `checklist` (JSONB), `scheduledSlot` (JSONB), `version` (INT), `createdAt` (TIMESTAMPTZ), `acceptedAt` (TIMESTAMPTZ), `preparingAt` (TIMESTAMPTZ), `readyAt` (TIMESTAMPTZ), `pickedUpAt` (TIMESTAMPTZ), `deliveredAt` (TIMESTAMPTZ), `cancelledAt` (TIMESTAMPTZ), `updatedAt` (TIMESTAMPTZ) | Has Many `OrderItems`, `OrderEvents`, References `Users(id)` | Strict state machine transitions. Immutable snapshot prices. Non-negative totals. |
| **OrderItems** | `id` (BIGSERIAL / VARCHAR) | `orderId` (FK to Orders), `menuItemId` (FK to MenuItems), `name` (TEXT), `unitPrice` (NUMERIC), `quantity` (INT), `isVeg` (BOOL), `customizations` (JSONB), `addons` (JSONB), `specialInstructions` (TEXT), `totalPrice` (NUMERIC) | Belongs to `Orders(id)` | `quantity >= 1`, `totalPrice >= 0` |
| **OrderEvents** | `id` (VARCHAR) | `orderId` (FK to Orders), `status` (VARCHAR), `title` (TEXT), `description` (TEXT), `timestamp` (TIMESTAMPTZ), `changedBy` (TEXT), `changedByRole` (TEXT) | Belongs to `Orders(id)` | Audit trail of order status lifecycle |
| **DeliveryBatches** | `id` (VARCHAR) | `batchNumber` (VARCHAR), `deliveryPartnerId` (FK to Users), `deliveryPartnerName` (TEXT), `orderIds` (JSONB/ARRAY), `status` (ENUM: ASSIGNED, IN_TRANSIT, COMPLETED), `createdAt` (TIMESTAMPTZ), `completedAt` (TIMESTAMPTZ) | References `Users(id)` | Links multiple orders to single driver trip |
| **Reviews** | `id` (VARCHAR) | `orderId` (FK to Orders), `orderNumber` (VARCHAR), `customerId` (FK to Users), `customerName` (TEXT), `foodRating` (NUMERIC), `deliveryRating` (NUMERIC), `overallRating` (NUMERIC), `comment` (TEXT), `itemRatings` (JSONB), `createdAt` (TIMESTAMPTZ) | Belongs to `Orders(id)` and `Users(id)` | Ratings between 1.0 and 5.0 |
| **Notifications** | `id` (VARCHAR) | `userId` (FK to Users), `userRole` (TEXT), `title` (TEXT), `message` (TEXT), `type` (ENUM: ORDER, PAYMENT, OFFER, SYSTEM), `isRead` (BOOL), `orderId` (FK to Orders), `createdAt` (TIMESTAMPTZ) | Belongs to `Users(id)` | Auto-delivered in real-time |
| **AuditLogs** | `id` (VARCHAR) | `sequenceNumber` (BIGSERIAL/BIGINT), `actorId` (TEXT), `actorName` (TEXT), `actorRole` (TEXT), `action` (TEXT), `resource` (TEXT), `resourceId` (TEXT), `oldValue` (JSONB), `newValue` (JSONB), `requestId` (TEXT), `ipAddress` (TEXT), `timestamp` (TIMESTAMPTZ), `previousHash` (TEXT), `hash` (TEXT) | References actor and resource | Cryptographic hash chain (`prevHash -> hash`) |
| **OutboxEvents** | `id` (VARCHAR) | `aggregateType` (TEXT), `aggregateId` (TEXT), `eventType` (TEXT), `payload` (JSONB), `status` (ENUM: PENDING, PROCESSING, COMPLETED, FAILED, DEAD_LETTER), `retryCount` (INT), `maxRetries` (INT), `lastError` (TEXT), `processingStartedAt` (TIMESTAMPTZ), `createdAt` (TIMESTAMPTZ), `processedAt` (TIMESTAMPTZ), `nextRetryAt` (TIMESTAMPTZ) | Refers to Aggregate Entities | Transactional Outbox Pattern |
| **IdempotencyRecords** | `key` (VARCHAR) | `requestPath` (TEXT), `requestHash` (TEXT), `status` (ENUM: IN_PROGRESS, COMPLETED, FAILED), `responseStatus` (INT), `responseBody` (JSONB), `createdAt` (TIMESTAMPTZ), `expiresAt` (TIMESTAMPTZ) | None | Unique request deduplication with automatic TTL |
| **CODTransactions & Settlements** | `id` (VARCHAR) | `orderId` (FK to Orders), `deliveryPartnerId` (FK to Users), `orderNumber` (TEXT), `amountExpected` (NUMERIC), `amountCollected` (NUMERIC), `cashTendered` (NUMERIC), `changeDue` (NUMERIC), `collectionStatus` (ENUM: PENDING, COLLECTED, FAILED), `settlementStatus` (ENUM: UNSETTLED, SETTLED), `collectedAt` (TIMESTAMPTZ), `settledAt` (TIMESTAMPTZ), `settledBy` (TEXT) | Belongs to `Orders(id)` and `Users(id)` | Doorstep cash collection and cashier settlement |

---

## 3. Database Access Points & Risk Assessment

| File | Function / Endpoint | Database Operation | Entity | Risk Level & Mitigation |
|---|---|---|---|---|
| `src/server/services/authService.ts` | `register` | User check, User create, Credential insert, Address insert, Audit log | `Users`, `UserAuthCredentials`, `CustomerAddresses`, `AuditLogs` | **HIGH**: Must be wrapped in a single ACID transaction to prevent orphan accounts without credentials. |
| `src/server/services/authService.ts` | `login`, `loginWithOtp` | Credential lookup, bcrypt compare, failed attempt update | `Users`, `UserAuthCredentials`, `AuditLogs` | **HIGH**: Parameterized queries, prevent brute-force race conditions via row locks. |
| `src/server/services/authService.ts` | `resetPassword`, `acceptInvite` | Token verification & password update | `UserAuthCredentials`, `Users`, `AuditLogs` | **HIGH**: Atomic token consumption and password hash replacement. |
| `src/server/services/orderService.ts` | `createOrder` | Cart verification, Order insert, OrderItems insert, Outbox insert, Audit log | `Orders`, `OrderItems`, `OutboxEvents`, `AuditLogs` | **CRITICAL**: Requires atomic PostgreSQL multi-table transaction with strict pricing validation. |
| `src/server/services/orderService.ts` | `transitionStatus` | FSM validation, Order status update, COD tracking, Outbox insert, Audit log | `Orders`, `CODTransactions`, `OutboxEvents`, `AuditLogs` | **CRITICAL**: Use `SELECT ... FOR UPDATE` row locking to prevent concurrent state transition race conditions. |
| `server.ts` | `/api/menu` (CRUD) | Menu create/update/delete | `MenuItems`, `Categories` | **MEDIUM**: Referential integrity with categories; invalidate cache on mutation. |
| `server.ts` | `/api/addresses/:customerId` | Address create/update/delete | `CustomerAddresses` | **LOW**: Customer-scoped CRUD with default address enforcement. |
| `server.ts` | `/api/delivery/batches` | Create batch, assign orders | `DeliveryBatches`, `Orders` | **HIGH**: Atomic transaction linking order IDs and updating driver status. |
| `src/server/repositories/auditRepository.ts` | `insert` | Cryptographic hash calculation and audit log insert | `AuditLogs` | **MEDIUM**: Serialized sequence numbers with `BIGSERIAL` and tamper-evident SHA-256 chain. |
| `src/server/repositories/outboxRepository.ts` | `insert`, `getPendingEvents`, `update` | Outbox event enqueue and polling | `OutboxEvents` | **HIGH**: Use `SELECT ... FOR UPDATE SKIP LOCKED` for concurrent worker processing. |
| `src/server/services/idempotencyService.ts` | `startRequest`, `completeRequest` | Lock acquisition and result caching | `IdempotencyRecords` | **MEDIUM**: Unique primary key constraint ensures strict idempotency under concurrency. |
| `src/server/services/reconciliationService.ts` | `runAudit` | Multi-table reconciliation audit | `Orders`, `CODTransactions`, `AuditLogs` | **LOW**: Read-only consistency verification. |

---

## 4. Current Source Data Snapshot Before Migration

- **Restaurant Settings**: 1 record
- **Users**: 20 records (1 Owner, 10 Staff/Managers, 4 Delivery Partners, 5 Customers)
- **Auth Credentials**: 20 records (all bcrypt hashed `$2b$10$...`)
- **Categories**: 9 records
- **Menu Items**: 63 records (with full price, customization, and addon structures)
- **Addresses**: 6 records across customer accounts
- **Audit Logs**: 21 records with valid cryptographic SHA-256 chains
- **Orders, Batches, Reviews, Notifications**: 0 active runtime records in current JSON file (ready for relational tables and schema seeding).

---

## 5. Migration Strategy & Phase Progression

1. **Schema Design**: Comprehensive PostgreSQL 18 relational schema with native `NUMERIC(12,2)`, `TIMESTAMPTZ`, `UUID`/`VARCHAR` primary keys, foreign keys, unique constraints, and check constraints.
2. **Database Layer**: Production-ready Connection Pool (`pg.Pool`) with transactional helper (`db.transaction(...)`), parameterized queries, health checks, and repository abstraction.
3. **Data Importer**: Safe, transactional, idempotent ETL migration script (`scripts/migrate_json_to_postgres.ts`) preserving all IDs, timestamps, hashes, and relational links.
4. **Application Integration**: Refactor all backend services and routes to use PostgreSQL as the sole authoritative source of truth.
5. **Validation & Testing**: Run end-to-end verification, concurrency tests, COD lifecycle tests, and generate full reconciliation and audit reports.
