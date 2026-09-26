/**
 * Observability & Structured Logging Module
 * 
 * Provides ISO timestamped, JSON-friendly structured logs with Request ID correlation.
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  AUDIT = 'AUDIT',
  METRIC = 'METRIC'
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  orderId?: string;
  role?: string;
  durationMs?: number;
  [key: string]: any;
}

class StructuredLogger {
  private formatLog(level: LogLevel, message: string, context?: LogContext) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context || {})
    };
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(JSON.stringify(this.formatLog(LogLevel.DEBUG, message, context)));
    }
  }

  info(message: string, context?: LogContext) {
    console.log(JSON.stringify(this.formatLog(LogLevel.INFO, message, context)));
  }

  warn(message: string, context?: LogContext) {
    console.warn(JSON.stringify(this.formatLog(LogLevel.WARN, message, context)));
  }

  error(message: string, error?: any, context?: LogContext) {
    const errorDetails = error instanceof Error ? {
      errorName: error.name,
      errorMessage: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    } : { errorRaw: error };

    console.error(JSON.stringify(this.formatLog(LogLevel.ERROR, message, { ...context, ...errorDetails })));
  }

  audit(action: string, context: LogContext) {
    console.log(JSON.stringify(this.formatLog(LogLevel.AUDIT, `AUDIT: ${action}`, context)));
  }

  metric(name: string, value: number, unit: string, context?: LogContext) {
    console.log(JSON.stringify(this.formatLog(LogLevel.METRIC, `METRIC: ${name}=${value}${unit}`, {
      metricName: name,
      metricValue: value,
      metricUnit: unit,
      ...(context || {})
    })));
  }
}

export const logger = new StructuredLogger();
