#!/usr/bin/env node

/**
 * Migration Script: Update Hook Imports
 * 
 * Updates all imports from @/src/hooks/[file] to @/src/hooks/[domain]
 * 
 * Usage: 
 *   node scripts/migrate-hooks-imports.js --dry-run  (preview changes)
 *   node scripts/migrate-hooks-imports.js             (apply changes)
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Check for dry-run mode
const isDryRun = process.argv.includes('--dry-run');

// Mapping of hook files to their new domain folders
const HOOK_DOMAIN_MAP = {
    'useMediaQuery': 'ui',
    'useModalState': 'ui',
    'useToggle': 'ui',
    'useIntersectionObserver': 'ui',
    'useFormValidation': 'forms',
    'useMultiStepForm': 'forms',
    'useBulkSelection': 'data',
    'useDebouncedValue': 'data',
    'useAnalyticsDisplay': 'analytics',
};

// Find all TypeScript/TSX files
const clientDir = path.join(__dirname, '..');
const files = glob.sync('**/*.{ts,tsx}', {
    cwd: clientDir,
    ignore: ['node_modules/**', '.next/**', 'dist/**', 'build/**', 'scripts/**', 'src/hooks/**'],
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

    // Process each hook file mapping
    Object.entries(HOOK_DOMAIN_MAP).forEach(([hookFile, domain]) => {
        // Match imports like: from '@/src/hooks/useMediaQuery'
        const importRegex = new RegExp(
            `from ['"]@/src/hooks/${hookFile}['"]`,
            'g'
        );

        // Match dynamic imports like: import('@/src/hooks/useMediaQuery')
        const dynamicImportRegex = new RegExp(
            `import\\(['"]@/src/hooks/${hookFile}['"]\\)`,
            'g'
        );

        const matches = content.match(importRegex) || [];
        const dynamicMatches = content.match(dynamicImportRegex) || [];

        if (matches.length > 0 || dynamicMatches.length > 0) {
            // Replace static imports
            content = content.replace(
                importRegex,
                `from '@/src/hooks/${domain}'`
            );

            // Replace dynamic imports
            content = content.replace(
                dynamicImportRegex,
                `import('@/src/hooks/${domain}')`
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
    console.log(`   node scripts/migrate-hooks-imports.js`);
} else {
    console.log(`\n🔍 Next steps:`);
    console.log(`   1. Run: npm run type-check`);
    console.log(`   2. Verify no TypeScript errors`);
    console.log(`   3. Test the application`);
}
