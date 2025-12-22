import { LoggerService, LogLevel } from '@nestjs/common';

/**
 * PRODUCTION-GRADE CUSTOM LOGGER
 * 
 * Features:
 * - Colored output for different log levels
 * - Timestamps
 * - Context tracking (which service/module logged)
 * - Environment-aware (verbose in dev, minimal in prod)
 * - Structured logging
 * 
 * Usage:
 * 1. Import: import { AppLogger } from './config/logger.config';
 * 2. Instantiate: private readonly logger = new AppLogger('YourServiceName');
 * 3. Use: this.logger.log('Message'), this.logger.error('Error'), etc.
 */

export class AppLogger implements LoggerService {
    private context?: string;
    private static logLevels: LogLevel[] = ['log', 'error', 'warn', 'debug', 'verbose'];

    constructor(context?: string) {
        this.context = context;
    }

    /**
     * Set the context (useful for changing context dynamically)
     */
    setContext(context: string) {
        this.context = context;
    }

    /**
     * Log informational messages
     */
    log(message: any, context?: string) {
        this.printMessage(message, 'log', context);
    }

    /**
     * Log error messages
     */
    error(message: any, trace?: string, context?: string) {
        this.printMessage(message, 'error', context);
        if (trace) {
            console.error(trace);
        }
    }

    /**
     * Log warning messages
     */
    warn(message: any, context?: string) {
        this.printMessage(message, 'warn', context);
    }

    /**
     * Log debug messages (only in development)
     */
    debug(message: any, context?: string) {
        if (process.env.NODE_ENV !== 'production') {
            this.printMessage(message, 'debug', context);
        }
    }

    /**
     * Log verbose messages (only in development)
     */
    verbose(message: any, context?: string) {
        if (process.env.NODE_ENV !== 'production') {
            this.printMessage(message, 'verbose', context);
        }
    }

    /**
     * Core method to print formatted messages
     */
    private printMessage(
        message: any,
        logLevel: LogLevel,
        context?: string,
    ) {
        const timestamp = new Date().toISOString();
        const ctx = context || this.context || 'Application';
        const color = this.getColorByLogLevel(logLevel);
        const levelText = logLevel.toUpperCase().padEnd(7);

        // Format: [Timestamp] [LEVEL] [Context] Message
        const formattedMessage = `${color}[${timestamp}] [${levelText}] [${ctx}]${this.resetColor} ${message}`;

        // Print to appropriate console method
        switch (logLevel) {
            case 'error':
                console.error(formattedMessage);
                break;
            case 'warn':
                console.warn(formattedMessage);
                break;
            case 'debug':
            case 'verbose':
                console.debug(formattedMessage);
                break;
            default:
                console.log(formattedMessage);
        }
    }

    /**
     * Get ANSI color codes for different log levels
     */
    private getColorByLogLevel(level: LogLevel): string {
        switch (level) {
            case 'log':
                return '\x1b[32m'; // Green
            case 'error':
                return '\x1b[31m'; // Red
            case 'warn':
                return '\x1b[33m'; // Yellow
            case 'debug':
                return '\x1b[36m'; // Cyan
            case 'verbose':
                return '\x1b[35m'; // Magenta
            default:
                return '\x1b[37m'; // White
        }
    }

    /**
     * Reset color
     */
    private get resetColor(): string {
        return '\x1b[0m';
    }
}

/**
 * Global logger instance
 * Use this when you don't need a specific context
 */
export const globalLogger = new AppLogger('Global');
