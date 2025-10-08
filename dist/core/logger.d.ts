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
export declare function createLogger(options?: {
    level?: LogLevel;
    name?: string;
    pretty?: boolean;
}): Logger;
export declare function getLogger(): Logger;
export declare function setLogger(logger: Logger): void;
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map