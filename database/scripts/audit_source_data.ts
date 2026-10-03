import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'database.json');
const AUDIT_FILE = path.join(process.cwd(), 'data', 'audit_logs.json');
const OUTBOX_FILE = path.join(process.cwd(), 'data', 'outbox_events.json');
const IDEMPOTENCY_FILE = path.join(process.cwd(), 'data', 'idempotency_store.json');

const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
const auditLogs = fs.existsSync(AUDIT_FILE) ? JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf-8')) : [];
const outboxEvents = fs.existsSync(OUTBOX_FILE) ? JSON.parse(fs.readFileSync(OUTBOX_FILE, 'utf-8')) : [];
const idempotencyRecords = fs.existsSync(IDEMPOTENCY_FILE) ? JSON.parse(fs.readFileSync(IDEMPOTENCY_FILE, 'utf-8')) : [];

console.log('=== SOURCE DATA AUDIT SUMMARY ===');
console.log('Restaurant Settings:', db.settings ? 'Present' : 'Missing');
console.log('Users Count:', db.users?.length || 0);
console.log('Categories Count:', db.categories?.length || 0);
console.log('MenuItems Count:', db.menuItems?.length || 0);
console.log('Orders Count:', db.orders?.length || 0);
console.log('Delivery Batches Count:', db.deliveryBatches?.length || 0);
console.log('Reviews Count:', db.reviews?.length || 0);
console.log('Notifications Count:', db.notifications?.length || 0);
console.log('Addresses Map Keys (Customers):', Object.keys(db.addresses || {}).length);
const totalAddresses = Object.values(db.addresses || {}).reduce((acc: number, arr: any) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
console.log('Total Addresses Count:', totalAddresses);
console.log('Auth Credentials Map Keys (Users):', Object.keys(db.authCredentials || {}).length);
console.log('Audit Logs Count:', auditLogs.length);
console.log('Outbox Events Count:', outboxEvents.length);
console.log('Idempotency Records Count:', idempotencyRecords.length);

// Audit Order Items
const totalOrderItems = (db.orders || []).reduce((acc: number, o: any) => acc + (o.items?.length || 0), 0);
const totalOrderEvents = (db.orders || []).reduce((acc: number, o: any) => acc + (o.events?.length || 0), 0);
console.log('Total Order Items Count:', totalOrderItems);
console.log('Total Order Events Count:', totalOrderEvents);

// Financial audit
const totalOrderRevenue = (db.orders || []).reduce((acc: number, o: any) => acc + (Number(o.grandTotal) || 0), 0);
console.log('Total Orders Grand Total Sum:', totalOrderRevenue);
