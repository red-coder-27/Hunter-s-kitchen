import bcrypt from 'bcryptjs';
import { PoolClient } from 'pg';
import { postgresDb } from './db/postgres';
import {
  User,
  UserRole,
  StaffSubRole,
  Address,
  MenuItem,
  Category,
  Order,
  OrderStatus,
  OrderItemSnapshot,
  OrderEvent,
  DeliveryBatch,
  Review,
  AppNotification,
  RestaurantSettings,
  AnalyticsSummary
} from '../types';
import { normalizeEmail } from './utils/sanitizer';

export interface UserAuthCredentials {
  userId: string;
  email: string;
  passwordHash: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: number;
  inviteToken?: string;
  inviteExpires?: number;
  failedLoginAttempts?: number;
  lastFailedLogin?: number;
}

export function computeUserPermissions(role: UserRole, staffRole?: StaffSubRole): string[] {
  if (role === 'OWNER') {
    return [
      'orders.read',
      'orders.create',
      'orders.update',
      'orders.cancel',
      'orders.assign',
      'orders.deliver',
      'menu.read',
      'menu.create',
      'menu.update',
      'menu.delete',
      'menu.availability',
      'users.read',
      'users.create',
      'users.update',
      'users.suspend',
      'analytics.read',
      'audit.read',
      'reconciliation.read',
      'settings.update',
      'batches.manage'
    ];
  }
  if (role === 'STAFF') {
    if (staffRole === 'GENERAL_MANAGER') {
      return [
        'orders.read',
        'orders.create',
        'orders.update',
        'orders.cancel',
        'orders.assign',
        'orders.deliver',
        'menu.read',
        'menu.create',
        'menu.update',
        'menu.availability',
        'batches.manage',
        'analytics.read'
      ];
    }
    // Default Kitchen Staff (Order accepting, order rejecting, assigning delivery partners)
    return [
      'orders.read',
      'orders.update',
      'orders.cancel',
      'orders.assign',
      'menu.read',
      'menu.availability'
    ];
  }
  if (role === 'DELIVERY_PARTNER') {
    return [
      'orders.read',
      'orders.deliver'
    ];
  }
  // CUSTOMER
  return [
    'orders.read',
    'orders.create',
    'orders.cancel',
    'menu.read'
  ];
}

// -----------------------------------------------------------------------------
// Entity Transformation Helpers (Row -> TypeScript Types)
// -----------------------------------------------------------------------------

function rowToSettings(row: any): RestaurantSettings {
  return {
    restaurantName: row.restaurant_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    isOpen: row.is_open,
    temporaryPause: row.temporary_pause,
    pauseReason: row.pause_reason || '',
    openingTime: row.opening_time,
    closingTime: row.closing_time,
    deliveryRadiusKm: Number(row.delivery_radius_km),
    baseDeliveryFee: Number(row.base_delivery_fee),
    freeDeliveryThreshold: Number(row.free_delivery_threshold),
    codEnabled: row.cod_enabled,
    onlinePaymentEnabled: row.online_payment_enabled,
    announcement: row.announcement || ''
  };
}

function rowToUser(row: any): User {
  const permissions = Array.isArray(row.permissions)
    ? row.permissions
    : typeof row.permissions === 'string'
    ? JSON.parse(row.permissions)
    : [];

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    staffRole: row.staff_role || undefined,
    avatar: row.avatar || undefined,
    status: row.status,
    partnerStatus: row.partner_status || (row.role === 'DELIVERY_PARTNER' && row.status === 'ACTIVE' ? 'ONLINE' : undefined),
    vehicleNumber: row.vehicle_number || undefined,
    vehicleType: row.vehicle_type || undefined,
    currentRating: row.current_rating !== null ? Number(row.current_rating) : undefined,
    totalDeliveries: row.total_deliveries !== null ? Number(row.total_deliveries) : undefined,
    joinedAt: row.joined_at ? new Date(row.joined_at).toISOString() : new Date().toISOString(),
    permissions: permissions.length > 0 ? permissions : computeUserPermissions(row.role, row.staff_role),
    restaurantId: row.restaurant_id || 'rest_hunter_01',
    googleId: row.google_id || undefined,
    emailVerified: row.email_verified === true
  };
}

function rowToCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    icon: row.icon || '',
    itemCount: Number(row.item_count || 0)
  };
}

function rowToMenuItem(row: any): MenuItem {
  const parseJson = (val: any) => (typeof val === 'string' ? JSON.parse(val) : val || []);
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    categoryId: row.category_id,
    categoryName: row.category_name,
    price: Number(row.price),
    discountPrice: row.discount_price !== null ? Number(row.discount_price) : undefined,
    imageUrl: row.image_url || '',
    isVeg: row.is_veg,
    isAvailable: row.is_available,
    prepTimeMinutes: Number(row.prep_time_minutes || 15),
    isPopular: row.is_popular === true,
    isBestseller: row.is_bestseller === true,
    rating: Number(row.rating || 5.0),
    ratingCount: Number(row.rating_count || 0),
    customizations: parseJson(row.customizations),
    addons: parseJson(row.addons),
    ingredients: parseJson(row.ingredients)
  };
}

function rowToAddress(row: any): Address {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    phone: row.phone,
    doorNo: row.door_no,
    street: row.street,
    area: row.area,
    city: row.city,
    pincode: row.pincode,
    landmark: row.landmark || undefined,
    instructions: row.instructions || undefined,
    coordinates: row.coordinates || undefined,
    isDefault: row.is_default === true
  };
}

function rowToOrder(row: any, items: OrderItemSnapshot[] = [], events: OrderEvent[] = []): Order {
  const parseJson = (val: any) => (typeof val === 'string' ? JSON.parse(val) : val);
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    deliveryAddress: parseJson(row.delivery_address) || {},
    items,
    orderNotes: row.order_notes || undefined,
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    tax: Number(row.tax),
    discount: Number(row.discount),
    grandTotal: Number(row.grand_total),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    paymentTransactionId: row.payment_transaction_id || undefined,
    codCashTendered: row.cod_cash_tendered !== null ? Number(row.cod_cash_tendered) : undefined,
    codChangeDue: row.cod_change_due !== null ? Number(row.cod_change_due) : undefined,
    status: row.status,
    rejectionReason: row.rejection_reason || undefined,
    cancellationReason: row.cancellation_reason || undefined,
    assignedStaffId: row.assigned_staff_id || undefined,
    assignedStaffName: row.assigned_staff_name || undefined,
    assignedDeliveryPartnerId: row.assigned_delivery_partner_id || undefined,
    assignedDeliveryPartnerName: row.assigned_delivery_partner_name || undefined,
    assignedDeliveryPartnerPhone: row.assigned_delivery_partner_phone || undefined,
    assignedDeliveryPartnerVehicle: row.assigned_delivery_partner_vehicle || undefined,
    batchId: row.batch_id || undefined,
    checklist: parseJson(row.checklist) || undefined,
    scheduledSlot: parseJson(row.scheduled_slot) || undefined,
    hasBeenReviewed: row.has_been_reviewed === true,
    version: Number(row.version || 1),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    acceptedAt: row.accepted_at ? new Date(row.accepted_at).toISOString() : undefined,
    preparingAt: row.preparing_at ? new Date(row.preparing_at).toISOString() : undefined,
    readyAt: row.ready_at ? new Date(row.ready_at).toISOString() : undefined,
    pickedUpAt: row.picked_up_at ? new Date(row.picked_up_at).toISOString() : undefined,
    deliveredAt: row.delivered_at ? new Date(row.delivered_at).toISOString() : undefined,
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at).toISOString() : undefined,
    events,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined
  };
}

