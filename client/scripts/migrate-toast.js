#!/usr/bin/env node

/**
 * Toast Centralization Migration Script
 * 
 * This script automatically migrates direct `sonner` toast imports to centralized error handling utilities.
 * 
 * Usage: node migrate-toast.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CLIENT_DIR = path.join(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// Files to exclude (core utilities that should keep sonner)
const EXCLUDE_FILES = [
    'src/components/ui/feedback/Toast.tsx',
    'src/lib/error-handler.ts',
    'src/components/ui/feedback/Toaster.tsx',
];

// Statistics
const stats = {
    filesProcessed: 0,
    filesModified: 0,
    importsReplaced: 0,
    toastCallsReplaced: 0,
    errors: [],
};

/**
 * Find all files with sonner imports
 */
function findFilesWithSonner() {
    try {
        const result = execSync(
            `grep -rl "import { toast } from 'sonner'" --include="*.tsx" --include="*.ts" .`,
            { cwd: CLIENT_DIR, encoding: 'utf-8' }
        );

        return result
            .trim()
            .split('\n')
            .filter(file => file && !EXCLUDE_FILES.some(excluded => file.includes(excluded)))
            .map(file => path.join(CLIENT_DIR, file));
    } catch (error) {
        // grep returns non-zero if no matches found
        return [];
    }
}

/**
 * Analyze file to determine which utilities are needed
 */
function analyzeToastUsage(content) {
    const utilities = new Set();

    if (content.includes('toast.success(')) utilities.add('showSuccessToast');
    if (content.includes('toast.error(')) utilities.add('handleApiError');
    if (content.includes('toast.info(')) utilities.add('showInfoToast');
    if (content.includes('toast.warning(')) utilities.add('showWarningToast');
    if (content.includes('toast.loading(')) utilities.add('showLoadingToast');
    if (content.includes('toast.dismiss(')) utilities.add('dismissToast');

    return Array.from(utilities);
}

/**
 * Replace import statement
 */
