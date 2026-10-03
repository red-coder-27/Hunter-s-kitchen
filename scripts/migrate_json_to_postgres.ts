import fs from 'fs';
import path from 'path';
import { postgresDb } from '../src/server/db/postgres';
import { logger } from '../src/server/utils/logger';

export interface MigrationReportData {
  entity: string;
  sourceCount: number;
  migratedCount: number;
  skippedCount: number;
  failedCount: number;
  status: 'PASS' | 'FAIL';
  details?: string;
}

export async function migrateJsonToPostgres(): Promise<{
  success: boolean;
  reports: MigrationReportData[];
  financialAudit: { sourceRevenue: number; postgresRevenue: number; matches: boolean };
}> {
  console.log('=== STARTING HUNTER’S KITCHEN JSON TO POSTGRESQL DATA MIGRATION ===');
  await postgresDb.initialize();

  const dataDir = path.join(process.cwd(), 'data');
  const dbFile = path.join(dataDir, 'database.json');
  const auditFile = path.join(dataDir, 'audit_logs.json');
  const outboxFile = path.join(dataDir, 'outbox_events.json');
  const idempotencyFile = path.join(dataDir, 'idempotency_store.json');

  if (!fs.existsSync(dbFile)) {
    throw new Error(`Database source file not found at ${dbFile}`);
  }

  const rawDb = fs.readFileSync(dbFile, 'utf-8');
  const db = JSON.parse(rawDb);
  const auditLogs = fs.existsSync(auditFile) ? JSON.parse(fs.readFileSync(auditFile, 'utf-8')) : [];
  const outboxEvents = fs.existsSync(outboxFile) ? JSON.parse(fs.readFileSync(outboxFile, 'utf-8')) : [];
  const idempotencyRecords = fs.existsSync(idempotencyFile) ? JSON.parse(fs.readFileSync(idempotencyFile, 'utf-8')) : [];

  const reports: MigrationReportData[] = [];

  await postgresDb.transaction(async (client) => {
    // 1. Migrate Restaurant Settings
    if (db.settings) {
      const s = db.settings;
      await client.query(
        `INSERT INTO restaurant_settings (
          id, restaurant_name, phone, email, address, is_open, temporary_pause,
          pause_reason, opening_time, closing_time, delivery_radius_km,
          base_delivery_fee, free_delivery_threshold, cod_enabled,
          online_payment_enabled, announcement, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW()
        ) ON CONFLICT (id) DO UPDATE SET
          restaurant_name = EXCLUDED.restaurant_name,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          address = EXCLUDED.address,
          is_open = EXCLUDED.is_open,
          temporary_pause = EXCLUDED.temporary_pause,
          pause_reason = EXCLUDED.pause_reason,
          opening_time = EXCLUDED.opening_time,
          closing_time = EXCLUDED.closing_time,
          delivery_radius_km = EXCLUDED.delivery_radius_km,
          base_delivery_fee = EXCLUDED.base_delivery_fee,
          free_delivery_threshold = EXCLUDED.free_delivery_threshold,
          cod_enabled = EXCLUDED.cod_enabled,
          online_payment_enabled = EXCLUDED.online_payment_enabled,
          announcement = EXCLUDED.announcement,
          updated_at = NOW()`,
        [
          'rest_hunter_01',
          s.restaurantName || "Hunter's Kitchen",
          s.phone || '+91 9944003172',
          s.email || 'contact@hunterskitchen.com',
          s.address || '77/7, Road, Chinnavedapatti, Saravanampatti, Coimbatore, Tamil Nadu 641035',
          s.isOpen !== false,
          s.temporaryPause === true,
          s.pauseReason || '',
          s.openingTime || '11:00 AM',
          s.closingTime || '11:00 PM',
          Number(s.deliveryRadiusKm || 10),
          Number(s.baseDeliveryFee || 35),
          Number(s.freeDeliveryThreshold || 500),
          s.codEnabled !== false,
          s.onlinePaymentEnabled !== false,
          s.announcement || ''
        ]
      );
      reports.push({
        entity: 'RestaurantSettings',
        sourceCount: 1,
        migratedCount: 1,
        skippedCount: 0,
        failedCount: 0,
        status: 'PASS'
      });
    }

    // 2. Migrate Users
    const users = db.users || [];
    let usersMigrated = 0;
    for (const u of users) {
      await client.query(
        `INSERT INTO users (
          id, name, email, phone, role, staff_role, avatar, status, partner_status,
          vehicle_number, vehicle_type, current_rating, total_deliveries,
          permissions, restaurant_id, google_id, email_verified, joined_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        ) ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          role = EXCLUDED.role,
          staff_role = EXCLUDED.staff_role,
          avatar = EXCLUDED.avatar,
          status = EXCLUDED.status,
          partner_status = EXCLUDED.partner_status,
          vehicle_number = EXCLUDED.vehicle_number,
          vehicle_type = EXCLUDED.vehicle_type,
          current_rating = EXCLUDED.current_rating,
          total_deliveries = EXCLUDED.total_deliveries,
          permissions = EXCLUDED.permissions,
          restaurant_id = EXCLUDED.restaurant_id,
          google_id = EXCLUDED.google_id,
          email_verified = EXCLUDED.email_verified`,
        [
          u.id,
          u.name,
          u.email.toLowerCase().trim(),
          u.phone,
          u.role,
          u.staffRole || null,
          u.avatar || null,
          u.status || 'ACTIVE',
          u.partnerStatus || (u.role === 'DELIVERY_PARTNER' ? 'ONLINE' : 'OFFLINE'),
          u.vehicleNumber || null,
          u.vehicleType || null,
          Number(u.currentRating || 5.0),
          Number(u.totalDeliveries || 0),
          JSON.stringify(u.permissions || []),
          u.restaurantId || 'rest_hunter_01',
          u.googleId || null,
          u.emailVerified === true,
          u.joinedAt || new Date().toISOString()
        ]
      );
      usersMigrated++;
    }
    reports.push({
      entity: 'Users',
      sourceCount: users.length,
      migratedCount: usersMigrated,
      skippedCount: 0,
      failedCount: 0,
      status: 'PASS'
    });

    // 3. Migrate User Auth Credentials
    const authCreds = Object.values(db.authCredentials || {}) as any[];
    let credsMigrated = 0;
    for (const c of authCreds) {
      await client.query(
        `INSERT INTO user_auth_credentials (
          user_id, email, password_hash, reset_password_token, reset_password_expires,
          invite_token, invite_expires, failed_login_attempts, last_failed_login
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        ) ON CONFLICT (user_id) DO UPDATE SET
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          reset_password_token = EXCLUDED.reset_password_token,
          reset_password_expires = EXCLUDED.reset_password_expires,
          invite_token = EXCLUDED.invite_token,
          invite_expires = EXCLUDED.invite_expires,
          failed_login_attempts = EXCLUDED.failed_login_attempts,
          last_failed_login = EXCLUDED.last_failed_login`,
        [
          c.userId,
          c.email.toLowerCase().trim(),
          c.passwordHash,
          c.resetPasswordToken || null,
          c.resetPasswordExpires ? new Date(c.resetPasswordExpires) : null,
          c.inviteToken || null,
          c.inviteExpires ? new Date(c.inviteExpires) : null,
          c.failedLoginAttempts || 0,
          c.lastFailedLogin ? new Date(c.lastFailedLogin) : null
        ]
      );
      credsMigrated++;
    }
    reports.push({
      entity: 'UserAuthCredentials',
      sourceCount: authCreds.length,
      migratedCount: credsMigrated,
      skippedCount: 0,
      failedCount: 0,
      status: 'PASS'
    });

    // 4. Migrate Customer Addresses
    let totalAddresses = 0;
    let addressesMigrated = 0;
    for (const [customerId, addrList] of Object.entries(db.addresses || {})) {
      if (!Array.isArray(addrList)) continue;
      for (const a of addrList as any[]) {
        totalAddresses++;
        await client.query(
          `INSERT INTO customer_addresses (
            id, customer_id, type, name, phone, door_no, street, area, city, pincode,
            landmark, instructions, coordinates, is_default
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
          ) ON CONFLICT (id) DO UPDATE SET
            customer_id = EXCLUDED.customer_id,
            type = EXCLUDED.type,
            name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            door_no = EXCLUDED.door_no,
            street = EXCLUDED.street,
            area = EXCLUDED.area,
            city = EXCLUDED.city,
            pincode = EXCLUDED.pincode,
            landmark = EXCLUDED.landmark,
            instructions = EXCLUDED.instructions,
            coordinates = EXCLUDED.coordinates,
            is_default = EXCLUDED.is_default`,
          [
            a.id,
            customerId,
            a.type || 'HOME',
            a.name,
            a.phone,
            a.doorNo,
            a.street,
            a.area,
            a.city,
            a.pincode,
            a.landmark || '',
            a.instructions || '',
            a.coordinates || '',
            a.isDefault === true
          ]
        );
        addressesMigrated++;
      }
    }
    reports.push({
      entity: 'CustomerAddresses',
      sourceCount: totalAddresses,
      migratedCount: addressesMigrated,
      skippedCount: 0,
      failedCount: 0,
      status: 'PASS'
    });

    // 5. Migrate Categories
    const categories = db.categories || [];
    let catsMigrated = 0;
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      await client.query(
        `INSERT INTO categories (
          id, name, description, icon, item_count, sort_order
        ) VALUES (
          $1, $2, $3, $4, $5, $6
        ) ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          icon = EXCLUDED.icon,
          item_count = EXCLUDED.item_count,
          sort_order = EXCLUDED.sort_order`,
        [
          cat.id,
          cat.name,
          cat.description || '',
          cat.icon || '',
          Number(cat.itemCount || 0),
          i + 1
        ]
      );
      catsMigrated++;
    }
    reports.push({
      entity: 'Categories',
      sourceCount: categories.length,
      migratedCount: catsMigrated,
      skippedCount: 0,
      failedCount: 0,
      status: 'PASS'
    });

    // 6. Migrate Menu Items & Initialize Inventory
    const menuItems = db.menuItems || [];
    let menuItemsMigrated = 0;
    for (const item of menuItems) {
      await client.query(
        `INSERT INTO menu_items (
          id, name, description, category_id, category_name, price, discount_price,
          image_url, is_veg, is_available, prep_time_minutes, is_popular,
          is_bestseller, rating, rating_count, customizations, addons, ingredients
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        ) ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          category_id = EXCLUDED.category_id,
          category_name = EXCLUDED.category_name,
          price = EXCLUDED.price,
          discount_price = EXCLUDED.discount_price,
          image_url = EXCLUDED.image_url,
          is_veg = EXCLUDED.is_veg,
          is_available = EXCLUDED.is_available,
          prep_time_minutes = EXCLUDED.prep_time_minutes,
          is_popular = EXCLUDED.is_popular,
          is_bestseller = EXCLUDED.is_bestseller,
          rating = EXCLUDED.rating,
          rating_count = EXCLUDED.rating_count,
          customizations = EXCLUDED.customizations,
          addons = EXCLUDED.addons,
          ingredients = EXCLUDED.ingredients`,
        [
          item.id,
          item.name,
          item.description || '',
          item.categoryId,
          item.categoryName,
          Number(item.price),
          item.discountPrice !== undefined && item.discountPrice !== null ? Number(item.discountPrice) : null,
          item.imageUrl || '',
          item.isVeg !== false,
          item.isAvailable !== false,
          Number(item.prepTimeMinutes || 15),
          item.isPopular === true,
          item.isBestseller === true,
          Number(item.rating || 5.0),
          Number(item.ratingCount || 0),
          JSON.stringify(item.customizations || []),
          JSON.stringify(item.addons || []),
          JSON.stringify(item.ingredients || [])
        ]
      );

      // Seed corresponding inventory item
      await client.query(
        `INSERT INTO inventory_items (
          id, menu_item_id, available_quantity, reserved_quantity, low_stock_threshold, is_unlimited
        ) VALUES (
          $1, $2, $3, $4, $5, $6
        ) ON CONFLICT (menu_item_id) DO NOTHING`,
        [`inv_${item.id}`, item.id, 100, 0, 10, true]
      );

      menuItemsMigrated++;
    }
    reports.push({
      entity: 'MenuItems',
      sourceCount: menuItems.length,
      migratedCount: menuItemsMigrated,
      skippedCount: 0,
      failedCount: 0,
      status: 'PASS'
    });

    // 7. Migrate Orders, Order Items, Order Events & COD Transactions
    const orders = db.orders || [];
    let ordersMigrated = 0;
    let orderItemsMigrated = 0;
    let orderEventsMigrated = 0;
    let codTxMigrated = 0;

    for (const o of orders) {
      await client.query(
        `INSERT INTO orders (
          id, order_number, customer_id, customer_name, customer_phone, delivery_address,
          order_notes, subtotal, delivery_fee, tax, discount, grand_total, payment_method,
          payment_status, payment_transaction_id, cod_cash_tendered, cod_change_due,
          status, rejection_reason, cancellation_reason, assigned_staff_id, assigned_staff_name,
          assigned_delivery_partner_id, assigned_delivery_partner_name, assigned_delivery_partner_phone,
          assigned_delivery_partner_vehicle, batch_id, checklist, scheduled_slot,
          has_been_reviewed, version, created_at, accepted_at, preparing_at, ready_at,
          picked_up_at, delivered_at, cancelled_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
          $33, $34, $35, $36, $37, $38
        ) ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          payment_status = EXCLUDED.payment_status,
          assigned_delivery_partner_id = EXCLUDED.assigned_delivery_partner_id,
          updated_at = NOW()`,
        [
          o.id,
          o.orderNumber,
          o.customerId,
          o.customerName,
          o.customerPhone,
          JSON.stringify(o.deliveryAddress || {}),
          o.orderNotes || '',
          Number(o.subtotal || 0),
          Number(o.deliveryFee || 0),
          Number(o.tax || 0),
          Number(o.discount || 0),
          Number(o.grandTotal || 0),
          o.paymentMethod || 'COD',
          o.paymentStatus || 'PENDING',
          o.paymentTransactionId || null,
          o.codCashTendered ? Number(o.codCashTendered) : null,
          o.codChangeDue ? Number(o.codChangeDue) : null,
          o.status,
          o.rejectionReason || null,
          o.cancellationReason || null,
          o.assignedStaffId || null,
          o.assignedStaffName || null,
          o.assignedDeliveryPartnerId || null,
          o.assignedDeliveryPartnerName || null,
          o.assignedDeliveryPartnerPhone || null,
          o.assignedDeliveryPartnerVehicle || null,
          o.batchId || null,
          o.checklist ? JSON.stringify(o.checklist) : null,
          o.scheduledSlot ? JSON.stringify(o.scheduledSlot) : null,
          o.hasBeenReviewed === true,
          Number(o.version || 1),
          o.createdAt || new Date().toISOString(),
          o.acceptedAt ? new Date(o.acceptedAt) : null,
          o.preparingAt ? new Date(o.preparingAt) : null,
          o.readyAt ? new Date(o.readyAt) : null,
          o.pickedUpAt ? new Date(o.pickedUpAt) : null,
          o.deliveredAt ? new Date(o.deliveredAt) : null,
          o.cancelledAt ? new Date(o.cancelledAt) : null
        ]
      );
      ordersMigrated++;

      // Order Items
      for (const item of o.items || []) {
        await client.query(
          `INSERT INTO order_items (
            order_id, menu_item_id, name, unit_price, quantity, is_veg,
            customizations, addons, special_instructions, total_price
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            o.id,
            item.menuItemId,
            item.name,
            Number(item.unitPrice),
            Number(item.quantity),
            item.isVeg !== false,
            JSON.stringify(item.customizations || []),
            JSON.stringify(item.addons || []),
            item.specialInstructions || '',
            Number(item.totalPrice)
          ]
        );
        orderItemsMigrated++;
      }

      // Order Events
      for (const evt of o.events || []) {
        await client.query(
          `INSERT INTO order_events (
            id, order_id, status, title, description, timestamp, changed_by, changed_by_role
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
          [
            evt.id || `evt_${Math.random().toString(36).substring(2, 9)}`,
            o.id,
            evt.status,
            evt.title,
            evt.description,
            evt.timestamp || new Date().toISOString(),
            evt.changedBy,
            evt.changedByRole
          ]
        );
        orderEventsMigrated++;
      }

      // COD Transaction Record
      if (o.paymentMethod === 'COD' && o.assignedDeliveryPartnerId) {
        await client.query(
          `INSERT INTO cod_transactions (
            id, order_id, order_number, delivery_partner_id, amount_expected,
            amount_collected, cash_tendered, change_due, collection_status,
            settlement_status, collected_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (order_id) DO NOTHING`,
          [
            `cod_${o.id}`,
            o.id,
            o.orderNumber,
            o.assignedDeliveryPartnerId,
            Number(o.grandTotal),
            o.status === 'DELIVERED' ? Number(o.grandTotal) : 0,
            o.codCashTendered ? Number(o.codCashTendered) : null,
            o.codChangeDue ? Number(o.codChangeDue) : null,
            o.status === 'DELIVERED' ? 'COLLECTED' : 'PENDING',
            'UNSETTLED',
            o.deliveredAt ? new Date(o.deliveredAt) : null
          ]
        );
        codTxMigrated++;
      }
    }

    reports.push({
      entity: 'Orders',
      sourceCount: orders.length,
      migratedCount: ordersMigrated,
      skippedCount: 0,
      failedCount: 0,
      status: 'PASS'
    });
    reports.push({
      entity: 'OrderItems',
      sourceCount: (orders as any[]).reduce((a, b) => a + (b.items?.length || 0), 0),
      migratedCount: orderItemsMigrated,
      skippedCount: 0,
      failedCount: 0,
      status: 'PASS'
    });
    reports.push({
      entity: 'OrderEvents',
      sourceCount: (orders as any[]).reduce((a, b) => a + (b.events?.length || 0), 0),
      migratedCount: orderEventsMigrated,
      skippedCount: 0,
      failedCount: 0,
      status: 'PASS'
    });

    // 8. Migrate Delivery Batches
    const batches = db.deliveryBatches || [];
    let batchesMigrated = 0;
    for (const b of batches) {
      await client.query(
        `INSERT INTO delivery_batches (
          id, batch_number, delivery_partner_id, delivery_partner_name, status, created_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, completed_at = EXCLUDED.completed_at`,
        [
          b.id,
          b.batchNumber,
          b.deliveryPartnerId,
          b.deliveryPartnerName,
          b.status,
          b.createdAt || new Date().toISOString(),
          b.completedAt ? new Date(b.completedAt) : null
        ]
      );
      if (Array.isArray(b.orderIds)) {
        for (let idx = 0; idx < b.orderIds.length; idx++) {
          await client.query(
            `INSERT INTO delivery_batch_orders (batch_id, order_id, sequence_order)
             VALUES ($1, $2, $3) ON CONFLICT (batch_id, order_id) DO NOTHING`,
            [b.id, b.orderIds[idx], idx + 1]
          );
        }
      }
      batchesMigrated++;
    }
    reports.push({
      entity: 'DeliveryBatches',
      sourceCount: batches.length,
      migratedCount: batchesMigrated,
      skippedCount: 0,
      failedCount: 0,
      status: 'PASS'
    });

    // 9. Migrate Reviews
    const reviews = db.reviews || [];
    let reviewsMigrated = 0;
    for (const r of reviews) {
      await client.query(
        `INSERT INTO reviews (
          id, order_id, order_number, customer_id, customer_name, food_rating,
          delivery_rating, overall_rating, comment, item_ratings, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING`,
        [
          r.id,
          r.orderId,
          r.orderNumber,
          r.customerId,
          r.customerName,
          Number(r.foodRating),
          Number(r.deliveryRating),
          Number(r.overallRating),
          r.comment || '',
          JSON.stringify(r.itemRatings || []),
          r.createdAt || new Date().toISOString()
        ]
      );
      reviewsMigrated++;
    }
    reports.push({
      entity: 'Reviews',
      sourceCount: reviews.length,
      migratedCount: reviewsMigrated,
      skippedCount: 0,
      failedCount: 0,
      status: 'PASS'
    });

    // 10. Migrate Notifications
    const notifications = db.notifications || [];
    let notifsMigrated = 0;
    for (const n of notifications) {
      await client.query(
        `INSERT INTO notifications (
          id, user_id, user_role, title, message, type, is_read, order_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING`,
        [
          n.id,
          n.userId,
          n.userRole,
          n.title,
          n.message,
          n.type || 'SYSTEM',
          n.isRead === true,
          n.orderId || null,
          n.createdAt || new Date().toISOString()
        ]
      );
      notifsMigrated++;
    }
    reports.push({
      entity: 'Notifications',
      sourceCount: notifications.length,
      migratedCount: notifsMigrated,
      skippedCount: 0,
      failedCount: 0,
      status: 'PASS'
    });

    // 11. Migrate Audit Logs
    let auditLogsMigrated = 0;
    for (const al of auditLogs) {
      await client.query(
        `INSERT INTO audit_logs (
          sequence_number, id, actor_id, actor_name, actor_role, action, resource,
          resource_id, old_value, new_value, request_id, ip_address, timestamp,
          previous_hash, hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (sequence_number) DO UPDATE SET
          id = EXCLUDED.id,
          actor_id = EXCLUDED.actor_id,
          actor_name = EXCLUDED.actor_name,
          actor_role = EXCLUDED.actor_role,
          action = EXCLUDED.action,
          resource = EXCLUDED.resource,
          resource_id = EXCLUDED.resource_id,
          old_value = EXCLUDED.old_value,
          new_value = EXCLUDED.new_value,
          request_id = EXCLUDED.request_id,
          ip_address = EXCLUDED.ip_address,
          timestamp = EXCLUDED.timestamp,
          previous_hash = EXCLUDED.previous_hash,
          hash = EXCLUDED.hash`,
        [
          al.sequenceNumber || auditLogsMigrated + 1,
          al.id,
          al.actorId,
          al.actorName,
          al.actorRole,
          al.action,
          al.resource,
          al.resourceId,
          JSON.stringify(al.oldValue || null),
          JSON.stringify(al.newValue || null),
          al.requestId,
          al.ipAddress || null,
          al.timestamp || new Date().toISOString(),
          al.previousHash,
          al.hash
        ]
      );
      auditLogsMigrated++;
    }
    reports.push({
      entity: 'AuditLogs',
      sourceCount: auditLogs.length,
      migratedCount: auditLogsMigrated,
      skippedCount: 0,
      failedCount: 0,
      status: 'PASS'
    });

    // 12. Migrate Outbox Events
    let outboxMigrated = 0;
    for (const ob of outboxEvents) {
      await client.query(
        `INSERT INTO outbox_events (
          id, aggregate_type, aggregate_id, event_type, payload, status,
          retry_count, max_retries, last_error, processing_started_at,
          created_at, processed_at, next_retry_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO NOTHING`,
        [
          ob.id,
          ob.aggregateType,
          ob.aggregateId,
          ob.eventType,
          JSON.stringify(ob.payload || {}),
          ob.status || 'PENDING',
          ob.retryCount || 0,
          ob.maxRetries || 3,
          ob.lastError || null,
          ob.processingStartedAt ? new Date(ob.processingStartedAt) : null,
          ob.createdAt || new Date().toISOString(),
          ob.processedAt ? new Date(ob.processedAt) : null,
          ob.nextRetryAt ? new Date(ob.nextRetryAt) : null
        ]
      );
      outboxMigrated++;
    }
    reports.push({
      entity: 'OutboxEvents',
      sourceCount: outboxEvents.length,
      migratedCount: outboxMigrated,
      skippedCount: 0,
      failedCount: 0,
      status: 'PASS'
    });

    // 13. Migrate Idempotency Records
    let idempotencyMigrated = 0;
    for (const idemp of idempotencyRecords) {
      await client.query(
        `INSERT INTO idempotency_records (
          key, request_path, request_hash, status, response_status, response_body, created_at, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (key) DO NOTHING`,
        [
          idemp.key,
          idemp.requestPath,
          idemp.requestHash,
          idemp.status,
          idemp.responseStatus || null,
          JSON.stringify(idemp.responseBody || null),
          idemp.createdAt || new Date().toISOString(),
          idemp.expiresAt
        ]
      );
      idempotencyMigrated++;
    }
    reports.push({
      entity: 'IdempotencyRecords',
      sourceCount: idempotencyRecords.length,
      migratedCount: idempotencyMigrated,
      skippedCount: 0,
      failedCount: 0,
      status: 'PASS'
    });
  });

  // Verify Financial Totals in PostgreSQL
  const pgRevenueRes = await postgresDb.query('SELECT COALESCE(SUM(grand_total), 0) as total_revenue FROM orders');
  const pgRevenue = Number(pgRevenueRes.rows[0].total_revenue);
  const srcRevenue = (db.orders || []).reduce((acc: number, o: any) => acc + Number(o.grandTotal || 0), 0);

  console.log('=== DATA MIGRATION COMPLETED SUCCESSFULLY ===');
  console.table(reports);
  console.log(`Financial Audit: Source Revenue: ₹${srcRevenue.toFixed(2)} | PostgreSQL Revenue: ₹${pgRevenue.toFixed(2)} (Match: ${srcRevenue === pgRevenue})`);

  return {
    success: reports.every((r) => r.status === 'PASS'),
    reports,
    financialAudit: {
      sourceRevenue: srcRevenue,
      postgresRevenue: pgRevenue,
      matches: srcRevenue === pgRevenue
    }
  };
}

if (process.argv[1] && process.argv[1].includes('migrate_json_to_postgres')) {
  migrateJsonToPostgres()
    .then(async (res) => {
      await postgresDb.close();
      process.exit(res.success ? 0 : 1);
    })
    .catch(async (err) => {
      console.error('Data migration failed:', err);
      await postgresDb.close().catch(() => {});
      process.exit(1);
    });
}
