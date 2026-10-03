import { Request, Response, NextFunction } from 'express';
import { idempotencyService } from '../services/idempotencyService';
import { logger } from '../utils/logger';

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const idempotencyKey = req.headers['idempotency-key'] as string;

  // Only apply to mutating requests (POST, PUT, PATCH, DELETE) with an Idempotency-Key
  if (!idempotencyKey || req.method === 'GET') {
    return next();
  }

  try {
    const { cached, record } = idempotencyService.startRequest(idempotencyKey, req.path, req.body);

    if (cached && record) {
      logger.info(`Idempotent request replayed for key: ${idempotencyKey}`, {
        requestId: req.requestId,
        path: req.path
      });
      res.setHeader('X-Cache-Lookup', 'IDEMPOTENT_HIT');
      return res.status(record.responseStatus || 200).json(record.responseBody);
    }

    // Intercept response to store result
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        idempotencyService.completeRequest(idempotencyKey, res.statusCode, body);
      } else {
        idempotencyService.failRequest(idempotencyKey);
      }
      return originalJson(body);
    };

    next();
  } catch (err) {
    next(err);
  }
}