function replaceImport(content, utilities) {
    const importStatement = `import { ${utilities.join(', ')} } from '@/src/lib/error-handler';`;

    // Replace the sonner import
    const replaced = content.replace(
        /import\s+{\s*toast\s*}\s+from\s+['"]sonner['"];?\s*\n/g,
        importStatement + '\n'
    );

    return replaced;
}

/**
 * Replace toast calls with centralized utilities
 */
function replaceToastCalls(content) {
    let modified = content;
    let replacements = 0;

    // Pattern 1: toast.success(message) -> showSuccessToast(message)
    const successPattern = /toast\.success\(/g;
    const successMatches = modified.match(successPattern);
    if (successMatches) {
        modified = modified.replace(successPattern, 'showSuccessToast(');
        replacements += successMatches.length;
    }

    // Pattern 2: toast.info(message) -> showInfoToast(message)
    const infoPattern = /toast\.info\(/g;
    const infoMatches = modified.match(infoPattern);
    if (infoMatches) {
        modified = modified.replace(infoPattern, 'showInfoToast(');
        replacements += infoMatches.length;
    }

    // Pattern 3: toast.warning(message) -> showWarningToast(message)
    const warningPattern = /toast\.warning\(/g;
    const warningMatches = modified.match(warningPattern);
    if (warningMatches) {
        modified = modified.replace(warningPattern, 'showWarningToast(');
        replacements += warningMatches.length;
    }

    // Pattern 4: toast.loading(message) -> showLoadingToast(message)
    const loadingPattern = /toast\.loading\(/g;
    const loadingMatches = modified.match(loadingPattern);
    if (loadingMatches) {
        modified = modified.replace(loadingPattern, 'showLoadingToast(');
        replacements += loadingMatches.length;
    }

    // Pattern 5: toast.dismiss(...) -> dismissToast(...)
    const dismissPattern = /toast\.dismiss\(/g;
    const dismissMatches = modified.match(dismissPattern);
    if (dismissMatches) {
        modified = modified.replace(dismissPattern, 'dismissToast(');
        replacements += dismissMatches.length;
    }

    // Pattern 6: toast.error(...) - Special handling
    // Only replace if NOT in a validation context (where Alert component shows it)
    const errorPattern = /toast\.error\([^)]+\);?\s*\n/g;
    const errorMatches = modified.match(errorPattern);
    if (errorMatches) {
        errorMatches.forEach(match => {
            // Check if this is in a validation block (has setError nearby)
            const lines = modified.split('\n');
            const matchIndex = modified.indexOf(match);
            const linesBefore = modified.substring(Math.max(0, matchIndex - 200), matchIndex);

            // If there's a setError call right before, this is redundant - remove it
            if (linesBefore.includes('setError(message)') || linesBefore.includes('setError(errorMessage)') || linesBefore.includes('setLocalError(')) {
                modified = modified.replace(match, '');
                replacements++;
            } else {
                // Otherwise, it's a standalone error - keep it but don't convert to handleApiError
                // (handleApiError is for API errors specifically)
                // Just leave toast.error as is for now - manual review needed
            }
        });
    }

    return { content: modified, replacements };
}

/**
 * Process a single file
 */
function processFile(filePath) {
    stats.filesProcessed++;

    try {
        const relativePath = path.relative(CLIENT_DIR, filePath);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Check if file actually has sonner import
        if (!content.includes("import { toast } from 'sonner'")) {
            if (VERBOSE) console.log(`⏭️  Skipping ${relativePath} (no sonner import)`);
            return;
        }

        // Analyze what utilities are needed
        const utilities = analyzeToastUsage(content);

        if (utilities.length === 0) {
            console.log(`⚠️  ${relativePath}: Has sonner import but no toast calls found`);
            return;
        }

        // Replace import
        let modified = replaceImport(content, utilities);
        stats.importsReplaced++;

        // Replace toast calls
        const result = replaceToastCalls(modified);
        modified = result.content;
        stats.toastCallsReplaced += result.replacements;

        // Check if anything changed
        if (modified === content) {
            if (VERBOSE) console.log(`⏭️  ${relativePath}: No changes needed`);
            return;
        }

        // Write changes
        if (!DRY_RUN) {
            fs.writeFileSync(filePath, modified, 'utf-8');
            stats.filesModified++;
            console.log(`✅ ${relativePath}: Modified (${result.replacements} toast calls replaced)`);
        } else {
            console.log(`🔍 [DRY RUN] ${relativePath}: Would modify (${result.replacements} toast calls)`);
        }

    } catch (error) {
        stats.errors.push({ file: filePath, error: error.message });
        console.error(`❌ Error processing ${filePath}:`, error.message);
    }
}

/**
 * Main execution
 */
function main() {
    console.log('🚀 Toast Centralization Migration Script\n');

    if (DRY_RUN) {
        console.log('📋 Running in DRY RUN mode - no files will be modified\n');
    }

    // Find all files
    console.log('🔍 Searching for files with sonner imports...\n');
    const files = findFilesWithSonner();

    if (files.length === 0) {
        console.log('✨ No files found with sonner imports (or all already migrated)');
        return;
    }

    console.log(`📁 Found ${files.length} files to process\n`);

    // Process each file
    files.forEach(processFile);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary');
    console.log('='.repeat(60));
    console.log(`Files processed:     ${stats.filesProcessed}`);
    console.log(`Files modified:      ${stats.filesModified}`);
    console.log(`Imports replaced:    ${stats.importsReplaced}`);
    console.log(`Toast calls replaced: ${stats.toastCallsReplaced}`);

    if (stats.errors.length > 0) {
        console.log(`\n❌ Errors encountered: ${stats.errors.length}`);
        stats.errors.forEach(({ file, error }) => {
            console.log(`  - ${path.relative(CLIENT_DIR, file)}: ${error}`);
        });
    }

    if (!DRY_RUN && stats.filesModified > 0) {
        console.log('\n✅ Migration complete! Please review the changes and run tests.');
        console.log('💡 Tip: Run `npm exec tsc --noEmit` to check for type errors');
    }
}

// Run the script
main();
