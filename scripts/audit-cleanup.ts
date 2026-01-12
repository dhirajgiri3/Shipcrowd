#!/usr/bin/env tsx

/**
 * Codebase Cleanup Audit Script
 * 
 * Identifies:
 * - Duplicate files (same content)
 * - Unused files (no imports)
 * - Backup/temp files
 * - Empty or placeholder files
 * - Legacy/deprecated files
 * - Orphaned test files
 * 
 * Usage: npx tsx scripts/audit-cleanup.ts
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface FileInfo {
    path: string;
    relativePath: string;
    size: number;
    hash: string;
    isEmpty: boolean;
    isBackup: boolean;
    isTest: boolean;
    imports: string[];
}

interface CleanupReport {
    duplicates: Map<string, string[]>;
    unused: string[];
    backups: string[];
    empty: string[];
    legacy: string[];
    orphanedTests: string[];
    totalFilesScanned: number;
}

const report: CleanupReport = {
    duplicates: new Map(),
    unused: [],
    backups: [],
    empty: [],
    legacy: [],
    orphanedTests: [],
    totalFilesScanned: 0,
};

/**
 * Calculate file hash for duplicate detection
 */
function calculateHash(filePath: string): string {
    const content = fs.readFileSync(filePath, 'utf8');
    return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Check if file is a backup/temp file
 */
function isBackupFile(filename: string): boolean {
    const backupPatterns = [
        /\.backup$/,
        /\.bak$/,
        /\.old$/,
        /\.orig$/,
        /~$/,
        /\.copy$/,
        /\.tmp$/,
        /copy\d*/i,
        /backup/i,
        /-old/i,
        /-copy/i,
    ];

    return backupPatterns.some(pattern => pattern.test(filename));
}

/**
 * Check if file appears to be legacy/deprecated
 */
function isLegacyFile(filePath: string, content: string): boolean {
    const legacyIndicators = [
        /\/\/\s*@deprecated/i,
        /\/\/\s*TODO:\s*remove/i,
        /\/\/\s*LEGACY/i,
        /\/\*\*\s*@deprecated/i,
        /\/\/\s*Old implementation/i,
    ];

    return legacyIndicators.some(pattern => pattern.test(content));
}

/**
 * Check if file is empty or placeholder
 */
function isEmptyOrPlaceholder(filePath: string, content: string): boolean {
    const lines = content.split('\n').filter(line => {
        const trimmed = line.trim();
        // Ignore comments and empty lines
        return trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*');
    });

    // Less than 5 lines of actual code
    if (lines.length < 5) return true;

    // Check for placeholder patterns
    const placeholderPatterns = [
        /TODO:\s*implement/i,
        /placeholder/i,
        /coming soon/i,
        /not implemented/i,
    ];

    return placeholderPatterns.some(pattern => pattern.test(content));
}

/**
 * Extract imports from TypeScript file
 */
function extractImports(content: string): string[] {
    const importRegex = /import\s+(?:{[^}]*}|[\w*]+)\s+from\s+['"]([^'"]+)['"]/g;
    const imports: string[] = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
    }

    return imports;
}

/**
 * Get all TypeScript files recursively
 */
function getTypeScriptFiles(dir: string, baseDir: string): FileInfo[] {
    const files: FileInfo[] = [];

    function scan(currentDir: string) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);

            // Skip node_modules, .git, dist, etc.
            if (entry.name === 'node_modules' ||
                entry.name === '.git' ||
                entry.name === 'dist' ||
                entry.name === 'build' ||
                entry.name === '.next') {
                continue;
            }

            if (entry.isDirectory()) {
                scan(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.ts')) {
                const content = fs.readFileSync(fullPath, 'utf8');
                const stats = fs.statSync(fullPath);

                files.push({
                    path: fullPath,
                    relativePath: path.relative(baseDir, fullPath),
                    size: stats.size,
                    hash: calculateHash(fullPath),
                    isEmpty: isEmptyOrPlaceholder(fullPath, content),
                    isBackup: isBackupFile(entry.name),
                    isTest: entry.name.includes('.test.') || entry.name.includes('.spec.'),
                    imports: extractImports(content),
                });
            }
        }
    }

    scan(dir);
    return files;
}

/**
 * Find duplicate files
 */
function findDuplicates(files: FileInfo[]): Map<string, string[]> {
    const hashMap = new Map<string, string[]>();

    for (const file of files) {
        if (file.size < 100) continue; // Skip very small files

        const existing = hashMap.get(file.hash) || [];
        existing.push(file.relativePath);
        hashMap.set(file.hash, existing);
    }

    // Filter to only duplicates
    const duplicates = new Map<string, string[]>();
    for (const [hash, paths] of hashMap.entries()) {
        if (paths.length > 1) {
            duplicates.set(hash, paths);
        }
    }

    return duplicates;
}

