import { db } from '../db';
import { AnomalyReport } from '../models/productionTypes';
import { logger } from '../utils/logger';

export class ReconciliationService {
  /**
   * Scans PostgreSQL orders and state transitions to identify inconsistencies.
   */
  async runAudit(): Promise<AnomalyReport> {
    const orders = await db.getOrders();
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
          description: `Order #${order.orderNumber} contains duplicate items with identical customizations. Consider merging quantities.`,
          suggestedAction: 'Review item consolidation.'
        });
      }

      // 8. Stale pending orders (> 20 mins in PLACED state without confirmation)
      if (order.status === 'PLACED') {
        const ageMs = now - new Date(order.createdAt).getTime();
        if (ageMs > 20 * 60 * 1000) {
          issues.push({
            type: 'STALE_PENDING_ORDER',
            severity: 'MEDIUM',
            orderId: order.id,
            description: `Order #${order.orderNumber} has been in PLACED state for > 20 minutes without kitchen acceptance.`,
            suggestedAction: 'Alert kitchen staff and verify restaurant tablet connection.'
          });
        }
      }

      // 9. Stale assigned orders (> 45 mins in ASSIGNED state without pickup)
      if (order.status === 'ASSIGNED') {
        const ageMs = now - new Date(order.createdAt).getTime();
        if (ageMs > 45 * 60 * 1000) {
          issues.push({
            type: 'STALE_ASSIGNED_ORDER',
            severity: 'HIGH',
            orderId: order.id,
            description: `Order #${order.orderNumber} has been in ASSIGNED state for > 45 minutes. Rider has not picked up.`,
            suggestedAction: 'Contact assigned driver or reassign order to active online partner.'
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
      logger.warn('Reconciliation audit detected anomalies', {
        audited: orders.length,
        anomalies: issues.length,
        critical: issues.filter((i) => i.severity === 'CRITICAL').length
      });
    }

    return report;
  }
}

export const reconciliationService = new ReconciliationService();
