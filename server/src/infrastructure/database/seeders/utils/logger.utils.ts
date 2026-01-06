/**
 * Logger Utilities for Seeding Progress
 * 
 * Provides colorful, informative console output for seeding operations.
 */

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',

    // Foreground colors
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',

    // Background colors
    bgBlack: '\x1b[40m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m',
};

/**
 * Format a message with color
 */
function colorize(text: string, color: keyof typeof colors): string {
    return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Logger utility with various log levels and progress tracking
 */
export const logger = {
    /**
     * Log an info message (blue)
     */
    info: (message: string, ...args: any[]): void => {
        console.log(colorize('ℹ', 'blue'), message, ...args);
    },

    /**
     * Log a success message (green)
     */
    success: (message: string, ...args: any[]): void => {
        console.log(colorize('✓', 'green'), message, ...args);
    },

    /**
     * Log a warning message (yellow)
     */
    warn: (message: string, ...args: any[]): void => {
        console.log(colorize('⚠', 'yellow'), message, ...args);
    },

    /**
     * Log an error message (red)
     */
    error: (message: string, ...args: any[]): void => {
        console.log(colorize('✖', 'red'), message, ...args);
    },

    /**
     * Log a debug message (dim/gray)
     */
    debug: (message: string, ...args: any[]): void => {
        if (process.env.DEBUG === 'true') {
            console.log(colorize('🔍', 'dim'), colorize(message, 'dim'), ...args);
        }
    },

    /**
     * Display a progress indicator for seeding operations
     */
    progress: (current: number, total: number, entity: string): void => {
        const percentage = ((current / total) * 100).toFixed(1);
        const barLength = 30;
        const filled = Math.round((current / total) * barLength);
        const empty = barLength - filled;
        const bar = colorize('█'.repeat(filled), 'cyan') + colorize('░'.repeat(empty), 'dim');

        process.stdout.write(
            `\r${colorize('⏳', 'cyan')} Seeding ${entity}: [${bar}] ${current}/${total} (${percentage}%)`
        );

        if (current === total) {
            console.log(); // New line when done
        }
    },

    /**
     * Log a step in the seeding process
     */
    step: (stepNumber: number, description: string): void => {
        console.log(
            colorize(`[Step ${stepNumber}]`, 'magenta'),
            colorize(description, 'bright')
        );
    },

    /**
     * Log the start of a seeding phase
     */
    phase: (name: string): void => {
        console.log();
        console.log(colorize('━'.repeat(50), 'cyan'));
        console.log(colorize(`  🌱 ${name}`, 'bright'));
        console.log(colorize('━'.repeat(50), 'cyan'));
    },

    /**
     * Log a summary table
     */
    table: (data: Record<string, number | string>): void => {
        console.log();
        const maxKeyLength = Math.max(...Object.keys(data).map(k => k.length));

        Object.entries(data).forEach(([key, value]) => {
            const paddedKey = key.padEnd(maxKeyLength);
            console.log(
                colorize('  │', 'dim'),
                colorize(paddedKey, 'white'),
                colorize(':', 'dim'),
                colorize(String(value), 'cyan')
            );
        });
        console.log();
    },

    /**
     * Log a boxed header
     */
    header: (title: string): void => {
        const width = 60;
        const padding = Math.floor((width - title.length - 2) / 2);
        const line = '═'.repeat(width);

        console.log();
        console.log(colorize(`╔${line}╗`, 'green'));
        console.log(
            colorize('║', 'green'),
            ' '.repeat(padding),
            colorize(title, 'bright'),
            ' '.repeat(width - padding - title.length),
            colorize('║', 'green')
        );
        console.log(colorize(`╚${line}╝`, 'green'));
        console.log();
    },

    /**
     * Log completion with timing
     */
    complete: (entityName: string, count: number, durationMs: number): void => {
        const duration = (durationMs / 1000).toFixed(2);
        console.log(
            colorize('✅', 'green'),
            `Seeded ${colorize(count.toString(), 'cyan')} ${entityName} in ${colorize(duration + 's', 'yellow')}`
        );
    },

    /**
     * Log a divider
     */
    divider: (): void => {
        console.log(colorize('─'.repeat(50), 'dim'));
    },

    /**
     * Create a spinner for long operations
     */
    spinner: (message: string) => {
        const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let i = 0;

        const interval = setInterval(() => {
            process.stdout.write(`\r${colorize(frames[i], 'cyan')} ${message}`);
            i = (i + 1) % frames.length;
        }, 80);

        return {
            stop: (finalMessage?: string) => {
                clearInterval(interval);
                if (finalMessage) {
                    process.stdout.write(`\r${colorize('✓', 'green')} ${finalMessage}\n`);
                } else {
                    process.stdout.write('\r');
                }
            },
        };
    },

    /**
     * Log memory usage
     */
    memory: (): void => {
        const used = process.memoryUsage();
        const heapUsed = Math.round(used.heapUsed / 1024 / 1024);
        const heapTotal = Math.round(used.heapTotal / 1024 / 1024);
        console.log(
            colorize('📊', 'dim'),
            colorize(`Memory: ${heapUsed}MB / ${heapTotal}MB`, 'dim')
        );
    },
};

/**
 * Format a duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
}

/**
 * Create a timer for measuring operations
 */
export function createTimer() {
    const start = Date.now();
    return {
        elapsed: () => Date.now() - start,
        format: () => formatDuration(Date.now() - start),
    };
}
