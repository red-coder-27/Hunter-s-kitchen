import fs from 'fs';
import path from 'path';
import { OutboxEvent } from '../models/productionTypes';

const DATA_DIR = path.join(process.cwd(), 'data');
const OUTBOX_FILE = path.join(DATA_DIR, 'outbox_events.json');

class OutboxRepository {
  private events: OutboxEvent[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(OUTBOX_FILE)) {
        const raw = fs.readFileSync(OUTBOX_FILE, 'utf-8');
        this.events = JSON.parse(raw);
        // Automatically recover any orphaned PROCESSING events from previous crashes
        this.recoverStaleProcessing(0);
      } else {
        this.events = [];
        this.persist();
      }
    } catch (e) {
      console.warn('Failed to load outbox from disk, starting empty');
      this.events = [];
    }
  }

  /**
   * Resets any stale PROCESSING event back to PENDING.
   * If timeoutMs is 0, resets all PROCESSING events (e.g. upon server boot).
   */
  recoverStaleProcessing(timeoutMs: number = 60000): number {
    const now = Date.now();
    let recoveredCount = 0;

    for (const event of this.events) {
      if (event.status === 'PROCESSING') {
        const startedTime = event.processingStartedAt ? new Date(event.processingStartedAt).getTime() : 0;
        if (timeoutMs === 0 || now - startedTime > timeoutMs) {
          event.status = 'PENDING';
          event.processingStartedAt = undefined;
          recoveredCount++;
        }
      }
    }

    if (recoveredCount > 0) {
      this.persist();
    }
    return recoveredCount;
  }

  private persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(OUTBOX_FILE, JSON.stringify(this.events, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write outbox to disk', e);
    }
  }

  insert(event: OutboxEvent): void {
    this.events.push(event);
    this.persist();
  }

  getPendingEvents(limit: number = 20): OutboxEvent[] {
    const now = new Date().toISOString();
    return this.events
      .filter((e) => (e.status === 'PENDING' || e.status === 'FAILED') && (!e.nextRetryAt || e.nextRetryAt <= now))
      .slice(0, limit);
  }

  update(id: string, updates: Partial<OutboxEvent>): OutboxEvent | undefined {
    const idx = this.events.findIndex((e) => e.id === id);
    if (idx === -1) return undefined;
    this.events[idx] = { ...this.events[idx], ...updates };
    this.persist();
    return this.events[idx];
  }

  getAll(limit: number = 50): OutboxEvent[] {
    return [...this.events].reverse().slice(0, limit);
  }
}

export const outboxRepository = new OutboxRepository();
