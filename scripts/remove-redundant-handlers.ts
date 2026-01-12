#!/usr/bin/env tsx

/**
 * Remove Redundant Error Handlers Script
 * Deletes handleControllerError from auth and recovery controllers
 * 
 * Usage: npx tsx scripts/remove-redundant-handlers.ts
 */

import fs from 'fs';
import path from 'path';

interface FileChange {
    file: string;
    linesRemoved: number;
    catchBlocksUpdated: number;
}

const changes: FileChange[] = [];

/**
 * Remove handleControllerError function and update catch blocks
 */
function processFile(filePath: string): FileChange {
    const fullPath = path.join(process.cwd(), filePath);
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');

    let linesRemoved = 0;
    let catchBlocksUpdated = 0;

    // Find and remove handleControllerError function
    let inHandlerFunction = false;
    let handlerStartLine = -1;
    let handlerEndLine = -1;
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Start of handleControllerError function
        if (line.includes('const handleControllerError = (')) {
            inHandlerFunction = true;
            handlerStartLine = i;
            braceCount = 0;
        }

        if (inHandlerFunction) {
            // Count braces to find end of function
            braceCount += (line.match(/\{/g) || []).length;
            braceCount -= (line.match(/\}/g) || []).length;

            if (braceCount === 0 && line.includes('}')) {
                handlerEndLine = i;
                break;
            }
        }
    }

    // Remove the function
    if (handlerStartLine >= 0 && handlerEndLine >= 0) {
        linesRemoved = handlerEndLine - handlerStartLine + 1;
        lines.splice(handlerStartLine, linesRemoved);
    }

    // Update catch blocks - replace handleControllerError calls
    const updatedLines = lines.map(line => {
        if (line.includes('handleControllerError(error, res, next,')) {
            catchBlocksUpdated++;
            const indent = line.match(/^(\s*)/)?.[1] || '';
            const operationMatch = line.match(/'([^']+)'\)/);
            const operation = operationMatch ? operationMatch[1] : 'operation';

            return `${indent}logger.error('${operation} error:', error);\n${indent}next(error);`;
        }
        return line;
    });

    // Write back
    fs.writeFileSync(fullPath, updatedLines.join('\n'), 'utf8');

    return {
        file: filePath,
        linesRemoved,
        catchBlocksUpdated,
    };
}

/**
 * Main execution
 */
async function main() {
    console.log('🗑️  Removing redundant error handlers...\n');

    const files = [
        'server/src/presentation/http/controllers/auth/auth.controller.ts',
        'server/src/presentation/http/controllers/auth/recovery.controller.ts',
    ];

    // Create backup
    const backupDir = 'backups/redundant-handlers';
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    files.forEach(file => {
        const fullPath = path.join(process.cwd(), file);

        if (!fs.existsSync(fullPath)) {
            console.log(`⚠️  File not found: ${file}`);
            return;
        }

        // Backup
        const backupPath = path.join(backupDir, path.basename(file));
        fs.copyFileSync(fullPath, backupPath);
        console.log(`📦 Backed up: ${file}`);

        // Process
        const change = processFile(file);
        changes.push(change);

        console.log(`✅ Processed: ${file}`);
        console.log(`   Lines removed: ${change.linesRemoved}`);
        console.log(`   Catch blocks updated: ${change.catchBlocksUpdated}\n`);
    });

    const totalLinesRemoved = changes.reduce((sum, c) => sum + c.linesRemoved, 0);
    const totalCatchBlocks = changes.reduce((sum, c) => sum + c.catchBlocksUpdated, 0);

    console.log('📊 Summary:');
    console.log(`  Files processed: ${changes.length}`);
    console.log(`  Total lines removed: ${totalLinesRemoved}`);
    console.log(`  Total catch blocks updated: ${totalCatchBlocks}`);
    console.log(`  Backups saved to: ${backupDir}`);

    console.log('\n✅ Redundant handlers removed!');
    console.log('\nNext steps:');
    console.log('  1. Review changes: git diff');
    console.log('  2. Run tests: npm test');
    console.log('  3. Commit: git add . && git commit -m "refactor: remove redundant error handlers"');
    console.log('');
}

main().catch(console.error);
