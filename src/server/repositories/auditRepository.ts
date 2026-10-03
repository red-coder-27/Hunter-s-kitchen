import crypto from 'crypto';
import { AuditLogEntry } from '../models/productionTypes';
import { postgresDb } from '../db/postgres';
import { logger } from '../utils/logger';

const GENESIS_HASH = '0'.repeat(64);

class AuditRepository {
  private calculateHash(
    seq: number,
    prevHash: string,
    action: string,
    resource: string,
    resourceId: string,
    oldVal: any,
    newVal: any,
    requestId: string,
    timestamp: string
  ): string {
    const payload = `${seq}|${prevHash}|${action}|${resource}|${resourceId}|${JSON.stringify(oldVal || '')}|${JSON.stringify(newVal || '')}|${requestId}|${timestamp}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  async insert(entryData: Omit<AuditLogEntry, 'sequenceNumber' | 'previousHash' | 'hash'>): Promise<AuditLogEntry> {
    try {
      return await postgresDb.transaction(async (client) => {
        // Query latest sequence and hash with row lock
        const lastRowRes = await client.query(
          'SELECT sequence_number, hash FROM audit_logs ORDER BY sequence_number DESC LIMIT 1 FOR UPDATE'
        );

        const lastRow = lastRowRes.rows[0];
        const sequenceNumber = lastRow ? Number(lastRow.sequence_number) + 1 : 1;
        const previousHash = lastRow ? lastRow.hash : GENESIS_HASH;

        const hash = this.calculateHash(
          sequenceNumber,
          previousHash,
          entryData.action,
          entryData.resource,
          entryData.resourceId,
          entryData.oldValue,
          entryData.newValue,
          entryData.requestId,
          entryData.timestamp
        );

        const fullEntry: AuditLogEntry = {
          sequenceNumber,
          ...entryData,
          previousHash,
          hash
        };

        await client.query(
          `INSERT INTO audit_logs (
            sequence_number, id, actor_id, actor_name, actor_role, action, resource,
            resource_id, old_value, new_value, request_id, ip_address, timestamp,
            previous_hash, hash
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            sequenceNumber,
            fullEntry.id,
            fullEntry.actorId,
            fullEntry.actorName,
            fullEntry.actorRole,
            fullEntry.action,
            fullEntry.resource,
            fullEntry.resourceId,
            JSON.stringify(fullEntry.oldValue || null),
            JSON.stringify(fullEntry.newValue || null),
            fullEntry.requestId,
            fullEntry.ipAddress || null,
            fullEntry.timestamp || new Date().toISOString(),
            previousHash,
            hash
          ]
        );

        return fullEntry;
      });
    } catch (e: any) {
      logger.error('Failed to insert audit log into PostgreSQL', { error: e.message });
      throw e;
    }
  }

  async getAll(limit: number = 100): Promise<AuditLogEntry[]> {
    const res = await postgresDb.query(
      'SELECT * FROM audit_logs ORDER BY sequence_number DESC LIMIT $1',
      [limit]
    );
    return res.rows.map(this.rowToEntry);
  }

  async findByResourceId(resourceId: string): Promise<AuditLogEntry[]> {
    const res = await postgresDb.query(
      'SELECT * FROM audit_logs WHERE resource_id = $1 ORDER BY sequence_number ASC',
      [resourceId]
    );
    return res.rows.map(this.rowToEntry);
  }

  /**
   * Cryptographically verifies the SHA-256 hash chain of the entire audit trail stored in PostgreSQL.
   */
  async verifyIntegrity(): Promise<{
    isValid: boolean;
    checkedCount: number;
    genesisHash: string;
    latestHash: string;
    brokenAt?: number;
    error?: string;
  }> {
    const res = await postgresDb.query('SELECT * FROM audit_logs ORDER BY sequence_number ASC');
    const logs = res.rows.map(this.rowToEntry);

    if (logs.length === 0) {
      return {
        isValid: true,
        checkedCount: 0,
        genesisHash: GENESIS_HASH,
        latestHash: GENESIS_HASH
      };
    }

    let expectedPreviousHash = GENESIS_HASH;

    for (let i = 0; i < logs.length; i++) {
      const entry = logs[i];

      // 1. Verify previous hash pointer
      if (entry.previousHash !== expectedPreviousHash) {
        return {
          isValid: false,
          checkedCount: i,
          genesisHash: GENESIS_HASH,
          latestHash: entry.hash || 'NONE',
          brokenAt: entry.sequenceNumber || (i + 1),
          error: `Hash pointer broken at sequence #${entry.sequenceNumber || (i + 1)}. Expected prev ${expectedPreviousHash.substring(0, 10)}..., got ${(entry.previousHash || 'NONE').substring(0, 10)}...`
        };
      }

      // 2. Recalculate and verify record hash
      const computedHash = this.calculateHash(
        entry.sequenceNumber,
        entry.previousHash,
        entry.action,
        entry.resource,
        entry.resourceId,
        entry.oldValue,
        entry.newValue,
        entry.requestId,
        entry.timestamp
      );

      if (computedHash !== entry.hash) {
        return {
          isValid: false,
          checkedCount: i,
          genesisHash: GENESIS_HASH,
          latestHash: entry.hash,
          brokenAt: entry.sequenceNumber,
          error: `Tamper detected in record #${entry.sequenceNumber}: computed hash does not match stored block hash.`
        };
      }

      expectedPreviousHash = entry.hash;
    }

    return {
      isValid: true,
      checkedCount: logs.length,
      genesisHash: GENESIS_HASH,
      latestHash: logs[logs.length - 1].hash
    };
  }

  private rowToEntry(r: any): AuditLogEntry {
    const parseJson = (v: any) => (typeof v === 'string' ? JSON.parse(v) : v);
    return {
      sequenceNumber: Number(r.sequence_number),
      id: r.id,
      actorId: r.actor_id,
      actorName: r.actor_name,
      actorRole: r.actor_role,
      action: r.action,
      resource: r.resource,
      resourceId: r.resource_id,
      oldValue: parseJson(r.old_value),
      newValue: parseJson(r.new_value),
      requestId: r.request_id,
      ipAddress: r.ip_address || undefined,
      timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : new Date().toISOString(),
      previousHash: r.previous_hash,
      hash: r.hash
    };
  }
}

export const auditRepository = new AuditRepository();
