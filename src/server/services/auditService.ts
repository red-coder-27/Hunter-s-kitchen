import { auditRepository } from '../repositories/auditRepository';
import { AuditLogEntry } from '../models/productionTypes';
import { logger } from '../utils/logger';
import { db } from '../db';

export class AuditService {
  /**
   * Records a business or state-altering audit event in PostgreSQL.
   */
  async log(params: {
    actorId?: string;
    actorName?: string;
    actorRole?: string;
    action: string;
    resource: string;
    resourceId: string;
    oldValue?: any;
    newValue?: any;
    requestId: string;
    ipAddress?: string;
  }): Promise<AuditLogEntry> {
    const entry: Omit<AuditLogEntry, 'sequenceNumber' | 'previousHash' | 'hash'> = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      actorId: params.actorId || 'system',
      actorName: params.actorName || 'System Process',
      actorRole: params.actorRole || 'SYSTEM',
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      oldValue: params.oldValue,
      newValue: params.newValue,
      requestId: params.requestId,
      ipAddress: params.ipAddress,
      timestamp: new Date().toISOString()
    };

    const inserted = await auditRepository.insert(entry);

    logger.audit(params.action, {
      requestId: params.requestId,
      actor: `${params.actorName} (${params.actorRole})`,
      resource: `${params.resource}:${params.resourceId}`,
      action: params.action
    });

