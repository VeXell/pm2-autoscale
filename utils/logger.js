"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogger = exports.initLogger = void 0;
class SimpleLogger {
    constructor(isDebug = false) {
        this.isDebug = false;
        this.isDebug = isDebug;
    }
    debug(message) {
        if (this.isDebug) {
            const value = `DEBUG: ${message}`;
            this.log(value);
        }
    }
    error(message) {
        const value = `ERROR: ${message}`;
        this.logError(value);
    }
    info(message) {
        const value = `INFO: ${message}`;
        this.log(value);
    }
    log(message) {
        console.log(message);
    }
    logError(message) {
        console.error(message);
    }
}
let loggerInstance;
const initLogger = ({ isDebug }) => {
    if (!loggerInstance) {
        loggerInstance = new SimpleLogger(isDebug);
    }
};
exports.initLogger = initLogger;
const getLogger = () => {
    if (!loggerInstance) {
        loggerInstance = new SimpleLogger();
    }
    return loggerInstance;
};
exports.getLogger = getLogger;
