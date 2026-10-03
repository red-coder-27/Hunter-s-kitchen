/**
 * HUNTER'S KITCHEN — POSTGRESQL DATA VIEWER CLI
 * 
 * Usage:
 *   npx tsx scripts/view-database.ts          (Displays overview + summary of all tables)
 *   npx tsx scripts/view-database.ts users    (Displays all users & auth credentials)
 *   npx tsx scripts/view-database.ts menu     (Displays all menu items & categories)
 *   npx tsx scripts/view-database.ts orders   (Displays all orders & order items)
 *   npx tsx scripts/view-database.ts audit    (Displays latest audit log blocks)
 */

import { postgresDb } from '../src/server/db/postgres';

const targetSection = (process.argv[2] || 'all').toLowerCase();

async function viewDatabase() {
  await postgresDb.initialize();

  console.log('\n================================================================================');
  console.log('🐘 HUNTER’S KITCHEN — POSTGRESQL PRODUCTION DATA VIEWER');
  console.log('================================================================================\n');

  // 1. Table Counts Summary
  const tables = [
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
    'cod_transactions',
    'reviews',
    'notifications',
    'audit_logs',
    'outbox_events',
    'idempotency_records',
    'inventory_items',
    'inventory_transactions'
  ];

  const summary: { Table: string; 'Row Count': number }[] = [];
  for (const table of tables) {
    try {
      const res = await postgresDb.query(`SELECT COUNT(*) as count FROM ${table}`);
      summary.push({ Table: table, 'Row Count': Number(res.rows[0].count) });
    } catch (e: any) {
      summary.push({ Table: table, 'Row Count': -1 });
    }
  }

  console.log('📊 DATABASE TABLES & RECORD COUNTS:');
  console.table(summary);

  // 2. Settings
  if (targetSection === 'all' || targetSection === 'settings') {
    console.log('\n🏠 RESTAURANT SETTINGS (Table: restaurant_settings):');
    const settings = await postgresDb.query('SELECT restaurant_name, phone, email, is_open, delivery_radius_km, base_delivery_fee, cod_enabled, online_payment_enabled FROM restaurant_settings');
    console.table(settings.rows);
  }

  // 3. Users
  if (targetSection === 'all' || targetSection === 'users') {
    console.log('\n👥 REGISTERED USERS (Table: users):');
    const users = await postgresDb.query('SELECT id, name, email, phone, role, staff_role, status FROM users ORDER BY joined_at ASC');
    console.table(users.rows);

    console.log('\n🔐 AUTH CREDENTIALS (Table: user_auth_credentials):');
    const creds = await postgresDb.query(
      `SELECT user_id, email, SUBSTRING(password_hash, 1, 20) || '...' as bcrypt_hash, failed_login_attempts, updated_at FROM user_auth_credentials`
    );
    console.table(creds.rows);
  }

  // 4. Menu & Categories
  if (targetSection === 'all' || targetSection === 'menu') {
    console.log('\n📂 CATEGORIES (Table: categories):');
    const categories = await postgresDb.query('SELECT id, name, item_count FROM categories ORDER BY id ASC');
    console.table(categories.rows);

    console.log('\n🍛 MENU ITEMS (Sample from Table: menu_items):');
    const menu = await postgresDb.query('SELECT id, name, category_name, price, discount_price, is_veg, is_available FROM menu_items ORDER BY id ASC LIMIT 15');
    console.table(menu.rows);
    console.log(`... and ${Math.max(0, summary.find(s => s.Table === 'menu_items')!['Row Count'] - 15)} more items`);
  }

  // 5. Customer Addresses
  if (targetSection === 'all' || targetSection === 'addresses') {
    console.log('\n📍 CUSTOMER ADDRESSES (Table: customer_addresses):');
    const addresses = await postgresDb.query('SELECT id, customer_id, type, name, phone, area, city, pincode, is_default FROM customer_addresses');
    console.table(addresses.rows);
  }

  // 6. Orders
  if (targetSection === 'all' || targetSection === 'orders') {
    console.log('\n🛒 ORDERS (Table: orders):');
    const orders = await postgresDb.query('SELECT id, order_number, customer_name, grand_total, payment_method, payment_status, status, version, created_at FROM orders ORDER BY created_at DESC LIMIT 10');
    console.table(orders.rows);
  }

  // 7. Audit Logs
  if (targetSection === 'all' || targetSection === 'audit') {
    console.log('\n🛡️ CRYPTOGRAPHIC AUDIT LOGS (Table: audit_logs):');
    const auditLogs = await postgresDb.query(
      `SELECT sequence_number, actor_name, actor_role, action, resource, resource_id, SUBSTRING(previous_hash, 1, 12) || '...' as prev_hash, SUBSTRING(hash, 1, 12) || '...' as hash, timestamp FROM audit_logs ORDER BY sequence_number DESC LIMIT 10`
    );
    console.table(auditLogs.rows);
  }

  console.log('\n================================================================================');
  console.log('✅ All data retrieved live directly from PostgreSQL database: hunters_kitchen');
  console.log('================================================================================\n');

  process.exit(0);
}

viewDatabase().catch((err) => {
  console.error('Failed to view database:', err);
  process.exit(1);
});
