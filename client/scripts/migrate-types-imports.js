#!/usr/bin/env node

/**
 * Migration Script: Update Type Imports
 * 
 * Updates all imports from @/src/types/api/[file].types to @/src/types/api/[domain]
 * 
 * Usage: 
 *   node scripts/migrate-types-imports.js --dry-run  (preview changes)
 *   node scripts/migrate-types-imports.js             (apply changes)
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Check for dry-run mode
const isDryRun = process.argv.includes('--dry-run');

// Mapping of type files to their new domain folders
const TYPE_DOMAIN_MAP = {
    'manifest.types': 'orders',
    'ndr.types': 'orders',
    'couriers.types': 'logistics',
    'zones.types': 'logistics',
    'address.types': 'logistics',
    'returns.types': 'returns',
    'dispute.types': 'returns',
    'cod.types': 'finance',
    'wallet.types': 'finance',
    'integrations.types': 'integrations',
    'communication.types': 'communication',
    'fraud.types': 'security',
    'settings.types': 'settings',
    'analytics.types': 'analytics',
};

// Find all TypeScript/TSX files
const clientDir = path.join(__dirname, '..');
const files = glob.sync('**/*.{ts,tsx}', {
    cwd: clientDir,
    ignore: ['node_modules/**', '.next/**', 'dist/**', 'build/**', 'scripts/**'],
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

    // Process each type file mapping
    Object.entries(TYPE_DOMAIN_MAP).forEach(([typeFile, domain]) => {
        // Match imports like: from '@/src/types/api/manifest.types'
        const importRegex = new RegExp(
            `from ['"]@/src/types/api/${typeFile}['"]`,
            'g'
        );

        // Match dynamic imports like: import('@/src/types/api/manifest.types')
        const dynamicImportRegex = new RegExp(
            `import\\(['"]@/src/types/api/${typeFile}['"]\\)`,
            'g'
        );

        const matches = content.match(importRegex) || [];
        const dynamicMatches = content.match(dynamicImportRegex) || [];

        if (matches.length > 0 || dynamicMatches.length > 0) {
            // Replace static imports
            content = content.replace(
                importRegex,
                `from '@/src/types/api/${domain}'`
            );

            // Replace dynamic imports
            content = content.replace(
                dynamicImportRegex,
                `import('@/src/types/api/${domain}')`
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
    console.log(`   node scripts/migrate-types-imports.js`);
} else {
    console.log(`\n🔍 Next steps:`);
    console.log(`   1. Run: npm run type-check`);
    console.log(`   2. Verify no TypeScript errors`);
    console.log(`   3. Test the application`);
}