function rowToDeliveryBatch(row: any, orderIds: string[] = []): DeliveryBatch {
  return {
    id: row.id,
    batchNumber: row.batch_number,
    deliveryPartnerId: row.delivery_partner_id,
    deliveryPartnerName: row.delivery_partner_name,
    orderIds,
    status: row.status,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined
  };
}

function rowToReview(row: any): Review {
  const parseJson = (val: any) => (typeof val === 'string' ? JSON.parse(val) : val || []);
  return {
    id: row.id,
    orderId: row.order_id,
    orderNumber: row.order_number,
    customerId: row.customer_id,
    customerName: row.customer_name,
    foodRating: Number(row.food_rating),
    deliveryRating: Number(row.delivery_rating),
    overallRating: Number(row.overall_rating),
    comment: row.comment || '',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    itemRatings: parseJson(row.item_ratings)
  };
}

function rowToNotification(row: any): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    userRole: row.user_role,
    title: row.title,
    message: row.message,
    type: row.type,
    isRead: row.is_read === true,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    orderId: row.order_id || undefined
  };
}

// -----------------------------------------------------------------------------
// Production PostgreSQL Database Service
// -----------------------------------------------------------------------------

export class PostgresDatabaseService {
  // Settings
  public async getSettings(): Promise<RestaurantSettings> {
    const res = await postgresDb.query('SELECT * FROM restaurant_settings WHERE id = $1', ['rest_hunter_01']);
    if (res.rows.length === 0) {
      throw new Error('Restaurant settings record not found in PostgreSQL');
    }
    return rowToSettings(res.rows[0]);
  }

