"use strict";
const winston = require("winston");
let SILENT = false;
function setSilent(value) {
    SILENT = value;
}
exports.setSilent = setSilent;
function createLogger(...component) {
    return new winston.Logger({
        transports: [
            new winston.transports.Console({
                colorize: true,
                label: component.join('.'),
                name: 'console',
                timestamp: new Date().toISOString(),
                get silent() {
                    return SILENT;
                }
            })
        ]
    });
}
exports.createLogger = createLogger;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createLogger;
//# sourceMappingURL=logging.js.map