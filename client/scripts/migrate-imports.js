#!/usr/bin/env node

/**
 * Automated Import Path Migration Script
 * 
 * Usage:
 *   node scripts/migrate-imports.js --phase=A --dry-run  (preview changes)
 *   node scripts/migrate-imports.js --phase=A            (execute changes)
 * 
 * Phases:
 *   A: Component & Hook migrations
 *   B: Type reorganization
 *   C: Core API restructure
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Phase A: Component & Hook migrations
const PHASE_A_MAPPINGS = {
    // Components - UI
    "@/components/ui/core/": "@/src/components/ui/core/",
    "@/components/ui/data/": "@/src/components/ui/data/",
    "@/components/ui/feedback/": "@/src/components/ui/feedback/",
    "@/components/ui/forms/": "@/src/components/ui/forms/",
    "@/components/ui/layout/": "@/src/components/ui/layout/",

    // Components - Layouts
    "@/components/seller/": "@/src/components/layouts/seller/",
    "@/components/admin/": "@/src/components/layouts/admin/",

    // Components - Other
    "@/components/shared/": "@/src/components/shared/",
    "@/components/auth/": "@/src/components/auth/",
    "@/components/charts/": "@/src/components/charts/",
    "@/components/kyc/": "@/src/components/kyc/",

    // Hooks
    "@/hooks/useCountUp": "@/src/hooks/ui/useCountUp",
    "@/hooks/useLoader": "@/src/hooks/ui/useLoader",
    "@/hooks/useProgress": "@/src/hooks/ui/useProgress",
    "@/hooks/": "@/src/hooks/",
};

// Phase B: Type migrations
const PHASE_B_MAPPINGS = {
    "@/src/types/order": "@/src/types/domain/order",
    "@/src/types/admin": "@/src/types/domain/admin",
    "@/src/types/security.types": "@/src/types/domain/security.types",
    "@/src/types/auth": "@/src/types/auth/auth",
    "@/src/types/analytics.types": "@/src/types/analytics/analytics.types",
};

// Phase C: Core API migrations
const PHASE_C_MAPPINGS = {
    "@/src/core/api/client\"": "@/src/core/api/client/client\"",
    "@/src/core/api/client'": "@/src/core/api/client/client'",
    "@/src/core/api/authApi": "@/src/core/api/services/authApi",
    "@/src/core/api/companyApi": "@/src/core/api/services/companyApi",
    "@/src/core/api/orderApi": "@/src/core/api/services/orderApi",
    "@/src/core/api/kycApi": "@/src/core/api/services/kycApi",
    "@/src/core/api/sessionApi": "@/src/core/api/services/sessionApi",
    "@/src/core/api/recoveryApi": "@/src/core/api/services/recoveryApi",
    "@/src/core/api/consentApi": "@/src/core/api/services/consentApi",
    "@/src/core/api/trackingApi": "@/src/core/api/services/trackingApi",
    "@/src/core/api/cacheConfig": "@/src/core/api/cache/cacheConfig",
    "@/src/core/api/queryKeys": "@/src/core/api/cache/queryKeys",
    "@/src/core/api/optimisticUpdates": "@/src/core/api/cache/optimisticUpdates",
    "@/src/core/api/requestDeduplication": "@/src/core/api/utils/requestDeduplication",
};

function migrateImports(mappings, dryRun = true) {
    const files = glob.sync('**/*.{ts,tsx}', {
        ignore: ['node_modules/**', '.next/**', 'dist/**', 'build/**', 'scripts/**'],
        cwd: process.cwd()
    });

    let totalReplacements = 0;
    const updatedFiles = [];
    const changes = [];

    files.forEach(file => {
        const filePath = path.join(process.cwd(), file);
        let content = fs.readFileSync(filePath, 'utf8');
        let updated = content;
        let fileChanged = false;
        const fileChanges = [];

        Object.entries(mappings).forEach(([from, to]) => {
            // Create regex that matches the import path
            const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedFrom, 'g');

            const matches = (updated.match(regex) || []).length;
            if (matches > 0) {
                updated = updated.replace(regex, to);
                fileChanged = true;
                totalReplacements += matches;
                fileChanges.push({ from, to, count: matches });
            }
        });

        if (fileChanged) {
            updatedFiles.push(file);
            changes.push({ file, changes: fileChanges });

            if (!dryRun) {
                fs.writeFileSync(filePath, updated, 'utf8');
            }
        }
    });

    // Print results
    console.log(`\n${dryRun ? '🔍 DRY RUN' : '✅ EXECUTED'} - Import Migration Results\n`);
    console.log(`Total replacements: ${totalReplacements}`);
    console.log(`Files updated: ${updatedFiles.length}\n`);

    if (dryRun && changes.length > 0) {
        console.log('Preview of changes:\n');
        changes.slice(0, 10).forEach(({ file, changes: fileChanges }) => {
            console.log(`📄 ${file}`);
            fileChanges.forEach(({ from, to, count }) => {
                console.log(`   ${from} → ${to} (${count}x)`);
            });
            console.log('');
        });

        if (changes.length > 10) {
            console.log(`... and ${changes.length - 10} more files\n`);
        }
    }

    return { totalReplacements, updatedFiles, changes };
}

// CLI execution
const args = process.argv.slice(2);
const phaseArg = args.find(a => a.startsWith('--phase='));
const phase = phaseArg ? phaseArg.split('=')[1] : 'A';
const dryRun = args.includes('--dry-run');

let mappings;
switch (phase.toUpperCase()) {
    case 'A':
        mappings = PHASE_A_MAPPINGS;
        console.log('📦 Phase A: Component & Hook Migration');
        break;
    case 'B':
        mappings = PHASE_B_MAPPINGS;
        console.log('📦 Phase B: Type Reorganization');
        break;
    case 'C':
        mappings = PHASE_C_MAPPINGS;
        console.log('📦 Phase C: Core API Restructure');
        break;
    default:
        console.error('❌ Invalid phase. Use --phase=A, --phase=B, or --phase=C');
        process.exit(1);
}

migrateImports(mappings, dryRun);

if (dryRun) {
    console.log('💡 To execute these changes, run without --dry-run flag\n');
}
