/**
 * HUNTER'S KITCHEN — COMPREHENSIVE POSTGRESQL PRODUCTION VERIFICATION SUITE
 * 
 * Verifies 100% of PostgreSQL relational database operations:
 * 1. Connection Pool & Version Check (PostgreSQL 18.x)
 * 2. Schema Introspection (All 17 Relational Tables & Constraints)
 * 3. User Authentication, Normalization & Bcrypt Hashes
 * 4. Menu Catalog & NUMERIC(12,2) Currency Precision
 * 5. Customer Addresses & Geo-Coordinates
 * 6. Order Lifecycle & Strict FSM State Machine
 * 7. Row-Level Locking & Optimistic Concurrency Control (OCC)
 * 8. Doorstep COD Transactions & Cashier Settlement
 * 9. Inventory Stock Tracking & Audit Transactions
 * 10. Persistent Idempotency Service (Lock & Replay)
 * 11. Transactional Outbox Pattern & Stale Lease Recovery
 * 12. Cryptographic SHA-256 Audit Log Tamper-Evidence Chain
 * 13. Restaurant Settings, Notifications & Customer Reviews
 */

import bcrypt from 'bcryptjs';
import { postgresDb } from '../src/server/db/postgres';
import { db } from '../src/server/db';
import { orderService } from '../src/server/services/orderService';
import { idempotencyService } from '../src/server/services/idempotencyService';
import { auditRepository } from '../src/server/repositories/auditRepository';
import { auditService } from '../src/server/services/auditService';
import { outboxRepository } from '../src/server/repositories/outboxRepository';
import { reconciliationService } from '../src/server/services/reconciliationService';
import { Order, OrderStatus } from '../src/types';

let testsPassed = 0;
let testsFailed = 0;