    return inserted;
  }

  async getLogs(limit: number = 100): Promise<AuditLogEntry[]> {
    return auditRepository.getAll(limit);
  }

  async getLogsForResource(resourceId: string): Promise<AuditLogEntry[]> {
    return auditRepository.findByResourceId(resourceId);
  }

  /**
   * Cryptographically validates the entire SHA-256 hash chain from PostgreSQL.
   */
  async verifyIntegrity() {
    return auditRepository.verifyIntegrity();
  }

  /**
   * Retrieves enriched, chronological operational action logs for staff and delivery partners,
   * with complete actor names, order details, daily grouping, and download support.
   */
  async getStaffAndDeliveryActions(options?: { date?: string; role?: string; limit?: number }): Promise<{
    actions: StaffActionLog[];
    summary: {
      totalCount: number;
      dates: string[];
      countToday: number;
      countsByRole: Record<string, number>;
      countsByAction: Record<string, number>;
    };
  }> {
    const orders = (await db.getOrders()) || [];
    const users = (await db.getUsers()) || [];
    const auditLogs = await auditRepository.getAll(options?.limit ? options.limit * 2 : 2000);

    const userMap = new Map<string, any>();
    for (const u of users) {
      userMap.set(u.id, u);
      if (u.email) userMap.set(u.email.toLowerCase(), u);
    }

    const orderMap = new Map<string, any>();
    for (const o of orders) {
      orderMap.set(o.id, o);
    }

    const actions: StaffActionLog[] = [];
    const seenActionKeys = new Set<string>();

    // 1. Process Order Events (State transitions, acceptance, rejection, cooking, dispatch, delivery)
    for (const order of orders) {
      const events = order.events || [];
      for (const event of events) {
        let actorName = 'Staff Member';
        let actorRole: string = event.changedByRole || 'STAFF';

        const user = userMap.get(event.changedBy);
        if (user) {
          actorName = user.name;
          actorRole = user.staffRole ? `${user.role} (${user.staffRole})` : user.role;
        } else if (event.description) {
          if (event.description.includes('by ')) {
            const parts = event.description.split('by ');
            actorName = parts[1].split(' (')[0].trim();
          } else if (event.description.includes('Assigned to ')) {
            actorName = "Hunter's Kitchen (Owner)";
            actorRole = 'OWNER';
          }
        }

        if (event.changedBy === 'system') {
          actorName = 'Automated System';
          actorRole = 'SYSTEM';
        }

        let actionType = event.status as string;
        let actionTitle = event.title || `Order ${event.status}`;
        let statusBadgeColor = 'emerald';
        let details = event.description || `Order marked as ${event.status}`;

        switch (event.status) {
          case 'ACCEPTED':
            actionType = 'ACCEPTED';
            actionTitle = 'Order Accepted';
            statusBadgeColor = 'emerald';
            details = details.includes('Accepted by') ? details : `Accepted by ${actorName}`;
            break;
          case 'REJECTED':
            actionType = 'REJECTED';
            actionTitle = 'Order Rejected';
            statusBadgeColor = 'rose';
            details = `Rejected: ${order.rejectionReason || details}`;
            break;
          case 'PREPARING':
            actionType = 'PREPARING';
            actionTitle = 'Food Preparing';
            statusBadgeColor = 'amber';
            details = `Kitchen is actively preparing order #${order.orderNumber}`;
            break;
          case 'READY':
            actionType = 'READY';
            actionTitle = 'Food Ready';
            statusBadgeColor = 'blue';
            details = `Order #${order.orderNumber} packed and ready for delivery partner pickup`;
            break;
          case 'ASSIGNED':
            actionType = 'ASSIGNED';
            actionTitle = 'Driver Assigned';
            statusBadgeColor = 'indigo';
            details = order.assignedDeliveryPartnerName 
              ? `Assigned to delivery partner ${order.assignedDeliveryPartnerName}`
              : details;
            break;
          case 'PICKED_UP':
            actionType = 'PICKED_UP';
            actionTitle = 'Order Picked Up';
            statusBadgeColor = 'cyan';
            details = `Picked up by delivery partner ${actorName}`;
            break;
          case 'OUT_FOR_DELIVERY':
            actionType = 'OUT_FOR_DELIVERY';
            actionTitle = 'Out For Delivery';
            statusBadgeColor = 'purple';
            details = `Out for delivery with ${actorName}`;
            break;
          case 'DELIVERED':
            actionType = 'DELIVERED';
            actionTitle = 'Order Delivered';
            statusBadgeColor = 'emerald';
            details = `Successfully delivered by ${actorName}${order.paymentMethod === 'COD' ? ` (COD Collected: ₹${order.grandTotal})` : ''}`;
            break;
          case 'CANCELLED':
            actionType = 'CANCELLED';
            actionTitle = 'Order Cancelled';
            statusBadgeColor = 'rose';
            details = `Cancelled: ${order.cancellationReason || details}`;
            break;
        }

        const date = event.timestamp ? event.timestamp.split('T')[0] : new Date().toISOString().split('T')[0];
        const time = event.timestamp 
          ? new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : '';

        const dedupKey = `${order.id}_${actionType}_${date}_${time.substring(0, 5)}`;
        seenActionKeys.add(dedupKey);

        actions.push({
          id: event.id || `act_${order.id}_${event.status}_${Date.parse(event.timestamp)}`,
          timestamp: event.timestamp || new Date().toISOString(),
          date,
          time,
          actionType,
          actionTitle,
          actorId: event.changedBy || 'staff',
          actorName,
          actorRole,
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          details,
          rejectionReason: order.rejectionReason,
          cancellationReason: order.cancellationReason,
          assignedPartnerName: order.assignedDeliveryPartnerName,
          grandTotal: order.grandTotal,
          statusBadgeColor
        });
      }
    }

    // 2. Process Audit Logs for inventory updates, staff member adjustments, and reassignments
    for (const log of auditLogs) {
      if (log.action.startsWith('TEST_') || log.action === 'USER_LOGIN' || log.action === 'USER_LOGOUT') {
        continue;
      }

      const date = log.timestamp ? log.timestamp.split('T')[0] : new Date().toISOString().split('T')[0];
      const time = log.timestamp 
        ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : '';

      if (log.action === 'UPDATE_ITEM_AVAILABILITY') {
        actions.push({
          id: log.id,
          timestamp: log.timestamp,
          date,
          time,
          actionType: 'INVENTORY_TOGGLE',
          actionTitle: 'Dish Availability Toggled',
          actorId: log.actorId,
          actorName: log.actorName,
          actorRole: log.actorRole,
          details: `Updated availability status for menu item ${log.resourceId}`,
          statusBadgeColor: 'amber'
        });
        continue;
      }

      if (log.action === 'REASSIGN_DELIVERY_PARTNER') {
        const order = orderMap.get(log.resourceId);
        actions.push({
          id: log.id,
          timestamp: log.timestamp,
          date,
          time,
          actionType: 'REASSIGNED',
          actionTitle: 'Driver Reassigned',
          actorId: log.actorId,
          actorName: log.actorName,
          actorRole: log.actorRole,
          orderId: log.resourceId,
          orderNumber: order ? order.orderNumber : (log.newValue?.orderNumber || 'Order'),
          customerName: order?.customerName,
          details: `Reassigned delivery partner by ${log.actorName}`,
          statusBadgeColor: 'indigo'
        });
        continue;
      }

      if (log.action === 'CREATE_STAFF_MEMBER' || log.action === 'UPDATE_STAFF_ROLE' || log.action === 'DELETE_STAFF_MEMBER') {
        actions.push({
          id: log.id,
          timestamp: log.timestamp,
          date,
          time,
          actionType: 'STAFF_MANAGEMENT',
          actionTitle: log.action.replace(/_/g, ' '),
          actorId: log.actorId,
          actorName: log.actorName,
          actorRole: log.actorRole,
          details: `${log.action.replace(/_/g, ' ')}: ${log.newValue?.name || log.resourceId}`,
          statusBadgeColor: 'stone'
        });
        continue;
      }

      if (log.resource === 'ORDER') {
        const actionType = log.action.replace('TRANSITION_ORDER_', '');
        const order = orderMap.get(log.resourceId);
        const dedupKey = `${log.resourceId}_${actionType}_${date}_${time.substring(0, 5)}`;
        if (seenActionKeys.has(dedupKey)) continue;
        seenActionKeys.add(dedupKey);

        actions.push({
          id: log.id,
          timestamp: log.timestamp,
          date,
          time,
          actionType,
          actionTitle: `Order ${actionType}`,
          actorId: log.actorId,
          actorName: log.actorName,
          actorRole: log.actorRole,
          orderId: log.resourceId,
          orderNumber: order ? order.orderNumber : (log.newValue?.orderNumber || 'Order'),
          customerName: order ? order.customerName : 'Customer',
          details: `${log.action.replace(/_/g, ' ')} by ${log.actorName}`,
          statusBadgeColor: actionType === 'REJECTED' ? 'rose' : 'blue'
        });
      }
    }

    // Sort newest first
    actions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Gather date list & summary metrics across all actions
    const allDates = [...new Set(actions.map((a) => a.date))].sort().reverse();
    const todayStr = new Date().toISOString().split('T')[0];
    const countToday = actions.filter((a) => a.date === todayStr).length;

    const countsByRole: Record<string, number> = {};
    const countsByAction: Record<string, number> = {};
    for (const a of actions) {
      countsByRole[a.actorRole] = (countsByRole[a.actorRole] || 0) + 1;
      countsByAction[a.actionType] = (countsByAction[a.actionType] || 0) + 1;
    }

    // Apply filtering if specified
    let filtered = actions;
    if (options?.date && options.date !== 'ALL') {
      filtered = filtered.filter((a) => a.date === options.date);
    }
    if (options?.role && options.role !== 'ALL') {
      filtered = filtered.filter((a) => a.actorRole.toUpperCase().includes(options.role!.toUpperCase()));
    }
    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return {
      actions: filtered,
      summary: {
        totalCount: actions.length,
        dates: allDates,
        countToday,
        countsByRole,
        countsByAction
      }
    };
  }
}

export interface StaffActionLog {
  id: string;
  timestamp: string;
  date: string;
  time: string;
  actionType: string;
  actionTitle: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  orderId?: string;
  orderNumber?: string;
  customerName?: string;
  details: string;
  rejectionReason?: string;
  cancellationReason?: string;
  assignedPartnerName?: string;
  grandTotal?: number;
  statusBadgeColor: string;
}

export const auditService = new AuditService();
