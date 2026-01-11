#!/usr/bin/env ts-node

/**
 * Automated Fix Script for Missing Returns
 * Reads scan report and adds return statements
 * 
 * Usage: npx ts-node scripts/fix-missing-returns.ts
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

interface Report {
    scannedAt: string;
    totalFiles: number;
    totalIssues: number;
    issuesByFile: Record<string, MissingReturn[]>;
    allIssues: MissingReturn[];
}

/**
 * Fix a single file
 */
function fixFile(filePath: string, issues: MissingReturn[]): number {
    const fullPath = path.join(process.cwd(), filePath);
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');

    let fixCount = 0;

    // Sort issues by line number (descending) to avoid line number shifts
    const sortedIssues = issues.sort((a, b) => b.lineNumber - a.lineNumber);

    sortedIssues.forEach(issue => {
        const lineIndex = issue.lineNumber - 1;
        const currentLine = lines[lineIndex];

        // Double-check this line still has the helper call
        if (currentLine.includes(issue.helperCall)) {
            // Get indentation from current line
            const indent = currentLine.match(/^(\s*)/)?.[1] || '';

            // Insert return statement after current line
            lines.splice(lineIndex + 1, 0, `${indent}return;`);
            fixCount++;
        }
    });

    // Write back to file
    fs.writeFileSync(fullPath, lines.join('\n'), 'utf8');

    return fixCount;
}

/**
 * Main execution
 */
async function main() {
    console.log('🔧 Auto-fixing missing return statements...\n');

    // Check if report exists
    if (!fs.existsSync('missing-returns-report.json')) {
        console.error('❌ Error: missing-returns-report.json not found');
        console.error('Run: npx ts-node scripts/scan-missing-returns.ts first\n');
        process.exit(1);
    }

    // Load report
    const report: Report = JSON.parse(
        fs.readFileSync('missing-returns-report.json', 'utf8')
    );

    if (report.totalIssues === 0) {
        console.log('✅ No issues to fix!\n');
        return;
    }

    console.log(`Found ${report.totalIssues} issues in ${Object.keys(report.issuesByFile).length} files\n`);

    // Create backup
    const backupDir = 'backups/missing-returns-fix';
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    let totalFixed = 0;

    // Fix each file
    Object.entries(report.issuesByFile).forEach(([file, issues]) => {
        console.log(`Fixing: ${file} (${issues.length} issue(s))`);

        // Create backup
        const fullPath = path.join(process.cwd(), file);
        const backupPath = path.join(backupDir, path.basename(file));
        fs.copyFileSync(fullPath, backupPath);

        // Fix file
        const fixed = fixFile(file, issues);
        totalFixed += fixed;

        console.log(`  ✅ Fixed ${fixed} issue(s)`);
    });

    console.log(`\n📊 Summary:`);
    console.log(`  Total issues fixed: ${totalFixed}`);
    console.log(`  Files modified: ${Object.keys(report.issuesByFile).length}`);
    console.log(`  Backups saved to: ${backupDir}`);

    console.log('\n✅ All fixes applied!');
    console.log('\nNext steps:');
    console.log('  1. Review changes: git diff');
    console.log('  2. Run tests: npm test');
    console.log('  3. Commit: git add . && git commit -m "fix: add missing return statements"');
    console.log('');
}

main().catch(console.error);