/**
 * Find unused files (not imported anywhere)
 */
function findUnused(files: FileInfo[]): string[] {
    const unused: string[] = [];
    const allImports = new Set<string>();

    // Collect all imports
    for (const file of files) {
        for (const imp of file.imports) {
            // Resolve relative imports
            if (imp.startsWith('.')) {
                const dir = path.dirname(file.path);
                const resolved = path.resolve(dir, imp);
                allImports.add(resolved);
            }
        }
    }

    // Check each file
    for (const file of files) {
        // Skip test files, index files
        if (file.isTest || file.relativePath.includes('index.ts')) {
            continue;
        }

        // Check if file is imported
        const filePathWithoutExt = file.path.replace(/\.ts$/, '');
        const isImported = Array.from(allImports).some(imp =>
            imp === filePathWithoutExt ||
            imp === file.path
        );

        if (!isImported) {
            unused.push(file.relativePath);
        }
    }

    return unused;
}

/**
 * Main execution
 */
async function main() {
    console.log('🔍 Starting codebase cleanup audit...\n');

    const serverDir = path.join(process.cwd(), 'server/src');
    const files = getTypeScriptFiles(serverDir, serverDir);

    report.totalFilesScanned = files.length;

    console.log(`📊 Scanned ${files.length} TypeScript files\n`);

    // Find duplicates
    console.log('🔎 Finding duplicate files...');
    report.duplicates = findDuplicates(files);
    console.log(`   Found ${report.duplicates.size} sets of duplicates\n`);

    // Find backup files
    console.log('🔎 Finding backup files...');
    report.backups = files.filter(f => f.isBackup).map(f => f.relativePath);
    console.log(`   Found ${report.backups.length} backup files\n`);

    // Find empty/placeholder files
    console.log('🔎 Finding empty/placeholder files...');
    report.empty = files.filter(f => f.isEmpty).map(f => f.relativePath);
    console.log(`   Found ${report.empty.length} empty files\n`);

    // Find unused files (simplified - may have false positives)
    console.log('🔎 Finding potentially unused files...');
    report.unused = findUnused(files);
    console.log(`   Found ${report.unused.length} potentially unused files\n`);

    // Generate report
    console.log('📋 CLEANUP REPORT:\n');
    console.log('='.repeat(80));

    if (report.duplicates.size > 0) {
        console.log('\n🔴 DUPLICATE FILES (same content):');
        let dupIndex = 1;
        for (const [hash, paths] of report.duplicates) {
            console.log(`\n  Set ${dupIndex}:`);
            paths.forEach(p => console.log(`    - ${p}`));
            dupIndex++;
        }
    }

    if (report.backups.length > 0) {
        console.log('\n🟡 BACKUP FILES (should be removed):');
        report.backups.forEach(f => console.log(`  - ${f}`));
    }

    if (report.empty.length > 0) {
        console.log('\n🟡 EMPTY/PLACEHOLDER FILES:');
        report.empty.slice(0, 20).forEach(f => console.log(`  - ${f}`));
        if (report.empty.length > 20) {
            console.log(`  ... and ${report.empty.length - 20} more`);
        }
    }

    if (report.unused.length > 0) {
        console.log('\n🟠 POTENTIALLY UNUSED FILES (verify manually):');
        report.unused.slice(0, 15).forEach(f => console.log(`  - ${f}`));
        if (report.unused.length > 15) {
            console.log(`  ... and ${report.unused.length - 15} more`);
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n💡 RECOMMENDATIONS:\n');
    console.log('  1. Delete backup files immediately (safe)');
    console.log('  2. Review and delete duplicate files (keep one)');
    console.log('  3. Complete or remove placeholder files');
    console.log('  4. Manually verify "unused" files before deletion');
    console.log('\n📄 Detailed report saved to: cleanup-audit.json\n');

    // Save detailed report
    fs.writeFileSync(
        'cleanup-audit.json',
        JSON.stringify({
            summary: {
                totalFiles: report.totalFilesScanned,
                duplicates: report.duplicates.size,
                backups: report.backups.length,
                empty: report.empty.length,
                unused: report.unused.length,
            },
            duplicates: Array.from(report.duplicates.entries()).map(([hash, paths]) => ({
                hash,
                files: paths,
            })),
            backups: report.backups,
            empty: report.empty,
            unused: report.unused,
        }, null, 2)
    );
}

main().catch(console.error);
