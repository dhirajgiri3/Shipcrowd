#!/usr/bin/env node

/**
 * Toast Migration Cleanup Script
 * Fixes issues from the initial migration
 */

const fs = require('fs');
const path = require('path');

const CLIENT_DIR = path.join(__dirname, '..');

const filesToFix = [
    // Files with duplicate imports
    'src/core/api/hooks/useCouriers.ts',
    'src/core/api/hooks/useSettings.ts',
    'src/features/disputes/components/SubmitEvidenceModal.tsx',

    // Files with unused sonner imports
    'app/admin/couriers/[id]/page.tsx',
    'app/admin/settings/platform/page.tsx',
    'app/seller/settings/email/components/EmailClient.tsx',
    'app/seller/communication/templates/page.tsx',
    'app/seller/integrations/shopify/setup/page.tsx',

    // Files with remaining toast calls
    'app/seller/settings/security/components/SecurityClient.tsx',
    'app/seller/tools/bulk-address-validation/components/BulkAddressValidationClient.tsx',
    'app/verify-email/components/VerifyEmailClient.tsx',
    'src/features/admin/zones/components/PincodeManager.tsx',
    'src/features/admin/zones/components/ZoneCreateWizard.tsx',
];

function fixFile(relativePath) {
    const filePath = path.join(CLIENT_DIR, relativePath);

    if (!fs.existsSync(filePath)) {
        console.log(`⏭️  Skipping ${relativePath} (not found)`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    // Fix 1: Remove duplicate handleApiError imports
    const duplicatePattern = /import { handleApiError } from '@\/src\/lib\/error-handler';\s*\nimport { handleApiError } from '@\/src\/lib\/error-handler';/g;
    if (duplicatePattern.test(content)) {
        content = content.replace(duplicatePattern, "import { handleApiError } from '@/src/lib/error-handler';");
        modified = true;
    }

    // Fix 2: Remove unused sonner imports (if no toast. calls remain)
    if (content.includes("import { toast } from 'sonner'") && !content.match(/\btoast\./)) {
        content = content.replace(/import\s+{\s*toast\s*}\s+from\s+['"]sonner['"];?\s*\n/g, '');
        modified = true;
    }

    // Fix 3: Replace remaining toast.error with just removing them (they're redundant with setError)
    const remainingErrors = content.match(/toast\.error\([^)]+\);?\s*\n/g);
    if (remainingErrors) {
        remainingErrors.forEach(match => {
            content = content.replace(match, '');
            modified = true;
        });
    }

    // Fix 4: Replace remaining toast.success
    if (content.includes('toast.success(')) {
        content = content.replace(/toast\.success\(/g, 'showSuccessToast(');
        modified = true;

        // Ensure showSuccessToast is imported
        if (!content.includes('showSuccessToast')) {
            content = content.replace(
                /import { handleApiError } from '@\/src\/lib\/error-handler';/,
                "import { handleApiError, showSuccessToast } from '@/src/lib/error-handler';"
            );
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`✅ Fixed ${relativePath}`);
    } else {
        console.log(`⏭️  ${relativePath} - no changes needed`);
    }
}

console.log('🔧 Toast Migration Cleanup Script\n');

filesToFix.forEach(fixFile);

console.log('\n✅ Cleanup complete!');
