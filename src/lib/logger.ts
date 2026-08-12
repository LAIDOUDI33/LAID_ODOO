// ============================================================
// HASSIBA Suite ERP v2.0.0 - Logger Utility
// Environment-aware logging for frontend and backend
// ============================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  context?: string;
  enabled?: boolean;
}

/**
 * Development-only logger that auto-disables in production
 * Use this instead of console.log for all frontend logging
 * 
 * Note: options should be passed as the LAST argument or as an object property
 */
export const logger = {
  debug: (message: string, optionsOrArg?: LoggerOptions | any, ...rest: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      // Determine if first arg is options object
      const options: LoggerOptions | undefined = 
        optionsOrArg && typeof optionsOrArg === 'object' && !Array.isArray(optionsOrArg)
          ? optionsOrArg as LoggerOptions 
          : undefined;
      const args = (options || (optionsOrArg && typeof optionsOrArg !== 'object')) 
        ? [optionsOrArg, ...rest] 
        : rest;
      const prefix = options?.context ? `[${options.context}]` : '[DEBUG]';
      console.log(prefix, message, ...args);
    }
  },

  info: (message: string, optionsOrArg?: LoggerOptions | any, ...rest: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      const options: LoggerOptions | undefined = 
        optionsOrArg && typeof optionsOrArg === 'object' && !Array.isArray(optionsOrArg)
          ? optionsOrArg as LoggerOptions 
          : undefined;
      const args = (options || (optionsOrArg && typeof optionsOrArg !== 'object'))
        ? [optionsOrArg, ...rest]
        : rest;
      const prefix = options?.context ? `[${options.context}]` : '[INFO]';
      console.info(prefix, message, ...args);
    }
  },

  warn: (message: string, optionsOrArg?: LoggerOptions | any, ...rest: any[]) => {
    // Always show warnings (but with less detail in production)
    const options: LoggerOptions | undefined = 
      optionsOrArg && typeof optionsOrArg === 'object' && !Array.isArray(optionsOrArg)
        ? optionsOrArg as LoggerOptions 
        : undefined;
    const prefix = options?.context ? `[${options.context}]` : '[WARN]';
    
    if (process.env.NODE_ENV === 'development') {
      const args = (options || (optionsOrArg && typeof optionsOrArg !== 'object'))
        ? [optionsOrArg, ...rest]
        : rest;
      console.warn(prefix, message, ...args);
    } else {
      console.warn(prefix, message);
    }
  },

  error: (message: string, optionsOrArg?: LoggerOptions | any, ...rest: any[]) => {
    // Always show errors
    const options: LoggerOptions | undefined = 
      optionsOrArg && typeof optionsOrArg === 'object' && !Array.isArray(optionsOrArg)
        ? optionsOrArg as LoggerOptions 
        : undefined;
    const prefix = options?.context ? `[${options.context}]` : '[ERROR]';
    const args = (options || (optionsOrArg && typeof optionsOrArg !== 'object'))
      ? [optionsOrArg, ...rest]
      : rest;
    console.error(prefix, message, ...args);
  },

  /**
   * Group related logs together (dev only)
   */
  group: (label: string, fn: () => void) => {
    if (process.env.NODE_ENV === 'development') {
      console.group(label);
      fn();
      console.groupEnd();
    }
  },
};

/**
 * Backend logger - always logs but sanitizes in production
 * For use in API routes and server-side code
 */
export const serverLogger = {
  log: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Server] ${message}`, data ?? '');
    } else {
      // In production, write to structured logs or external service
      console.log(`[Server] ${message}`);
    }
  },

  error: (message: string, error?: Error | unknown) => {
    // Always log errors with full details for debugging
    console.error(`[Server Error] ${message}`, error);
    
    // TODO: In production, send to error tracking service (Sentry, etc.)
  },
};

export default logger;
