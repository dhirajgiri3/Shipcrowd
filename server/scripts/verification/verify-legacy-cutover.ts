import fs from 'fs';
import path from 'path';

type Match = {
    file: string;
    line: number;
    pattern: string;
};

const SERVER_ROOT = path.resolve(__dirname, '..', '..');

const REMOVED_FILES = [
    'src/presentation/http/controllers/shipping/ratecard.controller.ts',
    'src/presentation/http/routes/v1/shipping/ratecard.routes.ts',
    'src/core/application/services/pricing/pricing-orchestrator.service.ts',
    'src/core/application/services/pricing/dynamic-pricing.service.ts',
    'src/core/application/services/pricing/rate-card-selector.service.ts',
    'src/core/application/services/pricing/smart-rate-calculator.service.ts',
    'src/core/application/services/pricing/rate-card-simulation.service.ts',
];

const BANNED_PATTERNS: Array<{ label: string; regex: RegExp }> = [
    { label: 'legacy pricing orchestrator import', regex: /pricing-orchestrator\.service/ },
    { label: 'legacy dynamic pricing import', regex: /dynamic-pricing\.service/ },
    { label: 'legacy rate-card selector import', regex: /rate-card-selector\.service/ },
    { label: 'legacy smart calculator import', regex: /smart-rate-calculator\.service/ },
    { label: 'legacy rate-card simulation import', regex: /rate-card-simulation\.service/ },
    { label: 'legacy shipping ratecard controller import', regex: /controllers\/shipping\/ratecard\.controller/ },
    { label: 'legacy shipping ratecard routes import', regex: /routes\/v1\/shipping\/ratecard\.routes/ },
    { label: 'legacy service-level feature flag usage', regex: /enable_service_level_pricing/ },
    { label: 'legacy order route helper normalizeLegacyRateRequestBody', regex: /normalizeLegacyRateRequestBody/ },
    { label: 'legacy order route helper toLegacyRateRows', regex: /toLegacyRateRows/ },
];

const SCAN_ROOTS = ['src', 'tests'];

function walkFiles(dir: string, acc: string[] = []): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkFiles(fullPath, acc);
            continue;
        }
        if (entry.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx'))) {
            acc.push(fullPath);
        }
    }
    return acc;
}

function findMatches(filePath: string, regex: RegExp): number[] {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    const matches: number[] = [];
    for (let i = 0; i < lines.length; i += 1) {
        if (regex.test(lines[i])) {
            matches.push(i + 1);
        }
    }
    return matches;
}

function toRelative(filePath: string): string {
    return path.relative(SERVER_ROOT, filePath).split(path.sep).join('/');
}

function verifyOrderRouteContract(errors: string[]): void {
    const orderRoutePath = path.join(
        SERVER_ROOT,
        'src/presentation/http/routes/v1/shipping/order.routes.ts'
    );

    if (!fs.existsSync(orderRoutePath)) {
        errors.push('Missing order routes file: src/presentation/http/routes/v1/shipping/order.routes.ts');
        return;
    }

    const orderRouteSource = fs.readFileSync(orderRoutePath, 'utf8');

    const requiredTokens = [
        'sessionId is required when booking shipment from quote session',
        'optionId is required when booking shipment from quote session',
    ];

    for (const token of requiredTokens) {
        if (!orderRouteSource.includes(token)) {
            errors.push(`Order booking contract token missing: "${token}"`);
        }
    }
}

function main(): void {
    const errors: string[] = [];
    const matches: Match[] = [];

    console.log('🔍 Verifying service-level shipping cutover and legacy detachment...');

    for (const file of REMOVED_FILES) {
        const absolute = path.join(SERVER_ROOT, file);
        if (fs.existsSync(absolute)) {
            errors.push(`Legacy file still present: ${file}`);
        }
    }

    for (const root of SCAN_ROOTS) {
        const absoluteRoot = path.join(SERVER_ROOT, root);
        if (!fs.existsSync(absoluteRoot)) {
            continue;
        }
        const files = walkFiles(absoluteRoot);
        for (const filePath of files) {
            for (const { label, regex } of BANNED_PATTERNS) {
                const lineMatches = findMatches(filePath, regex);
                for (const line of lineMatches) {
                    matches.push({
                        file: toRelative(filePath),
                        line,
                        pattern: label,
                    });
                }
            }
        }
    }

    verifyOrderRouteContract(errors);

    if (matches.length > 0 || errors.length > 0) {
        if (errors.length > 0) {
            console.error('\n❌ Structural failures:');
            for (const error of errors) {
                console.error(` - ${error}`);
            }
        }

        if (matches.length > 0) {
            console.error('\n❌ Banned legacy references found:');
            for (const match of matches) {
                console.error(` - ${match.file}:${match.line} [${match.pattern}]`);
            }
        }

        process.exit(1);
    }

    console.log('✅ Legacy cutover verification passed');
}

main();