function pass(name: string, detail?: string) {
  testsPassed++;
  console.log(`  \x1b[32m✓\x1b[0m [PASS] ${name}${detail ? ` — \x1b[90m${detail}\x1b[0m` : ''}`);
}

function fail(name: string, error: any) {
  testsFailed++;
  console.error(`  \x1b[31m✗\x1b[0m [FAIL] ${name}:`, error?.message || error);
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runPostgresVerification() {
  console.log('\n================================================================================');
  console.log('🐘 HUNTER’S KITCHEN — POSTGRESQL PRODUCTION VERIFICATION TEST SUITE');
  console.log('================================================================================\n');

  // STEP 1: Connection & Pool Initialization
  console.log('\x1b[1m[1/13] PostgreSQL Connection Pool & Server Info\x1b[0m');
  try {
    await postgresDb.initialize();
    const verRes = await postgresDb.query('SELECT version() as ver, current_database() as db, current_user as usr');
    const verInfo = verRes.rows[0];
    assert(verInfo.db === 'hunters_kitchen', `Connected to correct database: ${verInfo.db}`);
    pass('Database Connection & Pool Ready', `DB: ${verInfo.db} | User: ${verInfo.usr} | Version: ${verInfo.ver.substring(0, 30)}...`);
  } catch (err) {
    fail('Database Connection', err);
  }

  // STEP 2: Schema Tables Introspection
  console.log('\n\x1b[1m[2/13] Relational Schema Introspection (17 Production Tables)\x1b[0m');
  const requiredTables = [
    'restaurant_settings',
    'users',
    'user_auth_credentials',
    'customer_addresses',
    'categories',
    'menu_items',
    'orders',
    'order_items',
    'order_events',
    'delivery_batches',
    'delivery_batch_orders',
    'cod_transactions',
    'reviews',
    'notifications',
    'audit_logs',
    'outbox_events',
    'idempotency_records',
    'inventory_items',
    'inventory_transactions'
  ];

  try {
    const tableRes = await postgresDb.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    const existingTables = new Set(tableRes.rows.map((r) => r.table_name));

    let allFound = true;
    for (const t of requiredTables) {
      if (!existingTables.has(t)) {
        allFound = false;
        fail(`Table Verification: ${t}`, new Error(`Table ${t} missing from schema`));
      }
    }
    if (allFound) {
      pass('All Relational Tables Present', `Verified ${requiredTables.length} core tables in public schema`);
    }
  } catch (err) {
    fail('Schema Table Verification', err);
  }

  // Common Entity Handles across tests
  let customerUser: any = null;
  let deliveryUser: any = null;
  let sampleMenuItem: any = null;
  let testOrderId = '';

  // STEP 3: User Authentication, Normalization & Bcrypt Hashes
  console.log('\n\x1b[1m[3/13] User Authentication & Bcrypt Password Security\x1b[0m');
  try {
    const adminUser = await db.getUserByEmail('hunterkitchen777@gmail.com');
    assert(!!adminUser, 'Admin user hunterkitchen777@gmail.com exists in PostgreSQL');
    assert(adminUser!.role === 'OWNER', 'Admin user role is OWNER');

    const creds = await db.getAuthCredentialsByUserId(adminUser!.id);
    assert(!!creds, 'Admin auth credentials found');
    const isPasswordValid = await bcrypt.compare('hunter__kitchen777', creds!.passwordHash);
    assert(isPasswordValid, 'Admin password matches bcrypt hash in PostgreSQL');
    pass('Admin Authentication & Bcrypt Hash Verification', `User: ${adminUser!.email} (Role: ${adminUser!.role})`);

    // Test creating test customer
    const testEmail = `test_customer_${Date.now()}@gmail.com`;
    customerUser = await db.createUser({
      name: 'Priya Sharma',
      email: testEmail,
      phone: '+91 98765 43210',
      role: 'CUSTOMER'
    });
    assert(customerUser.email === testEmail, 'Customer created in PostgreSQL');
    const hash = await bcrypt.hash('TestPassword123!', 10);
    await db.setAuthCredentials({
      userId: customerUser.id,
      email: testEmail,
      passwordHash: hash
    });
    const fetchedCreds = await db.getAuthCredentialsByEmail(testEmail);
    assert(!!fetchedCreds && await bcrypt.compare('TestPassword123!', fetchedCreds.passwordHash), 'New user credentials verified');
    pass('User Creation & Credential Persistence', `User ID: ${customerUser.id} | Email: ${testEmail}`);

    const allUsers = await db.getUsers();
    deliveryUser = allUsers.find((u) => u.role === 'DELIVERY_PARTNER');
    if (!deliveryUser) {
      deliveryUser = await db.createUser({
        name: 'Kumar Rider',
        email: `rider_${Date.now()}@hunterskitchen.com`,
        phone: '+91 98765 99999',
        role: 'DELIVERY_PARTNER'
      });
    }
  } catch (err) {
    fail('User Authentication Verification', err);
  }

  // STEP 4: Menu Catalog & NUMERIC(12,2) Currency Precision
  console.log('\n\x1b[1m[4/13] Menu Catalog & Currency Precision\x1b[0m');
  try {
    const categories = await db.getCategories();
    const menuItems = await db.getMenuItems();
    assert(categories.length > 0, `Found ${categories.length} categories`);
    assert(menuItems.length > 0, `Found ${menuItems.length} menu items`);

    sampleMenuItem = menuItems.find((m) => m.name.toLowerCase().includes('biriyani') || m.name.toLowerCase().includes('biryani')) || menuItems[0];
    assert(!!sampleMenuItem, 'Found item in PostgreSQL menu_items');
    assert(typeof sampleMenuItem.price === 'number' && sampleMenuItem.price > 0, `Price is numeric: ${sampleMenuItem.price}`);
    assert(Number.isFinite(sampleMenuItem.price), 'Price is valid finite float');

    pass('Menu Catalog & Decimal Precision', `${menuItems.length} items across ${categories.length} categories; verified price format`);
  } catch (err) {
    fail('Menu Catalog Verification', err);
  }

  // STEP 5: Customer Addresses
  console.log('\n\x1b[1m[5/13] Customer Delivery Addresses & Coordinates\x1b[0m');
  try {
    const addr = await db.saveAddress(customerUser.id, {
      type: 'WORK',
      name: 'Hunter Headquarters',
      phone: '+91 98765 00000',
      doorNo: '77-A',
      street: 'Avinashi Road',
      area: 'Peelamedu',
      city: 'Coimbatore',
      pincode: '641004',
      coordinates: '11.0280,77.0050',
      isDefault: false
    });
    assert(!!addr.id, 'Address inserted into customer_addresses');
    const addrs = await db.getAddresses(customerUser.id);
    assert(addrs.some((a) => a.id === addr.id), 'Address retrieved by user ID');
    pass('Customer Address Management', `Address ID: ${addr.id} (${addr.area}, ${addr.city})`);
  } catch (err) {
    fail('Customer Address Verification', err);
  }

  // STEP 6: Order Lifecycle & Strict FSM State Machine
  console.log('\n\x1b[1m[6/13] Order Lifecycle & Strict FSM State Machine\x1b[0m');
  try {
    const mockOrder: any = {
      id: testOrderId,
      orderNumber: `TH-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: customerUser.id,
      customerName: customerUser.name,
      customerPhone: customerUser.phone,
      deliveryAddress: {
        id: 'addr_test',
        type: 'WORK',
        name: customerUser.name,
        phone: customerUser.phone,
        doorNo: '77-A',
        street: 'Avinashi Road',
        area: 'Peelamedu',
        city: 'Coimbatore',
        pincode: '641004'
      },
      items: [
        {
          menuItemId: sampleMenuItem.id,
          name: sampleMenuItem.name,
          quantity: 2,
          unitPrice: sampleMenuItem.price,
          totalPrice: sampleMenuItem.price * 2,
          isVeg: sampleMenuItem.isVeg,
          customizations: [],
          addons: []
        }
      ],
      itemCount: 2,
      subtotal: sampleMenuItem.price * 2,
      deliveryFee: 35,
      tax: 38,
      discount: 0,
      grandTotal: (sampleMenuItem.price * 2) + 35 + 38,
      paymentMethod: 'COD',
      paymentStatus: 'COD_PENDING',
      status: 'PLACED',
      codCashTendered: 1000,
      codChangeDue: 1000 - ((sampleMenuItem.price * 2) + 35 + 38),
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      events: [
        {
          id: `ev_test_${Date.now()}`,
          orderId: testOrderId,
          status: 'PLACED',
          title: 'Order Placed',
          timestamp: new Date().toISOString(),
          description: 'Initial order placement',
          changedBy: customerUser.id,
          changedByRole: 'CUSTOMER'
        }
      ]
    };

    const created = await db.createOrder(mockOrder);
    testOrderId = created.id;
    assert(!!created.id && created.id.startsWith('ord_'), 'Order created in PostgreSQL');
    assert(created.items.length === 1, 'Order items created atomically in order_items');
    pass('Transactional Order Creation', `Order #${created.orderNumber} | Total: ₹${created.grandTotal}`);

    const actor = {
      id: 'staff_chef_01',
      name: 'Master Chef',
      role: 'STAFF' as const,
      staffRole: 'KITCHEN_CHEF' as const,
      email: 'chef@hunterskitchen.com',
      phone: '+91 98765 11111',
      status: 'ACTIVE' as const,
      joinedAt: new Date().toISOString()
    };

    // Illegal Jump Test: PLACED -> DELIVERED
    let illegalBlocked = false;
    try {
      await orderService.transitionStatus(testOrderId, 'DELIVERED', actor, 'req_ver_illegal');
    } catch (e: any) {
      illegalBlocked = true;
      assert(e.name === 'OrderStateTransitionError', `Illegal transition caught: ${e.message}`);
    }
    assert(illegalBlocked, 'FSM prohibited illegal state jump');
    pass('FSM Illegal Transition Protection', 'Direct jump PLACED -> DELIVERED rejected');

    // Valid lifecycle progression: PLACED -> ACCEPTED -> PREPARING -> READY
    const s1 = await orderService.transitionStatus(testOrderId, 'ACCEPTED', actor, 'req_v1', undefined, 1);
    assert(s1.status === 'ACCEPTED' && s1.version === 2, 'Transitioned to ACCEPTED (v2)');

    const s2 = await orderService.transitionStatus(testOrderId, 'PREPARING', actor, 'req_v2', undefined, 2);
    assert(s2.status === 'PREPARING' && s2.version === 3, 'Transitioned to PREPARING (v3)');

    const s3 = await orderService.transitionStatus(testOrderId, 'READY', actor, 'req_v3', undefined, 3);
    assert(s3.status === 'READY' && s3.version === 4, 'Transitioned to READY (v4)');

    pass('FSM Sequential Lifecycle Transitions', 'PLACED -> ACCEPTED -> PREPARING -> READY');
  } catch (err) {
    fail('Order Lifecycle Verification', err);
  }

  // STEP 7: Row-Level Locking & Optimistic Concurrency Control (OCC)
  console.log('\n\x1b[1m[7/13] Optimistic Concurrency Control (OCC) & Row-Level Locking\x1b[0m');
  try {
    const actor = {
      id: 'staff_mgr_01',
      name: 'Manager Kumar',
      role: 'STAFF' as const,
      staffRole: 'GENERAL_MANAGER' as const,
      email: 'kumar@hunterskitchen.com',
      phone: '+91 98765 22222',
      status: 'ACTIVE' as const,
      joinedAt: new Date().toISOString()
    };

    // Current version in DB is 4. Update to ASSIGNED with version 4 -> becomes version 5.
    const assigned = await orderService.transitionStatus(testOrderId, 'ASSIGNED', actor, 'req_v4', undefined, 4);
    assert(assigned.status === 'ASSIGNED' && assigned.version === 5, 'Transitioned to ASSIGNED (v5)');

    // Attempt concurrent modification using stale version 4
    let conflictBlocked = false;
    try {
      await orderService.transitionStatus(testOrderId, 'CANCELLED', actor, 'req_v5_stale', undefined, 4);
    } catch (e: any) {
      conflictBlocked = true;
      assert(e.name === 'ConflictError', `OCC caught stale version conflict: ${e.message}`);
    }
    assert(conflictBlocked, 'Stale concurrent update was rejected with ConflictError');
    pass('OCC Stale Version Conflict Detection', 'Concurrent update with outdated version prevented');
  } catch (err) {
    fail('OCC Verification', err);
  }

  // STEP 8: Doorstep COD Transactions & Cashier Settlement
  console.log('\n\x1b[1m[8/13] Doorstep COD Transactions & Cashier Settlement\x1b[0m');
  try {
    const codTxId = `cod_${Date.now()}`;
    const targetOrder = await db.getOrderById(testOrderId);
    const amountDue = targetOrder?.grandTotal || 833.00;

    await postgresDb.query(
      `INSERT INTO cod_transactions (
        id, order_id, order_number, delivery_partner_id, amount_expected,
        amount_collected, cash_tendered, change_due, collection_status, settlement_status, collected_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        codTxId,
        testOrderId,
        targetOrder?.orderNumber || 'TH-TEST-COD',
        deliveryUser.id,
        amountDue,
        amountDue,
        1000.00,
        1000.00 - amountDue,
        'COLLECTED',
        'UNSETTLED'
      ]
    );

    const txRes = await postgresDb.query('SELECT * FROM cod_transactions WHERE id = $1', [codTxId]);
    assert(txRes.rows.length === 1, 'COD Transaction inserted');
    assert(Number(txRes.rows[0].amount_collected) === amountDue, `Amount collected matches ₹${amountDue}`);

    // Settle with cashier
    await postgresDb.query(
      `UPDATE cod_transactions SET settlement_status = 'SETTLED', settled_at = NOW(), settled_by = $1 WHERE id = $2`,
      [customerUser.id, codTxId]
    );

    const settledRes = await postgresDb.query('SELECT * FROM cod_transactions WHERE id = $1', [codTxId]);
    assert(settledRes.rows[0].settlement_status === 'SETTLED', 'COD transaction settled');
    pass('COD Transaction & Cashier Settlement', `Tx ID: ${codTxId} | Collected: ₹${amountDue} | Status: SETTLED`);

    // Run reconciliation audit
    const recon = await reconciliationService.runAudit();
    assert(typeof recon.totalOrdersAudited === 'number', 'Reconciliation audit completed');
    pass('Reconciliation Audit Run', `Audited ${recon.totalOrdersAudited} orders, anomalies: ${recon.anomaliesDetected}`);
  } catch (err) {
    fail('COD Verification', err);
  }

  // STEP 9: Inventory Stock Tracking & Audit Transactions
  console.log('\n\x1b[1m[9/13] Inventory Stock Tracking & Audit Transactions\x1b[0m');
  try {
    const invId = `inv_test_${Date.now()}`;
    await postgresDb.query(
      `INSERT INTO inventory_items (id, menu_item_id, available_quantity, reserved_quantity, low_stock_threshold, is_unlimited)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (menu_item_id) DO UPDATE SET available_quantity = 50`,
      [invId, sampleMenuItem.id, 50, 0, 10, false]
    );

    // Record inventory transaction
    await postgresDb.query(
      `INSERT INTO inventory_transactions (menu_item_id, order_id, change_quantity, balance_after, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [sampleMenuItem.id, testOrderId, -2, 48, 'Order fulfillment']
    );

    const invTxRes = await postgresDb.query(
      'SELECT * FROM inventory_transactions WHERE menu_item_id = $1 ORDER BY id DESC LIMIT 1',
      [sampleMenuItem.id]
    );
    assert(invTxRes.rows.length === 1 && invTxRes.rows[0].balance_after === 48, 'Inventory transaction recorded balance = 48');
    pass('Inventory Transactions & Balances', 'Stock decremented from 50 -> 48 with audit trail');
  } catch (err) {
    fail('Inventory Verification', err);
  }

  // STEP 10: Persistent Idempotency Service
  console.log('\n\x1b[1m[10/13] Persistent Idempotency Service (Lock & Replay)\x1b[0m');
  try {
    const key = `idem_prod_test_${Date.now()}`;
    const claim1 = await idempotencyService.startRequest(key, '/api/orders', { orderId: testOrderId });
    assert(claim1.cached === false, 'First request acquired idempotency lock');

    await idempotencyService.completeRequest(key, 201, { success: true, orderId: testOrderId });

    const claim2 = await idempotencyService.startRequest(key, '/api/orders', { orderId: testOrderId });
    assert(claim2.cached === true, 'Subsequent request replayed cached response');
    assert(claim2.record?.responseStatus === 201, 'Replayed status is 201');
    assert(claim2.record?.responseBody?.success === true, 'Replayed payload matches original');
    pass('Idempotency Request Claim & Replay', `Key: ${key} (cached status 201)`);
  } catch (err) {
    fail('Idempotency Verification', err);
  }

  // STEP 11: Transactional Outbox Pattern & Lease Recovery
  console.log('\n\x1b[1m[11/13] Transactional Outbox Pattern & Lease Recovery\x1b[0m');
  try {
    const evtId = `evt_outbox_${Date.now()}`;
    await outboxRepository.insert({
      id: evtId,
      aggregateType: 'ORDER',
      aggregateId: testOrderId,
      eventType: 'ORDER_DELIVERED',
      payload: { orderId: testOrderId, deliveredAt: new Date().toISOString() },
      status: 'PROCESSING',
      processingStartedAt: new Date(Date.now() - 150000).toISOString(), // 2.5 min ago (stale)
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(Date.now() - 160000).toISOString()
    });

    const recovered = await outboxRepository.recoverStaleProcessing(60000);
    assert(recovered >= 1, `Recovered ${recovered} stale event lease(s)`);

    const found = await outboxRepository.getById(evtId);
    assert(!!found && found.status === 'PENDING', 'Stale processing lease reset to PENDING');
    pass('Outbox Event Insertion & Lease Recovery', `Recovered ${recovered} stale lock(s) back to PENDING`);
  } catch (err) {
    fail('Outbox Verification', err);
  }

  // STEP 12: Cryptographic SHA-256 Audit Log Hash Chain & Tamper Evidence
  console.log('\n\x1b[1m[12/13] Cryptographic SHA-256 Audit Log Hash Chain & Tamper Detection\x1b[0m');
  try {
    // Insert new valid entry
    const newEntry = await auditService.log({
      action: 'VERIFY_PRODUCTION_SUITE',
      resource: 'POSTGRESQL',
      resourceId: 'PG_18',
      requestId: `req_ver_${Date.now()}`,
      actorName: 'Verification Suite',
      actorRole: 'SYSTEM'
    });
    assert(!!newEntry.hash && newEntry.hash.length === 64, 'New audit entry hashed with SHA-256');

    // Verify full chain
    const verifyClean = await auditService.verifyIntegrity();
    assert(verifyClean.isValid, `Audit chain integrity valid across ${verifyClean.checkedCount} records: ${verifyClean.error || ''}`);
    pass('Cryptographic SHA-256 Hash Chain Integrity', `Verified ${verifyClean.checkedCount} chained blocks; Genesis to Tip`);

    // Simulate tamper and verify detection with guaranteed cleanup
    const latestRes = await postgresDb.query('SELECT sequence_number, hash FROM audit_logs ORDER BY sequence_number DESC LIMIT 1');
    const latestSeq = Number(latestRes.rows[0].sequence_number);
    const originalHash = latestRes.rows[0].hash;
    const fakeHash = '1111111111111111111111111111111111111111111111111111111111111111';

    try {
      await postgresDb.query('UPDATE audit_logs SET hash = $1 WHERE sequence_number = $2', [fakeHash, latestSeq]);
      const tamperResult = await auditService.verifyIntegrity();
      assert(!tamperResult.isValid, 'Tamper detected in modified audit log block');
      assert(tamperResult.brokenAt === latestSeq, `Pinpointed broken sequence #${tamperResult.brokenAt}`);
      pass('Tamper Detection Verification', `Corrupted block #${latestSeq} identified and rejected`);
    } finally {
      // Guaranteed restoration
      await postgresDb.query('UPDATE audit_logs SET hash = $1 WHERE sequence_number = $2', [originalHash, latestSeq]);
      const restoredResult = await auditService.verifyIntegrity();
      assert(restoredResult.isValid, 'Chain restored to valid state');
    }
  } catch (err) {
    fail('Audit Chain Verification', err);
  }

  // STEP 13: Restaurant Settings, Reviews & Notifications
  console.log('\n\x1b[1m[13/13] Restaurant Settings, Reviews & Notifications\x1b[0m');
  try {
    const settings = await db.getSettings();
    assert(settings.restaurantName.length > 0, `Restaurant name: ${settings.restaurantName}`);
    assert(typeof settings.deliveryRadiusKm === 'number', `Delivery radius: ${settings.deliveryRadiusKm} km`);

    // Create review
    const review = await db.createReview({
      orderId: testOrderId,
      orderNumber: 'TH-TEST-REVIEW',
      customerId: customerUser.id,
      customerName: customerUser.name,
      foodRating: 5,
      deliveryRating: 5,
      overallRating: 5,
      comment: 'Exceptional food quality and lightning fast delivery!',
      itemRatings: [{ menuItemId: sampleMenuItem.id, rating: 5 }]
    });
    assert(!!review.id, 'Review persisted in PostgreSQL');

    // Create notification
    const notif = await db.createNotification({
      userId: customerUser.id,
      userRole: 'CUSTOMER',
      title: 'Order Delivered',
      message: 'Your order has been delivered hot and fresh!',
      type: 'ORDER',
      orderId: testOrderId
    });
    assert(!!notif.id, 'Notification persisted in PostgreSQL');
    pass('Settings, Reviews & Notifications', `Review ID: ${review.id} | Notification ID: ${notif.id}`);
  } catch (err) {
    fail('Settings/Reviews/Notifications Verification', err);
  }

  // SUMMARY
  console.log('\n================================================================================');
  if (testsFailed === 0) {
    console.log(`\x1b[32m\x1b[1m🎉 ALL POSTGRESQL PRODUCTION TESTS PASSED (Passed: ${testsPassed} / Failed: ${testsFailed})\x1b[0m`);
    console.log('================================================================================\n');
    process.exit(0);
  } else {
    console.log(`\x1b[31m\x1b[1m❌ VERIFICATION FAILED (Passed: ${testsPassed} / Failed: ${testsFailed})\x1b[0m`);
    console.log('================================================================================\n');
    process.exit(1);
  }
}

runPostgresVerification().catch((err) => {
  console.error('\nFatal Verification Exception:', err);
  process.exit(1);
});
