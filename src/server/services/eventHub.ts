import { Response } from 'express';
import { logger } from '../utils/logger';

interface SSEClient {
  id: string;
  res: Response;
  role?: string;
  userId?: string;
  lastEventId?: string;
  connectedAt: string;
}

interface BufferedEvent {
  id: string;
  eventType: string;
  data: any;
  filter?: { role?: string; userId?: string };
  timestamp: string;
}

class EventHub {
  private clients: SSEClient[] = [];
  private eventHistory: BufferedEvent[] = [];
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Keepalive heartbeat every 25 seconds to keep proxies and firewalls from timing out
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, 25000);
  }

  private sendHeartbeat() {
    const pingPayload = `: keep-alive ${new Date().toISOString()}\n\n`;
    const deadClients: string[] = [];

    for (const client of this.clients) {
      try {
        client.res.write(pingPayload);
      } catch (e) {
        deadClients.push(client.id);
      }
    }

    for (const deadId of deadClients) {
      this.removeClient(deadId);
    }
  }

  addClient(id: string, res: Response, role?: string, userId?: string, lastEventId?: string) {
    const client: SSEClient = {
      id,
      res,
      role,
      userId,
      lastEventId,
      connectedAt: new Date().toISOString()
    };
    this.clients.push(client);

    // Initial connected handshake
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId: id, timestamp: new Date().toISOString() })}\n\n`);

    // If reconnecting with Last-Event-ID, replay missed events
    if (lastEventId) {
      this.replayMissedEvents(client, lastEventId);
    }

    logger.debug(`SSE Client connected: ${id} (Role: ${role || 'ALL'}, Total: ${this.clients.length})`);
  }

  private replayMissedEvents(client: SSEClient, lastEventId: string) {
    const lastIndex = this.eventHistory.findIndex((e) => e.id === lastEventId);
    if (lastIndex !== -1 && lastIndex < this.eventHistory.length - 1) {
      const missed = this.eventHistory.slice(lastIndex + 1);
      for (const ev of missed) {
        if (ev.filter?.role && client.role && client.role !== ev.filter.role && client.role !== 'OWNER') continue;
        if (ev.filter?.userId && client.userId && client.userId !== ev.filter.userId) continue;

        try {
          client.res.write(`id: ${ev.id}\nevent: ${ev.eventType}\ndata: ${JSON.stringify(ev.data)}\n\n`);
        } catch (e) {
          this.removeClient(client.id);
          break;
        }
      }
    }
  }

  removeClient(id: string) {
    this.clients = this.clients.filter((c) => c.id !== id);
    logger.debug(`SSE Client disconnected: ${id} (Remaining: ${this.clients.length})`);
  }

  broadcast(eventType: string, data: any, filter?: { role?: string; userId?: string }) {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const buffered: BufferedEvent = {
      id: eventId,
      eventType,
      data,
      filter,
      timestamp: new Date().toISOString()
    };

    // Store in circular history buffer (max 100 events)
    this.eventHistory.push(buffered);
    if (this.eventHistory.length > 100) {
      this.eventHistory = this.eventHistory.slice(-100);
    }

    const payload = `id: ${eventId}\nevent: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;

    const deadClients: string[] = [];

    this.clients.forEach((client) => {
      if (filter?.role && client.role && client.role !== filter.role && client.role !== 'OWNER') {
        return;
      }
      if (filter?.userId && client.userId && client.userId !== filter.userId) {
        return;
      }

      try {
        client.res.write(payload);
      } catch (e) {
        deadClients.push(client.id);
      }
    });

    for (const deadId of deadClients) {
      this.removeClient(deadId);
    }
  }

  getClientCount(): number {
    return this.clients.length;
  }

  /**
   * Graceful shutdown of all active SSE streams
   */
  closeAll() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    const shutdownPayload = `event: server_shutdown\ndata: ${JSON.stringify({ message: 'Server shutting down' })}\n\n`;
    for (const client of this.clients) {
      try {
        client.res.write(shutdownPayload);
        client.res.end();
      } catch (e) {
        // Ignore closing errors
      }
    }
    this.clients = [];
    logger.info('All SSE client streams gracefully closed');
  }
}

export const eventHub = new EventHub();
