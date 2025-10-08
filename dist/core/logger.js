"use strict";
// Centralized logging for the pipeline
// Using pino for structured logging
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createLogger = createLogger;
exports.getLogger = getLogger;
exports.setLogger = setLogger;
const pino_1 = __importDefault(require("pino"));
let globalLogger = null;
function createLogger(options) {
    const level = options?.level || process.env.LOG_LEVEL || 'info';
    const pretty = options?.pretty ?? (process.env.NODE_ENV !== 'production');
    const pinoOptions = {
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
    return (0, pino_1.default)(pinoOptions);
}
function getLogger() {
    if (!globalLogger) {
        globalLogger = createLogger();
    }
    return globalLogger;
}
function setLogger(logger) {
    globalLogger = logger;
}
// Convenience exports
exports.logger = getLogger();
//# sourceMappingURL=logger.js.map