  public async updateSettings(updates: Partial<RestaurantSettings>): Promise<RestaurantSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...updates };

    await postgresDb.query(
      `UPDATE restaurant_settings SET
        restaurant_name = $1, phone = $2, email = $3, address = $4,
        is_open = $5, temporary_pause = $6, pause_reason = $7,
        opening_time = $8, closing_time = $9, delivery_radius_km = $10,
        base_delivery_fee = $11, free_delivery_threshold = $12,
        cod_enabled = $13, online_payment_enabled = $14,
        announcement = $15, updated_at = NOW()
      WHERE id = $16`,
      [
        updated.restaurantName,
        updated.phone,
        updated.email,
        updated.address,
        updated.isOpen,
        updated.temporaryPause,
        updated.pauseReason || '',
        updated.openingTime,
        updated.closingTime,
        updated.deliveryRadiusKm,
        updated.baseDeliveryFee,
        updated.freeDeliveryThreshold,
        updated.codEnabled,
        updated.onlinePaymentEnabled,
        updated.announcement || '',
        'rest_hunter_01'
      ]
    );

    return updated;
  }

  // Users
  public async getUsers(): Promise<User[]> {
    const res = await postgresDb.query('SELECT * FROM users ORDER BY joined_at ASC');
    return res.rows.map(rowToUser);
  }

  public async getUserById(id: string): Promise<User | undefined> {
    const res = await postgresDb.query('SELECT * FROM users WHERE id = $1', [id]);
    if (res.rows.length === 0) return undefined;
    return rowToUser(res.rows[0]);
  }

  public async getUserByEmail(email: string): Promise<User | undefined> {
    const lower = email.toLowerCase().trim();
    let targetEmail = lower;
    if (lower === 'admin@hunterskitchen.com' || lower === 'owner@test.local') {
      const defaultOwner = await postgresDb.query('SELECT 1 FROM users WHERE LOWER(email) = $1', ['owner@hunterskitchen.com']);
      if (defaultOwner.rows.length > 0) targetEmail = 'owner@hunterskitchen.com';
    } else if (lower === 'staff@hunterskitchen.com' || lower === 'staff@test.local') {
      targetEmail = 'staff1@hunterskitchen.com';
    } else if (lower === 'delivery@hunterskitchen.com' || lower === 'rider@test.local') {
      targetEmail = 'delivery1@hunterskitchen.com';
    } else if (lower === 'customer@hunterskitchen.com' || lower === 'customer@test.local') {
      targetEmail = 'customer1@hunterskitchen.com';
    } else if (lower === 'chef@test.local') {
      targetEmail = 'chef@hunterskitchen.com';
    } else if (lower === 'cook@test.local') {
      targetEmail = 'cook@hunterskitchen.com';
    }

    const normalized = normalizeEmail(targetEmail);

    const res = await postgresDb.query(
      `SELECT * FROM users WHERE LOWER(email) = $1 OR (google_id IS NOT NULL AND LOWER(email) = $2) LIMIT 1`,
      [targetEmail, normalized]
    );

    if (res.rows.length === 0) {
      // Check dotless Gmail normalization
      const allUsers = await postgresDb.query('SELECT * FROM users');
      const found = allUsers.rows.find((u) => normalizeEmail(u.email) === normalized);
      return found ? rowToUser(found) : undefined;
    }

    return rowToUser(res.rows[0]);
  }

  public async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    if (!googleId) return undefined;
    const res = await postgresDb.query('SELECT * FROM users WHERE google_id = $1 LIMIT 1', [googleId.trim()]);
    if (res.rows.length === 0) return undefined;
    return rowToUser(res.rows[0]);
  }

  // Auth Credentials
  public async getAuthCredentialsByUserId(userId: string): Promise<UserAuthCredentials | undefined> {
    const res = await postgresDb.query('SELECT * FROM user_auth_credentials WHERE user_id = $1', [userId]);
    if (res.rows.length === 0) return undefined;
    const r = res.rows[0];
    return {
      userId: r.user_id,
      email: r.email,
      passwordHash: r.password_hash,
      resetPasswordToken: r.reset_password_token || undefined,
      resetPasswordExpires: r.reset_password_expires ? new Date(r.reset_password_expires).getTime() : undefined,
      inviteToken: r.invite_token || undefined,
      inviteExpires: r.invite_expires ? new Date(r.invite_expires).getTime() : undefined,
      failedLoginAttempts: Number(r.failed_login_attempts || 0),
      lastFailedLogin: r.last_failed_login ? new Date(r.last_failed_login).getTime() : undefined
    };
  }

  public async getAuthCredentialsByEmail(email: string): Promise<UserAuthCredentials | undefined> {
    const user = await this.getUserByEmail(email);
    if (!user) return undefined;
    return this.getAuthCredentialsByUserId(user.id);
  }

  public async setAuthCredentials(cred: UserAuthCredentials): Promise<void> {
    await postgresDb.query(
      `INSERT INTO user_auth_credentials (
        user_id, email, password_hash, reset_password_token, reset_password_expires,
        invite_token, invite_expires, failed_login_attempts, last_failed_login, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        reset_password_token = EXCLUDED.reset_password_token,
        reset_password_expires = EXCLUDED.reset_password_expires,
        invite_token = EXCLUDED.invite_token,
        invite_expires = EXCLUDED.invite_expires,
        failed_login_attempts = EXCLUDED.failed_login_attempts,
        last_failed_login = EXCLUDED.last_failed_login,
        updated_at = NOW()`,
      [
        cred.userId,
        cred.email.toLowerCase().trim(),
        cred.passwordHash,
        cred.resetPasswordToken || null,
        cred.resetPasswordExpires ? new Date(cred.resetPasswordExpires) : null,
        cred.inviteToken || null,
        cred.inviteExpires ? new Date(cred.inviteExpires) : null,
        cred.failedLoginAttempts || 0,
        cred.lastFailedLogin ? new Date(cred.lastFailedLogin) : null
      ]
    );
  }

  public async updatePassword(userId: string, passwordHash: string): Promise<boolean> {
    const res = await postgresDb.query(
      `UPDATE user_auth_credentials SET
        password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL,
        failed_login_attempts = 0, last_failed_login = NULL, updated_at = NOW()
      WHERE user_id = $2`,
      [passwordHash, userId]
    );
    return (res.rowCount || 0) > 0;
  }

  public async recordLoginAttempt(email: string, success: boolean): Promise<void> {
    const user = await this.getUserByEmail(email);
    if (!user) return;
    if (success) {
      await postgresDb.query(
        `UPDATE user_auth_credentials SET failed_login_attempts = 0, last_failed_login = NULL, updated_at = NOW() WHERE user_id = $1`,
        [user.id]
      );
    } else {
      await postgresDb.query(
        `UPDATE user_auth_credentials SET failed_login_attempts = failed_login_attempts + 1, last_failed_login = NOW(), updated_at = NOW() WHERE user_id = $1`,
        [user.id]
      );
    }
  }

  public async setResetPasswordToken(email: string, token: string, expiryMs: number): Promise<boolean> {
    const user = await this.getUserByEmail(email);
    if (!user) return false;
    const expiry = new Date(Date.now() + expiryMs);
    const res = await postgresDb.query(
      `UPDATE user_auth_credentials SET reset_password_token = $1, reset_password_expires = $2, updated_at = NOW() WHERE user_id = $3`,
      [token, expiry, user.id]
    );
    return (res.rowCount || 0) > 0;
  }

  public async verifyAndConsumeResetToken(token: string, newHash: string): Promise<string | null> {
    const res = await postgresDb.query(
      `UPDATE user_auth_credentials SET
        password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL,
        failed_login_attempts = 0, last_failed_login = NULL, updated_at = NOW()
      WHERE reset_password_token = $2 AND reset_password_expires > NOW()
      RETURNING user_id`,
      [newHash, token]
    );
    if (res.rows.length === 0) return null;
    return res.rows[0].user_id;
  }

  public async createInviteToken(userId: string, token: string, expiryMs: number): Promise<boolean> {
    const expiry = new Date(Date.now() + expiryMs);
    const res = await postgresDb.query(
      `UPDATE user_auth_credentials SET invite_token = $1, invite_expires = $2, updated_at = NOW() WHERE user_id = $3`,
      [token, expiry, userId]
    );
    return (res.rowCount || 0) > 0;
  }

  public async acceptInvite(token: string, passwordHash: string): Promise<User | null> {
    return postgresDb.transaction(async (client) => {
      const credRes = await client.query(
        `UPDATE user_auth_credentials SET
          password_hash = $1, invite_token = NULL, invite_expires = NULL, updated_at = NOW()
        WHERE invite_token = $2 AND invite_expires > NOW()
        RETURNING user_id`,
        [passwordHash, token]
      );
      if (credRes.rows.length === 0) return null;
      const userId = credRes.rows[0].user_id;

      const userRes = await client.query(
        `UPDATE users SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [userId]
      );
      if (userRes.rows.length === 0) return null;
      return rowToUser(userRes.rows[0]);
    });
  }

  public async createUser(user: Omit<User, 'id' | 'joinedAt'> & { password?: string }): Promise<User> {
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const permissions = user.permissions || computeUserPermissions(user.role, user.staffRole);
    const passwordHash = user.password ? bcrypt.hashSync(user.password, 10) : bcrypt.hashSync('default_password_123', 10);

    return postgresDb.transaction(async (client) => {
      const userRes = await client.query(
        `INSERT INTO users (
          id, name, email, phone, role, staff_role, avatar, status, partner_status,
          vehicle_number, vehicle_type, current_rating, total_deliveries, permissions,
          restaurant_id, google_id, email_verified, joined_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW()
        ) RETURNING *`,
        [
          id,
          user.name,
          user.email.toLowerCase().trim(),
          user.phone,
          user.role,
          user.staffRole || null,
          user.avatar || null,
          user.status || 'ACTIVE',
          user.partnerStatus || (user.role === 'DELIVERY_PARTNER' ? 'ONLINE' : 'OFFLINE'),
          user.vehicleNumber || null,
          user.vehicleType || null,
          user.currentRating !== undefined ? user.currentRating : (user.role === 'DELIVERY_PARTNER' ? 5.0 : null),
          user.totalDeliveries || 0,
          JSON.stringify(permissions),
          user.restaurantId || 'rest_hunter_01',
          user.googleId || null,
          user.emailVerified === true
        ]
      );

      await client.query(
        `INSERT INTO user_auth_credentials (
          user_id, email, password_hash, failed_login_attempts, created_at, updated_at
        ) VALUES ($1, $2, $3, 0, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash`,
        [id, user.email.toLowerCase().trim(), passwordHash]
      );

      return rowToUser(userRes.rows[0]);
    });
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const current = await this.getUserById(id);
    if (!current) return undefined;

    const name = updates.name !== undefined ? updates.name : current.name;
    const email = updates.email !== undefined ? updates.email.toLowerCase().trim() : current.email;
    const phone = updates.phone !== undefined ? updates.phone : current.phone;
    const role = updates.role !== undefined ? updates.role : current.role;
    const staffRole = updates.staffRole !== undefined ? updates.staffRole : current.staffRole;
    const status = updates.status !== undefined ? updates.status : current.status;
    const partnerStatus = updates.partnerStatus !== undefined ? updates.partnerStatus : current.partnerStatus;
    const vehicleNumber = updates.vehicleNumber !== undefined ? updates.vehicleNumber : current.vehicleNumber;
    const vehicleType = updates.vehicleType !== undefined ? updates.vehicleType : current.vehicleType;
    const permissions = updates.permissions !== undefined ? updates.permissions : (current.permissions || computeUserPermissions(role, staffRole));

    const res = await postgresDb.query(
      `UPDATE users SET
        name = $1, email = $2, phone = $3, role = $4, staff_role = $5, status = $6,
        partner_status = $7, vehicle_number = $8, vehicle_type = $9, permissions = $10, updated_at = NOW()
      WHERE id = $11 RETURNING *`,
      [
        name,
        email,
        phone,
        role,
        staffRole || null,
        status,
        partnerStatus || null,
        vehicleNumber || null,
        vehicleType || null,
        JSON.stringify(permissions),
        id
      ]
    );

    if (updates.email) {
      await postgresDb.query('UPDATE user_auth_credentials SET email = $1 WHERE user_id = $2', [email, id]);
    }

    if (res.rows.length === 0) return undefined;
    return rowToUser(res.rows[0]);
  }

  public async deleteUser(id: string): Promise<boolean> {
    return postgresDb.transaction(async (client) => {
      // 1. Verify user exists
      const userRes = await client.query('SELECT * FROM users WHERE id = $1', [id]);
      if (userRes.rows.length === 0) return false;

      // 2. Unassign from orders (staff or rider)
      await client.query('UPDATE orders SET assigned_staff_id = NULL, assigned_staff_name = NULL WHERE assigned_staff_id = $1', [id]);
      await client.query(
        `UPDATE orders SET 
          assigned_delivery_partner_id = NULL,
          assigned_delivery_partner_name = NULL,
          assigned_delivery_partner_phone = NULL,
          assigned_delivery_partner_vehicle = NULL
        WHERE assigned_delivery_partner_id = $1`,
        [id]
      );
      await client.query('UPDATE orders SET customer_id = NULL WHERE customer_id = $1', [id]);

      // 3. Remove delivery batches and batch associations
      await client.query(
        'DELETE FROM delivery_batch_orders WHERE batch_id IN (SELECT id FROM delivery_batches WHERE delivery_partner_id = $1)',
        [id]
      );
      await client.query('DELETE FROM delivery_batches WHERE delivery_partner_id = $1', [id]);

      // 4. Update COD transactions
      await client.query('UPDATE cod_transactions SET delivery_partner_id = NULL WHERE delivery_partner_id = $1', [id]);
      await client.query('UPDATE cod_transactions SET settled_by = NULL WHERE settled_by = $1', [id]);

      // 5. Clean up child records
      await client.query('DELETE FROM user_auth_credentials WHERE user_id = $1', [id]);
      await client.query('DELETE FROM customer_addresses WHERE customer_id = $1', [id]);
      await client.query('DELETE FROM notifications WHERE user_id = $1', [id]);
      await client.query('UPDATE reviews SET customer_id = NULL WHERE customer_id = $1', [id]);

      // 6. Delete primary user row
      const res = await client.query('DELETE FROM users WHERE id = $1', [id]);
      return (res.rowCount || 0) > 0;
    });
  }

  // Categories
  public async getCategories(): Promise<Category[]> {
    const res = await postgresDb.query('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
    return res.rows.map(rowToCategory);
  }

  public async createCategory(cat: Omit<Category, 'id'>): Promise<Category> {
    const id = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const res = await postgresDb.query(
      `INSERT INTO categories (id, name, description, icon, item_count, sort_order)
       VALUES ($1, $2, $3, $4, $5, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM categories))
       RETURNING *`,
      [id, cat.name, cat.description || '', cat.icon || '', cat.itemCount || 0]
    );
    return rowToCategory(res.rows[0]);
  }

  // Menu Items
  public async getMenuItems(): Promise<MenuItem[]> {
    const res = await postgresDb.query('SELECT * FROM menu_items ORDER BY category_id ASC, name ASC');
    return res.rows.map(rowToMenuItem);
  }

  public async getMenuItemById(id: string): Promise<MenuItem | undefined> {
    const res = await postgresDb.query('SELECT * FROM menu_items WHERE id = $1', [id]);
    if (res.rows.length === 0) return undefined;
    return rowToMenuItem(res.rows[0]);
  }

  public async createMenuItem(item: Omit<MenuItem, 'id' | 'rating' | 'ratingCount'>): Promise<MenuItem> {
    const id = `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    return postgresDb.transaction(async (client) => {
      const res = await client.query(
        `INSERT INTO menu_items (
          id, name, description, category_id, category_name, price, discount_price,
          image_url, is_veg, is_available, prep_time_minutes, is_popular, is_bestseller,
          rating, rating_count, customizations, addons, ingredients
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 5.0, 0, $14, $15, $16
        ) RETURNING *`,
        [
          id,
          item.name,
          item.description || '',
          item.categoryId,
          item.categoryName,
          Number(item.price),
          item.discountPrice !== undefined ? Number(item.discountPrice) : null,
          item.imageUrl || '',
          item.isVeg !== false,
          item.isAvailable !== false,
          Number(item.prepTimeMinutes || 15),
          item.isPopular === true,
          item.isBestseller === true,
          JSON.stringify(item.customizations || []),
          JSON.stringify(item.addons || []),
          JSON.stringify(item.ingredients || [])
        ]
      );

      // Create initial inventory item
      await client.query(
        `INSERT INTO inventory_items (id, menu_item_id, available_quantity, is_unlimited)
         VALUES ($1, $2, 100, true) ON CONFLICT (menu_item_id) DO NOTHING`,
        [`inv_${id}`, id]
      );

      // Update category count
      await client.query(
        `UPDATE categories SET item_count = (SELECT COUNT(*) FROM menu_items WHERE category_id = $1) WHERE id = $1`,
        [item.categoryId]
      );

      return rowToMenuItem(res.rows[0]);
    });
  }

  public async updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<MenuItem | undefined> {
    const current = await this.getMenuItemById(id);
    if (!current) return undefined;

    const merged = { ...current, ...updates };

    const res = await postgresDb.query(
      `UPDATE menu_items SET
        name = $1, description = $2, category_id = $3, category_name = $4,
        price = $5, discount_price = $6, image_url = $7, is_veg = $8,
        is_available = $9, prep_time_minutes = $10, is_popular = $11,
        is_bestseller = $12, customizations = $13, addons = $14,
        ingredients = $15, updated_at = NOW()
      WHERE id = $16 RETURNING *`,
      [
        merged.name,
        merged.description,
        merged.categoryId,
        merged.categoryName,
        Number(merged.price),
        merged.discountPrice !== undefined ? Number(merged.discountPrice) : null,
        merged.imageUrl,
        merged.isVeg,
        merged.isAvailable,
        Number(merged.prepTimeMinutes || 15),
        merged.isPopular,
        merged.isBestseller,
        JSON.stringify(merged.customizations || []),
        JSON.stringify(merged.addons || []),
        JSON.stringify(merged.ingredients || []),
        id
      ]
    );

    if (res.rows.length === 0) return undefined;
    return rowToMenuItem(res.rows[0]);
  }

  public async deleteMenuItem(id: string): Promise<boolean> {
    const item = await this.getMenuItemById(id);
    if (!item) return false;

    return postgresDb.transaction(async (client) => {
      await client.query('DELETE FROM inventory_items WHERE menu_item_id = $1', [id]);
      const res = await client.query('DELETE FROM menu_items WHERE id = $1', [id]);
      await client.query(
        `UPDATE categories SET item_count = (SELECT COUNT(*) FROM menu_items WHERE category_id = $1) WHERE id = $1`,
        [item.categoryId]
      );
      return (res.rowCount || 0) > 0;
    });
  }

  // Customer Addresses
  public async getAddresses(customerId: string): Promise<Address[]> {
    const res = await postgresDb.query(
      'SELECT * FROM customer_addresses WHERE customer_id = $1 ORDER BY is_default DESC, created_at DESC',
      [customerId]
    );
    return res.rows.map(rowToAddress);
  }

  public async saveAddress(customerId: string, address: Omit<Address, 'id'>): Promise<Address> {
    const id = `addr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    return postgresDb.transaction(async (client) => {
      if (address.isDefault) {
        await client.query('UPDATE customer_addresses SET is_default = FALSE WHERE customer_id = $1', [customerId]);
      }

      const res = await client.query(
        `INSERT INTO customer_addresses (
          id, customer_id, type, name, phone, door_no, street, area, city, pincode,
          landmark, instructions, coordinates, is_default
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          id,
          customerId,
          address.type || 'HOME',
          address.name,
          address.phone,
          address.doorNo,
          address.street,
          address.area,
          address.city,
          address.pincode,
          address.landmark || '',
          address.instructions || '',
          address.coordinates || '',
          address.isDefault === true
        ]
      );

      return rowToAddress(res.rows[0]);
    });
  }

  public async updateAddress(customerId: string, addressId: string, updates: Partial<Address>): Promise<Address | undefined> {
    return postgresDb.transaction(async (client) => {
      if (updates.isDefault) {
        await client.query('UPDATE customer_addresses SET is_default = FALSE WHERE customer_id = $1', [customerId]);
      }

      const existing = await client.query(
        'SELECT * FROM customer_addresses WHERE id = $1 AND customer_id = $2',
        [addressId, customerId]
      );
      if (existing.rows.length === 0) return undefined;

      const merged = { ...rowToAddress(existing.rows[0]), ...updates };

      const res = await client.query(
        `UPDATE customer_addresses SET
          type = $1, name = $2, phone = $3, door_no = $4, street = $5, area = $6,
          city = $7, pincode = $8, landmark = $9, instructions = $10, coordinates = $11,
          is_default = $12, updated_at = NOW()
        WHERE id = $13 AND customer_id = $14 RETURNING *`,
        [
          merged.type,
          merged.name,
          merged.phone,
          merged.doorNo,
          merged.street,
          merged.area,
          merged.city,
          merged.pincode,
          merged.landmark || '',
          merged.instructions || '',
          merged.coordinates || '',
          merged.isDefault === true,
          addressId,
          customerId
        ]
      );

      if (res.rows.length === 0) return undefined;
      return rowToAddress(res.rows[0]);
    });
  }

  public async deleteAddress(customerId: string, addressId: string): Promise<boolean> {
    const res = await postgresDb.query(
      'DELETE FROM customer_addresses WHERE id = $1 AND customer_id = $2',
      [addressId, customerId]
    );
    return (res.rowCount || 0) > 0;
  }

  // Orders
  public async getOrders(): Promise<Order[]> {
    const ordersRes = await postgresDb.query('SELECT * FROM orders ORDER BY created_at DESC');
    if (ordersRes.rows.length === 0) return [];

    const orderIds = ordersRes.rows.map((r) => r.id);

    const itemsRes = await postgresDb.query('SELECT * FROM order_items WHERE order_id = ANY($1)', [orderIds]);
    const eventsRes = await postgresDb.query('SELECT * FROM order_events WHERE order_id = ANY($1) ORDER BY timestamp ASC', [orderIds]);

    const itemsByOrder = new Map<string, OrderItemSnapshot[]>();
    for (const item of itemsRes.rows) {
      if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
      itemsByOrder.get(item.order_id)!.push({
        menuItemId: item.menu_item_id,
        name: item.name,
        unitPrice: Number(item.unit_price),
        quantity: Number(item.quantity),
        isVeg: item.is_veg,
        customizations: typeof item.customizations === 'string' ? JSON.parse(item.customizations) : item.customizations || [],
        addons: typeof item.addons === 'string' ? JSON.parse(item.addons) : item.addons || [],
        specialInstructions: item.special_instructions || '',
        totalPrice: Number(item.total_price)
      });
    }

    const eventsByOrder = new Map<string, OrderEvent[]>();
    for (const evt of eventsRes.rows) {
      if (!eventsByOrder.has(evt.order_id)) eventsByOrder.set(evt.order_id, []);
      eventsByOrder.get(evt.order_id)!.push({
        id: evt.id,
        orderId: evt.order_id,
        status: evt.status,
        title: evt.title,
        description: evt.description,
        timestamp: new Date(evt.timestamp).toISOString(),
        changedBy: evt.changed_by,
        changedByRole: evt.changed_by_role
      });
    }

    return ordersRes.rows.map((r) => rowToOrder(r, itemsByOrder.get(r.id) || [], eventsByOrder.get(r.id) || []));
  }

  public async getOrderById(id: string): Promise<Order | undefined> {
    const orderRes = await postgresDb.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderRes.rows.length === 0) return undefined;

    const itemsRes = await postgresDb.query('SELECT * FROM order_items WHERE order_id = $1', [id]);
    const eventsRes = await postgresDb.query('SELECT * FROM order_events WHERE order_id = $1 ORDER BY timestamp ASC', [id]);

    const items: OrderItemSnapshot[] = itemsRes.rows.map((item) => ({
      menuItemId: item.menu_item_id,
      name: item.name,
      unitPrice: Number(item.unit_price),
      quantity: Number(item.quantity),
      isVeg: item.is_veg,
      customizations: typeof item.customizations === 'string' ? JSON.parse(item.customizations) : item.customizations || [],
      addons: typeof item.addons === 'string' ? JSON.parse(item.addons) : item.addons || [],
      specialInstructions: item.special_instructions || '',
      totalPrice: Number(item.total_price)
    }));

    const events: OrderEvent[] = eventsRes.rows.map((evt) => ({
      id: evt.id,
      orderId: evt.order_id,
      status: evt.status,
      title: evt.title,
      description: evt.description,
      timestamp: new Date(evt.timestamp).toISOString(),
      changedBy: evt.changed_by,
      changedByRole: evt.changed_by_role
    }));

    return rowToOrder(orderRes.rows[0], items, events);
  }

  public async createOrder(orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'events'>): Promise<Order> {
    const id = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `HK-${dateStr}-${randomSuffix}`;
    const now = new Date().toISOString();

    const initialEvent: OrderEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      orderId: id,
      status: orderData.status || 'PLACED',
      title: 'Order Placed',
      description: `Order #${orderNumber} placed successfully with total ₹${orderData.grandTotal}`,
      timestamp: now,
      changedBy: orderData.customerName || 'Customer',
      changedByRole: 'CUSTOMER'
    };

    return postgresDb.transaction(async (client) => {
      const orderRes = await client.query(
        `INSERT INTO orders (
          id, order_number, customer_id, customer_name, customer_phone, delivery_address,
          order_notes, subtotal, delivery_fee, tax, discount, grand_total, payment_method,
          payment_status, payment_transaction_id, cod_cash_tendered, cod_change_due,
          status, rejection_reason, cancellation_reason, checklist, scheduled_slot,
          version, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22, 1, NOW(), NOW()
        ) RETURNING *`,
        [
          id,
          orderNumber,
          orderData.customerId,
          orderData.customerName,
          orderData.customerPhone,
          JSON.stringify(orderData.deliveryAddress),
          orderData.orderNotes || '',
          Number(orderData.subtotal),
          Number(orderData.deliveryFee),
          Number(orderData.tax),
          Number(orderData.discount || 0),
          Number(orderData.grandTotal),
          orderData.paymentMethod,
          orderData.paymentStatus,
          orderData.paymentTransactionId || null,
          orderData.codCashTendered ? Number(orderData.codCashTendered) : null,
          orderData.codChangeDue ? Number(orderData.codChangeDue) : null,
          orderData.status || 'PLACED',
          orderData.rejectionReason || null,
          orderData.cancellationReason || null,
          orderData.checklist ? JSON.stringify(orderData.checklist) : null,
          orderData.scheduledSlot ? JSON.stringify(orderData.scheduledSlot) : null
        ]
      );

      // Insert order items
      for (const item of orderData.items) {
        await client.query(
          `INSERT INTO order_items (
            order_id, menu_item_id, name, unit_price, quantity, is_veg,
            customizations, addons, special_instructions, total_price
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            id,
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
      }

      // Insert initial order event
      await client.query(
        `INSERT INTO order_events (id, order_id, status, title, description, timestamp, changed_by, changed_by_role)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          initialEvent.id,
          id,
          initialEvent.status,
          initialEvent.title,
          initialEvent.description,
          initialEvent.timestamp,
          initialEvent.changedBy,
          initialEvent.changedByRole
        ]
      );

      return rowToOrder(orderRes.rows[0], orderData.items, [initialEvent]);
    });
  }

  public async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    actor: User,
    metadata?: any
  ): Promise<Order | undefined> {
    return postgresDb.transaction(async (client) => {
      // Row lock for strict concurrency protection
      const currentRes = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
      if (currentRes.rows.length === 0) return undefined;
      const current = currentRes.rows[0];

      let acceptedAt = current.accepted_at;
      let preparingAt = current.preparing_at;
      let readyAt = current.ready_at;
      let pickedUpAt = current.picked_up_at;
      let deliveredAt = current.delivered_at;
      let cancelledAt = current.cancelled_at;

      const now = new Date();
      if (status === 'ACCEPTED' && !acceptedAt) acceptedAt = now;
      if (status === 'PREPARING' && !preparingAt) preparingAt = now;
      if (status === 'READY' && !readyAt) readyAt = now;
      if (status === 'PICKED_UP' && !pickedUpAt) pickedUpAt = now;
      if (status === 'DELIVERED' && !deliveredAt) deliveredAt = now;
      if (status === 'CANCELLED' && !cancelledAt) cancelledAt = now;

      let paymentStatus = current.payment_status;
      if (status === 'DELIVERED' && current.payment_method === 'COD') {
        paymentStatus = 'PAID_CASH';
      }

      const assignedPartnerId = metadata?.assignedDeliveryPartnerId !== undefined ? metadata.assignedDeliveryPartnerId : current.assigned_delivery_partner_id;
      const assignedPartnerName = metadata?.assignedDeliveryPartnerName !== undefined ? metadata.assignedDeliveryPartnerName : current.assigned_delivery_partner_name;
      const assignedPartnerPhone = metadata?.assignedDeliveryPartnerPhone !== undefined ? metadata.assignedDeliveryPartnerPhone : current.assigned_delivery_partner_phone;
      const assignedPartnerVehicle = metadata?.assignedDeliveryPartnerVehicle !== undefined ? metadata.assignedDeliveryPartnerVehicle : current.assigned_delivery_partner_vehicle;

      const orderRes = await client.query(
        `UPDATE orders SET
          status = $1, payment_status = $2, accepted_at = $3, preparing_at = $4,
          ready_at = $5, picked_up_at = $6, delivered_at = $7, cancelled_at = $8,
          assigned_delivery_partner_id = $9, assigned_delivery_partner_name = $10,
          assigned_delivery_partner_phone = $11, assigned_delivery_partner_vehicle = $12,
          rejection_reason = COALESCE($13, rejection_reason),
          cancellation_reason = COALESCE($14, cancellation_reason),
          cod_cash_tendered = COALESCE($15, cod_cash_tendered),
          cod_change_due = COALESCE($16, cod_change_due),
          checklist = COALESCE($17, checklist),
          version = version + 1,
          updated_at = NOW()
        WHERE id = $18 RETURNING *`,
        [
          status,
          paymentStatus,
          acceptedAt,
          preparingAt,
          readyAt,
          pickedUpAt,
          deliveredAt,
          cancelledAt,
          assignedPartnerId,
          assignedPartnerName,
          assignedPartnerPhone,
          assignedPartnerVehicle,
          metadata?.rejectionReason || null,
          metadata?.cancellationReason || null,
          metadata?.codCashTendered ? Number(metadata.codCashTendered) : null,
          metadata?.codChangeDue ? Number(metadata.codChangeDue) : null,
          metadata?.checklist ? JSON.stringify(metadata.checklist) : null,
          orderId
        ]
      );

      // Add audit event
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const title = metadata?.title || `Order ${status.replace(/_/g, ' ')}`;
      const description = metadata?.description || `Status changed to ${status} by ${actor.name} (${actor.role})`;

      await client.query(
        `INSERT INTO order_events (id, order_id, status, title, description, timestamp, changed_by, changed_by_role)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)`,
        [eventId, orderId, status, title, description, actor.name, actor.role]
      );

      // Track COD doorstep settlement
      if (status === 'DELIVERED' && current.payment_method === 'COD') {
        await client.query(
          `INSERT INTO cod_transactions (
            id, order_id, order_number, delivery_partner_id, amount_expected,
            amount_collected, cash_tendered, change_due, collection_status,
            settlement_status, collected_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'COLLECTED', 'UNSETTLED', NOW())
          ON CONFLICT (order_id) DO UPDATE SET
            collection_status = 'COLLECTED',
            amount_collected = EXCLUDED.amount_collected,
            cash_tendered = EXCLUDED.cash_tendered,
            change_due = EXCLUDED.change_due,
            collected_at = NOW()`,
          [
            `cod_${orderId}`,
            orderId,
            current.order_number,
            assignedPartnerId || actor.id,
            Number(current.grand_total),
            Number(current.grand_total),
            metadata?.codCashTendered ? Number(metadata.codCashTendered) : null,
            metadata?.codChangeDue ? Number(metadata.codChangeDue) : null
          ]
        );
      }

      // Fetch updated items and events
      const itemsRes = await client.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
      const eventsRes = await client.query('SELECT * FROM order_events WHERE order_id = $1 ORDER BY timestamp ASC', [orderId]);

      const items: OrderItemSnapshot[] = itemsRes.rows.map((item) => ({
        menuItemId: item.menu_item_id,
        name: item.name,
        unitPrice: Number(item.unit_price),
        quantity: Number(item.quantity),
        isVeg: item.is_veg,
        customizations: typeof item.customizations === 'string' ? JSON.parse(item.customizations) : item.customizations || [],
        addons: typeof item.addons === 'string' ? JSON.parse(item.addons) : item.addons || [],
        specialInstructions: item.special_instructions || '',
        totalPrice: Number(item.total_price)
      }));

      const events: OrderEvent[] = eventsRes.rows.map((evt) => ({
        id: evt.id,
        orderId: evt.order_id,
        status: evt.status,
        title: evt.title,
        description: evt.description,
        timestamp: new Date(evt.timestamp).toISOString(),
        changedBy: evt.changed_by,
        changedByRole: evt.changed_by_role
      }));

      return rowToOrder(orderRes.rows[0], items, events);
    });
  }

  // Delivery Batches
  public async createDeliveryBatch(partnerId: string, orderIds: string[]): Promise<DeliveryBatch> {
    const partner = await this.getUserById(partnerId);
    const id = `batch_${Date.now()}`;
    const batchNumber = `BATCH-${Math.floor(100 + Math.random() * 900)}`;

    return postgresDb.transaction(async (client) => {
      const res = await client.query(
        `INSERT INTO delivery_batches (id, batch_number, delivery_partner_id, delivery_partner_name, status, created_at)
         VALUES ($1, $2, $3, $4, 'ASSIGNED', NOW()) RETURNING *`,
        [id, batchNumber, partnerId, partner ? partner.name : 'Delivery Partner']
      );

      for (let i = 0; i < orderIds.length; i++) {
        await client.query(
          `INSERT INTO delivery_batch_orders (batch_id, order_id, sequence_order) VALUES ($1, $2, $3)`,
          [id, orderIds[i], i + 1]
        );
        await client.query(
          `UPDATE orders SET
            batch_id = $1, assigned_delivery_partner_id = $2, assigned_delivery_partner_name = $3,
            assigned_delivery_partner_phone = $4, assigned_delivery_partner_vehicle = $5,
            status = CASE WHEN status = 'READY' THEN 'ASSIGNED' ELSE status END,
            updated_at = NOW()
          WHERE id = $6`,
          [
            id,
            partnerId,
            partner ? partner.name : null,
            partner ? partner.phone : null,
            partner ? partner.vehicleNumber : null,
            orderIds[i]
          ]
        );
      }

      return rowToDeliveryBatch(res.rows[0], orderIds);
    });
  }

  public async getDeliveryBatches(): Promise<DeliveryBatch[]> {
    const res = await postgresDb.query('SELECT * FROM delivery_batches ORDER BY created_at DESC');
    if (res.rows.length === 0) return [];

    const batchIds = res.rows.map((r) => r.id);
    const ordersRes = await postgresDb.query(
      'SELECT batch_id, order_id FROM delivery_batch_orders WHERE batch_id = ANY($1) ORDER BY sequence_order ASC',
      [batchIds]
    );

    const ordersByBatch = new Map<string, string[]>();
    for (const row of ordersRes.rows) {
      if (!ordersByBatch.has(row.batch_id)) ordersByBatch.set(row.batch_id, []);
      ordersByBatch.get(row.batch_id)!.push(row.order_id);
    }

    return res.rows.map((r) => rowToDeliveryBatch(r, ordersByBatch.get(r.id) || []));
  }

  // Reviews
  public async getReviews(): Promise<Review[]> {
    const res = await postgresDb.query('SELECT * FROM reviews ORDER BY created_at DESC');
    return res.rows.map(rowToReview);
  }

  public async getMenuItemReviews(menuItemId: string): Promise<Review[]> {
    const all = await this.getReviews();
    return all.filter((r) => r.itemRatings?.some((ir) => ir.menuItemId === menuItemId));
  }

  public async createReview(reviewData: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
    const id = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    return postgresDb.transaction(async (client) => {
      const res = await client.query(
        `INSERT INTO reviews (
          id, order_id, order_number, customer_id, customer_name, food_rating,
          delivery_rating, overall_rating, comment, item_ratings, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) RETURNING *`,
        [
          id,
          reviewData.orderId,
          reviewData.orderNumber,
          reviewData.customerId,
          reviewData.customerName,
          Number(reviewData.foodRating),
          Number(reviewData.deliveryRating),
          Number(reviewData.overallRating),
          reviewData.comment || '',
          JSON.stringify(reviewData.itemRatings || [])
        ]
      );

      // Mark order as reviewed
      await client.query('UPDATE orders SET has_been_reviewed = TRUE WHERE id = $1', [reviewData.orderId]);

      // Update menu items rating average
      if (Array.isArray(reviewData.itemRatings)) {
        for (const ir of reviewData.itemRatings) {
          if (ir.menuItemId && ir.rating) {
            await client.query(
              `UPDATE menu_items SET
                rating = ((rating * rating_count) + $1) / (rating_count + 1),
                rating_count = rating_count + 1
              WHERE id = $2`,
              [Number(ir.rating), ir.menuItemId]
            );
          }
        }
      }

      return rowToReview(res.rows[0]);
    });
  }

  // Notifications
  public async getNotifications(userId: string): Promise<AppNotification[]> {
    const res = await postgresDb.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    return res.rows.map(rowToNotification);
  }

  public async createNotification(notif: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>): Promise<AppNotification> {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const res = await postgresDb.query(
      `INSERT INTO notifications (id, user_id, user_role, title, message, type, is_read, order_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7, NOW()) RETURNING *`,
      [id, notif.userId, notif.userRole, notif.title, notif.message, notif.type || 'SYSTEM', notif.orderId || null]
    );
    return rowToNotification(res.rows[0]);
  }

  public async markNotificationAsRead(id: string): Promise<void> {
    await postgresDb.query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [id]);
  }

  // Analytics Engine (Real-time SQL aggregation)
  public async getAnalytics(): Promise<AnalyticsSummary> {
    const ordersRes = await postgresDb.query('SELECT * FROM orders');
    const reviewsRes = await postgresDb.query('SELECT * FROM reviews');
    const usersRes = await postgresDb.query('SELECT * FROM users');
    const menuItemsRes = await postgresDb.query('SELECT * FROM menu_items');

    const orders = ordersRes.rows.map((r) => rowToOrder(r));
    const reviews = reviewsRes.rows.map(rowToReview);
    const users = usersRes.rows.map(rowToUser);
    const menuItems = menuItemsRes.rows.map(rowToMenuItem);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const nonCancelled = orders.filter((o) => o.status !== 'CANCELLED' && o.status !== 'REJECTED');

    const revenueToday = nonCancelled
      .filter((o) => new Date(o.createdAt) >= startOfToday)
      .reduce((sum, o) => sum + o.grandTotal, 0);

    const revenueWeekly = nonCancelled
      .filter((o) => new Date(o.createdAt) >= sevenDaysAgo)
      .reduce((sum, o) => sum + o.grandTotal, 0);

    const revenueMonthly = nonCancelled
      .filter((o) => new Date(o.createdAt) >= thirtyDaysAgo)
      .reduce((sum, o) => sum + o.grandTotal, 0);

    const totalOrdersToday = orders.filter((o) => new Date(o.createdAt) >= startOfToday).length;
    const completedOrders = orders.filter((o) => o.status === 'DELIVERED').length;
    const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED' || o.status === 'REJECTED').length;
    const avgOrderValue = nonCancelled.length > 0 ? nonCancelled.reduce((sum, o) => sum + o.grandTotal, 0) / nonCancelled.length : 0;

    const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length : 5.0;

    const activeStaffCount = users.filter((u) => u.role === 'STAFF' && u.status === 'ACTIVE').length;
    const activeDriverCount = users.filter((u) => u.role === 'DELIVERY_PARTNER' && u.partnerStatus === 'ONLINE').length;

    // Item sales aggregation from order items
    const itemSalesMap: Record<string, { menuItemId: string; name: string; categoryName: string; unitsSold: number; revenue: number; rating: number }> = {};
    for (const item of menuItems) {
      itemSalesMap[item.id] = {
        menuItemId: item.id,
        name: item.name,
        categoryName: item.categoryName,
        unitsSold: 0,
        revenue: 0,
        rating: item.rating
      };
    }

    const orderItemsRes = await postgresDb.query(
      `SELECT oi.menu_item_id, oi.quantity, oi.total_price
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status NOT IN ('CANCELLED', 'REJECTED')`
    );

    for (const oi of orderItemsRes.rows) {
      const target = itemSalesMap[oi.menu_item_id];
      if (target) {
        target.unitsSold += Number(oi.quantity);
        target.revenue += Number(oi.total_price);
      }
    }

    const itemSales = Object.values(itemSalesMap).sort((a, b) => b.unitsSold - a.unitsSold);

    const hourCounts: Record<string, number> = {};
    for (let h = 0; h < 24; h++) {
      const label = `${h === 0 ? 12 : h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}`;
      hourCounts[label] = 0;
    }
    for (const o of orders) {
      const h = new Date(o.createdAt).getHours();
      const label = `${h === 0 ? 12 : h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}`;
      hourCounts[label] = (hourCounts[label] || 0) + 1;
    }
    const peakHours = Object.entries(hourCounts).map(([hour, count]) => ({ hour, count }));

    const ratingBuckets: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const r of reviews) {
      const rounded = Math.round(r.overallRating);
      if (ratingBuckets[rounded] !== undefined) ratingBuckets[rounded]++;
    }
    const ratingDistribution = [5, 4, 3, 2, 1].map((r) => ({ rating: r, count: ratingBuckets[r] || 0 }));

    return {
      revenueToday,
      revenueWeekly,
      revenueMonthly,
      totalOrdersToday,
      avgOrderValue,
      completedOrders,
      cancelledOrders,
      avgRating,
      activeStaffCount,
      activeDriverCount,
      itemSales,
      peakHours,
      ratingDistribution,
      recentReviews: reviews.slice(0, 10)
    };
  }
}

export const db = new PostgresDatabaseService();
