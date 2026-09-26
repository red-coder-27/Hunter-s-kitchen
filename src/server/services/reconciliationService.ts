import { db } from '../db';
import { AnomalyReport } from '../models/productionTypes';
import { logger } from '../utils/logger';

export class ReconciliationService {
  /**
   * Scans existing orders and state transitions to identify inconsistencies.
   */
  runAudit(): AnomalyReport {
    const orders = db.getOrders();
    const issues: AnomalyReport['issues'] = [];
    const now = Date.now();

    for (const order of orders) {
      // 1. Check DELIVERED orders that have pending COD cash
      if (order.status === 'DELIVERED' && order.paymentMethod === 'COD' && order.paymentStatus === 'COD_PENDING') {
        issues.push({
          type: 'UNCOLLECTED_COD',
          severity: 'HIGH',
          orderId: order.id,
          description: `Order #${order.orderNumber} is marked DELIVERED but COD cash collection is still pending (₹${order.grandTotal}).`,
          suggestedAction: 'Verify cash deposit with assigned delivery partner and reconcile payment status to PAID_CASH.'
        });
      }

      // 2. Check ASSIGNED, PICKED_UP, or OUT_FOR_DELIVERY orders without delivery partner
      if (['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(order.status) && !order.assignedDeliveryPartnerId) {
        issues.push({
          type: order.status === 'OUT_FOR_DELIVERY' ? 'OUT_FOR_DELIVERY_WITHOUT_RIDER' : 'ASSIGNED_WITHOUT_RIDER',
          severity: 'CRITICAL',
          orderId: order.id,
          description: `Order #${order.orderNumber} is in status '${order.status}' but has no delivery partner assigned.`,
          suggestedAction: 'Reassign delivery partner immediately or return status back to READY.'
        });
      }

      // 3. Price validation check
      let calculatedSubtotal = 0;
      for (const item of order.items) {
        calculatedSubtotal += item.totalPrice;
      }
      if (Math.abs(calculatedSubtotal - order.subtotal) > 1) {
        issues.push({
          type: 'PRICE_MISMATCH',
          severity: 'MEDIUM',
          orderId: order.id,
          description: `Order #${order.orderNumber} calculated item subtotal (₹${calculatedSubtotal}) differs from recorded subtotal (₹${order.subtotal}).`,
          suggestedAction: 'Audit order items and recalculate tax and grand total.'
        });
      }

      // 4. Non-positive or negative order total
      if (order.grandTotal <= 0 || order.subtotal <= 0) {
        issues.push({
          type: 'NEGATIVE_ORDER_TOTAL',
          severity: 'CRITICAL',
          orderId: order.id,
          description: `Order #${order.orderNumber} has invalid grand total (₹${order.grandTotal}) or subtotal (₹${order.subtotal}).`,
          suggestedAction: 'Verify order calculation logic and void or correct order.'
        });
      }

      // 5. Cancelled but marked delivered
      if (order.status === 'CANCELLED' && (order.deliveredAt || order.events.some((e) => e.status === 'DELIVERED'))) {
        issues.push({
          type: 'CANCELLED_BUT_DELIVERED',
          severity: 'CRITICAL',
          orderId: order.id,
          description: `Order #${order.orderNumber} is marked CANCELLED but contains a delivery event or delivered timestamp.`,
          suggestedAction: 'Investigate dispute with customer and delivery driver; confirm physical goods state.'
        });
      }

      // 6. Cancelled but COD collected
      if (order.status === 'CANCELLED' && (order.paymentStatus === 'PAID_CASH' || (order.codCashTendered && order.codCashTendered > 0))) {
        issues.push({
          type: 'CANCELLED_BUT_COD_COLLECTED',
          severity: 'HIGH',
          orderId: order.id,
          description: `Order #${order.orderNumber} is marked CANCELLED but COD cash was recorded as collected (₹${order.grandTotal}).`,
          suggestedAction: 'Initiate cash refund or reconcile physical drawer balance.'
        });
      }

      // 7. Duplicate order items check
      const seenItemSignatures = new Set<string>();
      let hasDuplicates = false;
      for (const item of order.items) {
        const sig = `${item.menuItemId}_${JSON.stringify(item.customizations || [])}_${JSON.stringify(item.addons || [])}`;
        if (seenItemSignatures.has(sig)) {
          hasDuplicates = true;
          break;
        }
        seenItemSignatures.add(sig);
      }
      if (hasDuplicates) {
        issues.push({
          type: 'DUPLICATE_ORDER_ITEMS',
          severity: 'LOW',
          orderId: order.id,
          description: `Order #${order.orderNumber} contains identical line items that were not aggregated into a single item with quantity.`,
          suggestedAction: 'Ensure client-side cart consolidates identical line items.'
        });
      }

      // 8. Stale pending order (> 20 minutes in PLACED state)
      if (order.status === 'PLACED') {
        const orderAgeMinutes = (now - new Date(order.createdAt).getTime()) / (1000 * 60);
        if (orderAgeMinutes > 20) {
          issues.push({
            type: 'STALE_PENDING_ORDER',
            severity: 'HIGH',
            orderId: order.id,
            description: `Order #${order.orderNumber} has remained in PLACED state for ${Math.round(orderAgeMinutes)} minutes without acceptance.`,
            suggestedAction: 'Alert kitchen manager or auto-cancel order with customer notification.'
          });
        }
      }

      // 9. Stale assigned order (> 45 minutes in ASSIGNED state without pick-up)
      if (order.status === 'ASSIGNED') {
        const assignedTime = order.events.find((e) => e.status === 'ASSIGNED')?.timestamp || order.createdAt;
        const assignedAgeMinutes = (now - new Date(assignedTime).getTime()) / (1000 * 60);
        if (assignedAgeMinutes > 45) {
          issues.push({
            type: 'STALE_ASSIGNED_ORDER',
            severity: 'MEDIUM',
            orderId: order.id,
            description: `Order #${order.orderNumber} was assigned to ${order.assignedDeliveryPartnerName || 'a driver'} ${Math.round(assignedAgeMinutes)} minutes ago but has not been picked up.`,
            suggestedAction: 'Contact delivery partner or reassign to an active rider.'
          });
        }
      }
    }

    const report: AnomalyReport = {
      timestamp: new Date().toISOString(),
      totalOrdersAudited: orders.length,
      anomaliesDetected: issues.length,
      issues
    };

    if (issues.length > 0) {
      logger.warn(`Reconciliation audit completed with ${issues.length} anomaly detected`, {
        anomaliesCount: issues.length
      });
    } else {
      logger.info(`Reconciliation audit completed successfully: 0 anomalies across ${orders.length} orders.`);
    }

    return report;
  }
}

export const reconciliationService = new ReconciliationService();
