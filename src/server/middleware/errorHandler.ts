import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const requestId = req.requestId || 'req_unknown';

  if (err instanceof AppError) {
    if (err.statusCode < 500) {
      logger.info(`Handled client AppError [${err.code}]: ${err.message}`, {
        requestId,
        statusCode: err.statusCode,
        path: req.originalUrl,
        details: err.details
      });
    } else {
      logger.warn(`Handled AppError [${err.code}]: ${err.message}`, {
        requestId,
        statusCode: err.statusCode,
        path: req.originalUrl,
        details: err.details
      });
    }

    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      },
      requestId,
      timestamp: new Date().toISOString()
    });
  }

  // Unhandled / Internal Server Error
  logger.error(`Unhandled Server Error: ${err.message || err}`, err, {
    requestId,
    path: req.originalUrl,
    method: req.method
  });

  const isProd = process.env.NODE_ENV === 'production';
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isProd
        ? 'An unexpected internal error occurred. Our engineering team has been notified.'
        : (err?.message || 'An unexpected error occurred.'),
      // Never leak stack traces to customers in production
      details: !isProd ? err.stack : undefined
    },
    requestId,
    timestamp: new Date().toISOString()
  });
}
