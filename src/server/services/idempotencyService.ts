import fs from 'fs';
import path from 'path';
import { IdempotencyRecord } from '../models/productionTypes';
import { IdempotencyConflictError } from '../errors/AppError';
import { config } from '../config/config';

const DATA_DIR = path.join(process.cwd(), 'data');
const IDEMPOTENCY_FILE = path.join(DATA_DIR, 'idempotency_store.json');

class IdempotencyService {
  private store = new Map<string, IdempotencyRecord>();

  constructor() {
    this.init();

    // Periodic sweep of expired idempotency keys and periodic persist
    setInterval(() => {
      this.sweepExpired();
    }, 60000);
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(IDEMPOTENCY_FILE)) {
        const raw = fs.readFileSync(IDEMPOTENCY_FILE, 'utf-8');
        const records: IdempotencyRecord[] = JSON.parse(raw);
        const now = new Date().toISOString();
        for (const rec of records) {
          // Keep unexpired records
          if (rec.expiresAt > now) {
            this.store.set(rec.key, rec);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load persistent idempotency records, starting in-memory store');
    }
  }

  private persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const records = Array.from(this.store.values());
      fs.writeFileSync(IDEMPOTENCY_FILE, JSON.stringify(records, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to persist idempotency store to disk', e);
    }
  }

  private sweepExpired() {
    const now = new Date().toISOString();
    let changed = false;
    for (const [key, record] of this.store.entries()) {
      if (record.expiresAt < now) {
        this.store.delete(key);
        changed = true;
      }
    }
    if (changed) {
      this.persist();
    }
  }

  /**
   * Acquire a lock for this idempotency key.
   * If already completed, returns the cached result.
   * If currently in progress, throws IdempotencyConflictError.
   */
  startRequest(key: string, path: string, payload: any): { cached: boolean; record?: IdempotencyRecord } {
    const existing = this.store.get(key);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.idempotencyTtlSeconds * 1000).toISOString();

    if (existing) {
      if (existing.status === 'IN_PROGRESS') {
        throw new IdempotencyConflictError(key);
      }
      if (existing.status === 'COMPLETED') {
        return { cached: true, record: existing };
      }
    }

    const record: IdempotencyRecord = {
      key,
      requestPath: path,
      requestHash: JSON.stringify(payload || {}),
      status: 'IN_PROGRESS',
      createdAt: now.toISOString(),
      expiresAt
    };

    this.store.set(key, record);
    this.persist();
    return { cached: false };
  }

  /**
   * Complete the idempotent request and store the HTTP response.
   */
  completeRequest(key: string, statusCode: number, responseBody: any): void {
    const record = this.store.get(key);
    if (record) {
      record.status = 'COMPLETED';
      record.responseStatus = statusCode;
      record.responseBody = responseBody;
      this.persist();
    }
  }

  /**
   * Mark as failed so client can retry with same key.
   */
  failRequest(key: string): void {
    this.store.delete(key);
    this.persist();
  }
}

export const idempotencyService = new IdempotencyService();
