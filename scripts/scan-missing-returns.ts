#!/usr/bin/env ts-node

/**
 * Comprehensive Controller Scan Script
 * Finds all missing return statements after response helpers
 * 
 * Usage: npx ts-node scripts/scan-missing-returns.ts
 */

import fs from 'fs';
import path from 'path';

interface MissingReturn {
    file: string;
    lineNumber: number;
    helperCall: string;
    nextLine: string;
    context: string[];
}

const RESPONSE_HELPERS = [
    'sendError',
    'sendValidationError',
    'sendSuccess',
    'sendCreated',
    'sendPaginated',
    'sendNoContent',
];

const issues: MissingReturn[] = [];

/**
 * Check if a line contains a response helper call
 */
function containsResponseHelper(line: string): string | null {
    for (const helper of RESPONSE_HELPERS) {
        if (line.includes(`${helper}(`)) {
            return helper;
        }
    }
    return null;
}

/**
 * Check if next line is a return statement or closing brace
 */
function hasReturnOrClosingBrace(line: string): boolean {
    const trimmed = line.trim();
    return (
        trimmed.startsWith('return') ||
        trimmed === '}' ||
        trimmed === '});' ||
        trimmed === ''
    );
}

/**
 * Scan a single file for missing returns
 */
function scanFile(filePath: string): void {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length - 1; i++) {
        const currentLine = lines[i];
        const nextLine = lines[i + 1] || '';

        const helper = containsResponseHelper(currentLine);

        if (helper && !hasReturnOrClosingBrace(nextLine)) {
            // Get context (2 lines before and after)
            const context = [
                lines[i - 2] || '',
                lines[i - 1] || '',
                currentLine,
                nextLine,
                lines[i + 2] || '',
            ];

            issues.push({
                file: path.relative(process.cwd(), filePath),
                lineNumber: i + 1,
                helperCall: helper,
                nextLine: nextLine.trim(),
                context,
            });
        }
    }
}

/**
 * Get all controller files recursively
 */
function getControllerFiles(dir: string): string[] {
    const files: string[] = [];

    function scan(currentDir: string) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
                scan(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.controller.ts')) {
                files.push(fullPath);
            }
        }
    }

    scan(dir);
    return files;
}

/**
 * Main execution
 */
async function main() {
    console.log('🔍 Scanning all controller files for missing returns...\n');

    const controllersDir = path.join(process.cwd(), 'server/src/presentation/http/controllers');
    const controllerFiles = getControllerFiles(controllersDir);

    console.log(`Found ${controllerFiles.length} controller files\n`);

    // Scan all files
    controllerFiles.forEach(scanFile);

    // Generate report
    console.log('📊 Scan Results:\n');
    console.log(`Total files scanned: ${controllerFiles.length}`);
    console.log(`Missing returns found: ${issues.length}\n`);

    if (issues.length === 0) {
        console.log('✅ No missing returns found! All controllers are clean.\n');
        return;
    }

    // Group by file
    const byFile = issues.reduce((acc, issue) => {
        if (!acc[issue.file]) {
            acc[issue.file] = [];
        }
        acc[issue.file].push(issue);
        return acc;
    }, {} as Record<string, MissingReturn[]>);

    console.log('Files with missing returns:\n');
    Object.entries(byFile).forEach(([file, fileIssues]) => {
        console.log(`  ${file}: ${fileIssues.length} issue(s)`);
    });

    // Save detailed report
    const report = {
        scannedAt: new Date().toISOString(),
        totalFiles: controllerFiles.length,
        totalIssues: issues.length,
        issuesByFile: byFile,
        allIssues: issues,
    };

    fs.writeFileSync(
        'missing-returns-report.json',
        JSON.stringify(report, null, 2)
    );

    console.log('\n📄 Detailed report saved to: missing-returns-report.json');
    console.log('\nRun: npx ts-node scripts/fix-missing-returns.ts to auto-fix\n');
}

main().catch(console.error);
