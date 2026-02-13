import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const AUTH_TESTS_DIR = path.join(ROOT, 'tests', 'integration', 'auth');

const SKIP_PATTERN = /\b(?:it|test|describe)\.skip\s*\(/;
const ALLOWLIST: string[] = [];

const walk = (dir: string, acc: string[] = []): string[] => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full, acc);
        } else if (entry.isFile() && full.endsWith('.test.ts')) {
            acc.push(full);
        }
    }
    return acc;
};

const rel = (abs: string): string => path.relative(ROOT, abs).split(path.sep).join('/');

const main = (): void => {
    console.log('🔍 Verifying auth integration tests do not contain skipped tests...');

    if (!fs.existsSync(AUTH_TESTS_DIR)) {
        console.log('ℹ️ Auth integration test directory not found; skipping.');
        return;
    }

    const offenders: Array<{ file: string; line: number; text: string }> = [];
    for (const file of walk(AUTH_TESTS_DIR)) {
        const relative = rel(file);
        if (ALLOWLIST.includes(relative)) continue;

        const lines = fs.readFileSync(file, 'utf8').split('\n');
        lines.forEach((line, i) => {
            if (SKIP_PATTERN.test(line)) {
                offenders.push({ file: relative, line: i + 1, text: line.trim() });
            }
        });
    }

    if (offenders.length > 0) {
        console.error('❌ Found skipped auth integration tests:');
        offenders.forEach((item) => {
            console.error(` - ${item.file}:${item.line} ${item.text}`);
        });
        process.exit(1);
    }

    console.log('✅ Auth integration skip hygiene check passed');
};

main();
