"use strict";
/**
 * Structured logger for over-review.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
function createLogger(baseFields = {}, level = 'info') {
    return new ConsoleLogger(baseFields, level);
}
class ConsoleLogger {
    constructor(baseFields, level) {
        this.baseFields = baseFields;
        this.level = level;
    }
    child(fields) {
        return new ConsoleLogger({ ...this.baseFields, ...fields }, this.level);
    }
    debug(message, fields = {}) {
        this.write('debug', console.debug, message, fields);
    }
    info(message, fields = {}) {
        this.write('info', console.info, message, fields);
    }
    warn(message, fields = {}) {
        this.write('warn', console.warn, message, fields);
    }
    error(message, fields = {}) {
        this.write('error', console.error, message, fields);
    }
    write(level, sink, message, fields) {
        if (!shouldLog(this.level, level)) {
            return;
        }
        sink(JSON.stringify({
            level,
            message,
            timestamp: new Date().toISOString(),
            ...this.baseFields,
            ...fields,
        }));
    }
}
function shouldLog(configuredLevel, messageLevel) {
    const order = ['debug', 'info', 'warn', 'error'];
    return order.indexOf(messageLevel) >= order.indexOf(configuredLevel);
}
//# sourceMappingURL=logger.js.map