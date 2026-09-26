import { auditRepository } from '../repositories/auditRepository';
import { AuditLogEntry } from '../models/productionTypes';
import { logger } from '../utils/logger';

export class AuditService {
  /**
   * Records a business or state-altering audit event.
   */
  log(params: {
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
  }): void {
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

    auditRepository.insert(entry);

    logger.audit(params.action, {
      requestId: params.requestId,
      actor: `${params.actorName} (${params.actorRole})`,
      resource: `${params.resource}:${params.resourceId}`,
      action: params.action
    });
  }

  getLogs(limit: number = 100): AuditLogEntry[] {
    return auditRepository.getAll(limit);
  }

  getLogsForResource(resourceId: string): AuditLogEntry[] {
    return auditRepository.findByResourceId(resourceId);
  }

  /**
   * Cryptographically validates the entire SHA-256 hash chain.
   */
  verifyIntegrity() {
    return auditRepository.verifyIntegrity();
  }
}

export const auditService = new AuditService();
