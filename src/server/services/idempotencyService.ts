import { IdempotencyRecord } from '../models/productionTypes';
import { IdempotencyConflictError } from '../errors/AppError';
import { config } from '../config/config';
import { postgresDb } from '../db/postgres';
import { logger } from '../utils/logger';

class IdempotencyService {
  constructor() {
    // Periodic sweep of expired idempotency keys in PostgreSQL
    setInterval(() => {
      this.sweepExpired().catch((err) => {
        logger.warn('Failed to sweep expired idempotency records', { error: err.message });
      });
    }, 60000);
  }

  private async sweepExpired(): Promise<void> {
    try {
      await postgresDb.query('DELETE FROM idempotency_records WHERE expires_at < NOW()');
    } catch (e: any) {
      logger.warn('Error sweeping expired idempotency records', { error: e.message });
    }
  }

  /**
   * Acquire a lock for this idempotency key in PostgreSQL.
   * If already completed, returns the cached result.
   * If currently in progress, throws IdempotencyConflictError.
   */
  async startRequest(
    key: string,
    path: string,
    payload: any
  ): Promise<{ cached: boolean; record?: IdempotencyRecord }> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.idempotencyTtlSeconds * 1000);
    const requestHash = JSON.stringify(payload || {});

    return postgresDb.transaction(async (client) => {
      const existingRes = await client.query(
        'SELECT * FROM idempotency_records WHERE key = $1 FOR UPDATE',
        [key]
      );

      if (existingRes.rows.length > 0) {
        const existing = this.rowToRecord(existingRes.rows[0]);
        const isExpired = new Date(existing.expiresAt).getTime() <= now.getTime();

        if (!isExpired) {
          if (existing.status === 'IN_PROGRESS') {
            throw new IdempotencyConflictError(key);
          }
          if (existing.status === 'COMPLETED') {
            return { cached: true, record: existing };
          }
        }
      }

      await client.query(
        `INSERT INTO idempotency_records (key, request_path, request_hash, status, created_at, expires_at)
         VALUES ($1, $2, $3, 'IN_PROGRESS', $4, $5)
         ON CONFLICT (key) DO UPDATE SET
           request_path = EXCLUDED.request_path,
           request_hash = EXCLUDED.request_hash,
           status = 'IN_PROGRESS',
           response_status = NULL,
           response_body = NULL,
           created_at = EXCLUDED.created_at,
           expires_at = EXCLUDED.expires_at`,
        [key, path, requestHash, now, expiresAt]
      );

      return { cached: false };
    });
  }

  /**
   * Complete the request and store the response in PostgreSQL.
   */
  async completeRequest(key: string, statusCode: number, responseBody: any): Promise<void> {
    try {
      await postgresDb.query(
        `UPDATE idempotency_records SET
          status = 'COMPLETED', response_status = $1, response_body = $2
        WHERE key = $3`,
        [statusCode, JSON.stringify(responseBody || null), key]
      );
    } catch (e: any) {
      logger.error('Failed to complete idempotency record in PostgreSQL', { key, error: e.message });
    }
  }

  /**
   * Mark request as failed so client can retry.
   */
  async failRequest(key: string): Promise<void> {
    try {
      await postgresDb.query(`DELETE FROM idempotency_records WHERE key = $1`, [key]);
    } catch (e: any) {
      logger.error('Failed to reset idempotency record in PostgreSQL', { key, error: e.message });
    }
  }

  private rowToRecord(r: any): IdempotencyRecord {
    const parseJson = (v: any) => (typeof v === 'string' ? JSON.parse(v) : v);
    return {
      key: r.key,
      requestPath: r.request_path,
      requestHash: r.request_hash,
      status: r.status,
      responseStatus: r.response_status ? Number(r.response_status) : undefined,
      responseBody: parseJson(r.response_body),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : new Date().toISOString()
    };
  }
}

export const idempotencyService = new IdempotencyService();
