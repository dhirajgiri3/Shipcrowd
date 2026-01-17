#!/usr/bin/env node

/**
 * Migration Script: Update Component Imports
 * 
 * Updates component imports after reorganization
 * 
 * Usage: 
 *   node scripts/migrate-components-imports.js --dry-run  (preview changes)
 *   node scripts/migrate-components-imports.js             (apply changes)
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Check for dry-run mode
const isDryRun = process.argv.includes('--dry-run');

// Mapping of component paths to their new locations
const COMPONENT_PATH_MAP = {
    '@/src/components/ErrorBoundary': '@/src/components/shared/ErrorBoundary',
    '@/src/components/kyc': '@/src/components/features/kyc',
    '@/src/components/charts': '@/src/components/features/charts',
    '@/src/components/animations': '@/src/components/features/animations',
};

// Find all TypeScript/TSX files
const clientDir = path.join(__dirname, '..');
const files = glob.sync('**/*.{ts,tsx}', {
    cwd: clientDir,
    ignore: ['node_modules/**', '.next/**', 'dist/**', 'build/**', 'scripts/**', 'src/components/**'],
    absolute: true,
});

let totalUpdates = 0;
let filesModified = 0;

if (isDryRun) {
    console.log(`🔍 DRY RUN MODE - No files will be modified\n`);
}
console.log(`🔍 Found ${files.length} files to process...\n`);

files.forEach((filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let fileUpdates = 0;

    // Process each component path mapping
    Object.entries(COMPONENT_PATH_MAP).forEach(([oldPath, newPath]) => {
        // Match imports like: from '@/src/components/ErrorBoundary'
        // Also match with file extensions: from '@/src/components/kyc/KYCForm'
        const importRegex = new RegExp(
            `from ['"]${oldPath.replace(/\//g, '\\/')}(\\/[^'"]*)?['"]`,
            'g'
        );

        // Match dynamic imports
        const dynamicImportRegex = new RegExp(
            `import\\(['"]${oldPath.replace(/\//g, '\\/')}(\\/[^'"]*)?['"]\\)`,
            'g'
        );

        const matches = content.match(importRegex) || [];
        const dynamicMatches = content.match(dynamicImportRegex) || [];

        if (matches.length > 0 || dynamicMatches.length > 0) {
            // Replace static imports
            content = content.replace(
                importRegex,
                (match, subPath) => `from '${newPath}${subPath || ''}'`
            );

            // Replace dynamic imports
            content = content.replace(
                dynamicImportRegex,
                (match, subPath) => `import('${newPath}${subPath || ''}')`
            );

            const totalMatches = matches.length + dynamicMatches.length;
            fileUpdates += totalMatches;
            modified = true;
        }
    });

    if (modified) {
        if (!isDryRun) {
            fs.writeFileSync(filePath, content, 'utf8');
        }
        filesModified++;
        totalUpdates += fileUpdates;

        const relativePath = path.relative(clientDir, filePath);
        const icon = isDryRun ? '📋' : '✅';
        console.log(`${icon} ${relativePath} (${fileUpdates} update${fileUpdates > 1 ? 's' : ''})`);
    }
});

console.log(`\n✨ ${isDryRun ? 'Dry run complete!' : 'Migration complete!'}`);
console.log(`📊 Summary:`);
console.log(`   - Files ${isDryRun ? 'to be modified' : 'modified'}: ${filesModified}`);
console.log(`   - Total imports ${isDryRun ? 'to be updated' : 'updated'}: ${totalUpdates}`);
if (isDryRun) {
    console.log(`\n🔍 To apply these changes, run:`);
    console.log(`   node scripts/migrate-components-imports.js`);
} else {
    console.log(`\n🔍 Next steps:`);
    console.log(`   1. Run: npm run type-check`);
    console.log(`   2. Verify no TypeScript errors`);
    console.log(`   3. Test the application`);
}
