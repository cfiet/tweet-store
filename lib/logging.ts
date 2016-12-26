import * as winston from 'winston';

let SILENT = false;

export function setSilent(value: boolean) {
  SILENT = value;
}

export type Logger = winston.LoggerInstance;

export function createLogger(...component: string[]): Logger {
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

export default createLogger;