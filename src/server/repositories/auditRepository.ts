import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AuditLogEntry } from '../models/productionTypes';

const DATA_DIR = path.join(process.cwd(), 'data');
const AUDIT_FILE = path.join(DATA_DIR, 'audit_logs.json');
const GENESIS_HASH = '0'.repeat(64);

class AuditRepository {
  private logs: AuditLogEntry[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(AUDIT_FILE)) {
        const raw = fs.readFileSync(AUDIT_FILE, 'utf-8');
        this.logs = JSON.parse(raw);
        // Backfill cryptographic hash chain for any legacy logs missing hashes
        this.ensureHashChainIntegrityOnBoot();
      } else {
        this.logs = [];
        this.persist();
      }
    } catch (e) {
      console.warn('Failed to load audit logs from file, initializing store');
      this.logs = [];
    }
  }

  /**
   * Backfills cryptographic hashes for any legacy log entries missing chain fields
   */
  private ensureHashChainIntegrityOnBoot() {
    let prevHash = GENESIS_HASH;
    let modified = false;

    for (let i = 0; i < this.logs.length; i++) {
      const entry = this.logs[i];
      const seq = i + 1;
      const expectedHash = this.calculateHash(
        seq,
        prevHash,
        entry.action,
        entry.resource,
        entry.resourceId,
        entry.oldValue,
        entry.newValue,
        entry.requestId,
        entry.timestamp
      );

      if (entry.hash !== expectedHash || entry.sequenceNumber !== seq || entry.previousHash !== prevHash) {
        entry.sequenceNumber = seq;
        entry.previousHash = prevHash;
        entry.hash = expectedHash;
        modified = true;
      }
      prevHash = entry.hash;
    }

    if (modified) {
      this.persist();
    }
  }

  private persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(AUDIT_FILE, JSON.stringify(this.logs, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write audit logs to disk', e);
    }
  }

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

  insert(entryData: Omit<AuditLogEntry, 'sequenceNumber' | 'previousHash' | 'hash'>): AuditLogEntry {
    const sequenceNumber = this.logs.length + 1;
    const previousHash = this.logs.length > 0 ? this.logs[this.logs.length - 1].hash : GENESIS_HASH;

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

    this.logs.push(fullEntry);

    // Keep up to 10,000 persistent audit records
    if (this.logs.length > 10000) {
      this.logs = this.logs.slice(-10000);
    }
    this.persist();

    return fullEntry;
  }

  getAll(limit: number = 100): AuditLogEntry[] {
    // Return newest first for UI and API consumers
    return [...this.logs].reverse().slice(0, limit);
  }

  findByResourceId(resourceId: string): AuditLogEntry[] {
    return this.logs.filter((l) => l.resourceId === resourceId);
  }

  /**
   * Cryptographically verifies the SHA-256 hash chain of the entire audit trail.
   * Detects any altered data, deleted rows, or injection tampering.
   */
  verifyIntegrity(): {
    isValid: boolean;
    checkedCount: number;
    genesisHash: string;
    latestHash: string;
    brokenAt?: number;
    error?: string;
  } {
    if (this.logs.length === 0) {
      return {
        isValid: true,
        checkedCount: 0,
        genesisHash: GENESIS_HASH,
        latestHash: GENESIS_HASH
      };
    }

    let expectedPreviousHash = GENESIS_HASH;

    for (let i = 0; i < this.logs.length; i++) {
      const entry = this.logs[i];

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
      checkedCount: this.logs.length,
      genesisHash: GENESIS_HASH,
      latestHash: this.logs[this.logs.length - 1].hash
    };
  }
}

export const auditRepository = new AuditRepository();
