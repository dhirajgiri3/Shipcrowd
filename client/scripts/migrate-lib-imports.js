#!/usr/bin/env node

/**
 * Migration Script: Update Lib Imports
 * 
 * Updates all imports from @/src/lib/[file] to @/src/lib/[domain]
 * 
 * Usage: 
 *   node scripts/migrate-lib-imports.js --dry-run  (preview changes)
 *   node scripts/migrate-lib-imports.js             (apply changes)
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Check for dry-run mode
const isDryRun = process.argv.includes('--dry-run');

// Mapping of lib files to their new purpose-based folders
const LIB_DOMAIN_MAP = {
    'accessibility': 'ui',
    'animations': 'ui',
    'colorConfig': 'ui',
    'design-tokens': 'ui',
    'upload': 'data',
    'dateRangeContext': 'data',
    'error-handler': 'error',
    'performance': 'performance',
};

// Find all TypeScript/TSX/JS files
const clientDir = path.join(__dirname, '..');
const files = glob.sync('**/*.{ts,tsx,js,jsx}', {
    cwd: clientDir,
    ignore: ['node_modules/**', '.next/**', 'dist/**', 'build/**', 'scripts/**', 'src/lib/**'],
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

    // Process each lib file mapping
    Object.entries(LIB_DOMAIN_MAP).forEach(([libFile, domain]) => {
        // Match imports like: from '@/src/lib/accessibility'
        const importRegex = new RegExp(
            `from ['"]@/src/lib/${libFile}['"]`,
            'g'
        );

        // Match dynamic imports like: import('@/src/lib/accessibility')
        const dynamicImportRegex = new RegExp(
            `import\\(['"]@/src/lib/${libFile}['"]\\)`,
            'g'
        );

        const matches = content.match(importRegex) || [];
        const dynamicMatches = content.match(dynamicImportRegex) || [];

        if (matches.length > 0 || dynamicMatches.length > 0) {
            // Replace static imports
            content = content.replace(
                importRegex,
                `from '@/src/lib/${domain}'`
            );

            // Replace dynamic imports
            content = content.replace(
                dynamicImportRegex,
                `import('@/src/lib/${domain}')`
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
    console.log(`   node scripts/migrate-lib-imports.js`);
} else {
    console.log(`\n🔍 Next steps:`);
    console.log(`   1. Run: npm run type-check`);
    console.log(`   2. Verify no TypeScript errors`);
    console.log(`   3. Test the application`);
}
