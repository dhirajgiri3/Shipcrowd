#!/usr/bin/env node

/**
 * Hooks Import Path Migration Script
 * 
 * Updates imports from old flat structure to new organized structure.
 * Since we're using barrel exports, most imports should still work,
 * but this script fixes any direct file imports.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CLIENT_DIR = path.join(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

// Mapping of old imports to new paths
const HOOK_MAPPINGS = {
    // Orders
    'useOrders': 'orders/useOrders',
    'useShipments': 'orders/useShipments',
    'useManifests': 'orders/useManifests',
    'useRecentCustomers': 'orders/useRecentCustomers',

    // Logistics
    'useCouriers': 'logistics/useCouriers',
    'useZones': 'logistics/useZones',
    'useWarehouses': 'logistics/useWarehouses',
    'useAddress': 'logistics/useAddress',
    'useRateCards': 'logistics/useRateCards',

    // Returns
    'useReturns': 'returns/useReturns',
    'useNDR': 'returns/useNDR',
    'useDisputes': 'returns/useDisputes',

    // Finance
    'useWallet': 'finance/useWallet',
    'useCOD': 'finance/useCOD',
    'useSettlements': 'finance/useSettlements',

    // Integrations
    'useEcommerceIntegrations': 'integrations/useEcommerceIntegrations',
    'useIntegrations': 'integrations/useIntegrations',
    'useWebhooks': 'integrations/useWebhooks',

    // Communication
    'useCommunication': 'communication/useCommunication',

    // Security
    'useSecurity': 'security/useSecurity',
    'useFraud': 'security/useFraud',
    'useKYC': 'security/useKYC',
    'useAuditLogs': 'security/useAuditLogs',

    // Settings
    'useSettings': 'settings/useSettings',
    'useProfile': 'settings/useProfile',
    'useTeam': 'settings/useTeam',
    'useCompanies': 'settings/useCompanies',

    // Analytics
    'useAnalytics': 'analytics/useAnalytics',

    // Seller
    'useSellerActions': 'seller/useSellerActions',
};

const stats = {
    filesProcessed: 0,
    filesModified: 0,
    importsUpdated: 0,
};

/**
 * Find all TypeScript/TSX files
 */
function findTSFiles() {
    try {
        const result = execSync(
            `find . -type f \\( -name "*.ts" -o -name "*.tsx" \\) ! -path "*/node_modules/*" ! -path "*/.next/*" ! -path "*/dist/*"`,
            { cwd: CLIENT_DIR, encoding: 'utf-8' }
        );

        return result
            .trim()
            .split('\n')
            .filter(file => file)
            .map(file => path.join(CLIENT_DIR, file));
    } catch (error) {
        return [];
    }
}

/**
 * Update imports in a file
 */
function updateFileImports(filePath) {
    stats.filesProcessed++;

    try {
        let content = fs.readFileSync(filePath, 'utf-8');
        let modified = false;

        // Pattern: import { ... } from '@/src/core/api/hooks/useXXX';
        // Replace with: import { ... } from '@/src/core/api/hooks/domain/useXXX';
        Object.entries(HOOK_MAPPINGS).forEach(([hookName, newPath]) => {
            const oldPattern = new RegExp(
                `from ['"]@/src/core/api/hooks/${hookName}['"]`,
                'g'
            );

            if (oldPattern.test(content)) {
                content = content.replace(
                    oldPattern,
                    `from '@/src/core/api/hooks/${newPath}'`
                );
                modified = true;
                stats.importsUpdated++;
            }
        });

        if (modified) {
            if (!DRY_RUN) {
                fs.writeFileSync(filePath, content, 'utf-8');
            }
            stats.filesModified++;
            const relativePath = path.relative(CLIENT_DIR, filePath);
            console.log(`✅ ${relativePath}`);
        }

    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
    }
}

/**
 * Main execution
 */
function main() {
    console.log('🔄 Hooks Import Path Migration\n');

    if (DRY_RUN) {
        console.log('📋 Running in DRY RUN mode\n');
    }

    const files = findTSFiles();
    console.log(`📁 Found ${files.length} TypeScript files\n`);

    files.forEach(updateFileImports);

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary');
    console.log('='.repeat(60));
    console.log(`Files processed:  ${stats.filesProcessed}`);
    console.log(`Files modified:   ${stats.filesModified}`);
    console.log(`Imports updated:  ${stats.importsUpdated}`);

    if (!DRY_RUN && stats.filesModified > 0) {
        console.log('\n✅ Migration complete!');
    }
}

main();
