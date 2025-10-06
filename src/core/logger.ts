// Centralized logging for the pipeline
// Using pino for structured logging

import pino from 'pino';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface Logger {
  trace(msg: string, ...args: any[]): void;
  debug(msg: string, ...args: any[]): void;
  info(msg: string, ...args: any[]): void;
  warn(msg: string, ...args: any[]): void;
  error(msg: string, ...args: any[]): void;
  fatal(msg: string, ...args: any[]): void;
  child(bindings: Record<string, any>): Logger;
}

let globalLogger: Logger | null = null;

export function createLogger(options?: {
  level?: LogLevel;
  name?: string;
  pretty?: boolean;
}): Logger {
  const level = options?.level || (process.env.LOG_LEVEL as LogLevel) || 'info';
  const pretty = options?.pretty ?? (process.env.NODE_ENV !== 'production');

  const pinoOptions: pino.LoggerOptions = {
    level,
    name: options?.name || 'sneaker-pipeline',
  };

  if (pretty) {
    pinoOptions.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    };
  }

  return pino(pinoOptions) as Logger;
}

export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = createLogger();
  }
  return globalLogger as Logger;
}

export function setLogger(logger: Logger): void {
  globalLogger = logger;
}

// Convenience exports
export const logger = getLogger();
