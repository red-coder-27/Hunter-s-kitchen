import { Request, Response, NextFunction } from 'express';

// Extend Express Request interface to carry requestId and startTime
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incomingId = req.headers['x-request-id'] as string;
  const requestId = incomingId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  req.requestId = requestId;
  req.startTime = Date.now();
  
  // Expose in response headers for client tracing
  res.setHeader('X-Request-Id', requestId);
  
  next();
}
