/**
 * Centralized Application Error Classes
 * 
 * Consistent error representations with HTTP status codes and domain error codes.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_SERVER_ERROR', details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    super(`${resource}${identifier ? ` '${identifier}'` : ''} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code: string = 'RESOURCE_CONFLICT') {
    super(message, 409, code);
  }
}

export class OrderStateTransitionError extends AppError {
  constructor(currentStatus: string, attemptedStatus: string, reason?: string) {
    super(
      `Cannot transition order from '${currentStatus}' to '${attemptedStatus}'${reason ? `: ${reason}` : ''}`,
      400,
      'INVALID_ORDER_STATE_TRANSITION',
      { currentStatus, attemptedStatus, reason }
    );
  }
}

export class IdempotencyConflictError extends AppError {
  constructor(key: string) {
    super(
      `A request with Idempotency-Key '${key}' is currently being processed. Please wait.`,
      409,
      'IDEMPOTENCY_IN_PROGRESS'
    );
  }
}
