const fs = require('fs');
const path = require('path');

const CLIENT_DIR = path.join(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

// Files with missing toast references (from tsc output)
const FILES_TO_FIX = [
    'app/account-recovery/components/AccountRecoveryClient.tsx',
    'app/admin/companies/components/CompaniesClient.tsx',
    'app/admin/sellers/[id]/page.tsx',
    'app/magic-link/components/MagicLinkClient.tsx',
    'app/magic-link/verify/components/VerifyClient.tsx',
    'app/oauth-callback/components/OAuthCallbackClient.tsx',
    'app/seller/communication/rules/page.tsx',
    'app/seller/manifests/create/page.tsx',
    'app/seller/orders/create/components/CreateOrderClient.tsx',
    'app/seller/settings/account/components/AccountClient.tsx',
    'app/seller/settings/privacy/components/PrivacyClient.tsx',
];

function fixToastReferences(filePath) {
    const fullPath = path.join(CLIENT_DIR, filePath);

    if (!fs.existsSync(fullPath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        return;
    }

    let content = fs.readFileSync(fullPath, 'utf-8');
    let modified = false;

    // Check if file uses toast but doesn't import it or centralized utilities
    const hasToastCalls = /\btoast\.(success|error|info|warning|loading)\(/.test(content);
    const hasSonnerImport = /from ['"]sonner['"]/.test(content);
    const hasErrorHandlerImport = /from ['"]@\/src\/lib\/error-handler['"]/.test(content);

    if (!hasToastCalls) {
        console.log(`✓ ${filePath} - No toast calls found`);
        return;
    }

    if (hasSonnerImport) {
        console.log(`✓ ${filePath} - Already has sonner import`);
        return;
    }

    if (hasErrorHandlerImport) {
        console.log(`✓ ${filePath} - Already using centralized error handling`);
        return;
    }

    // Add import for centralized error handling
    const importStatement = "import { handleApiError, showSuccessToast, showInfoToast, showWarningToast } from '@/src/lib/error-handler';\n";

    // Find the last import statement
    const importRegex = /^import .+ from .+;$/gm;
    const imports = content.match(importRegex);

    if (imports && imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertPosition = lastImportIndex + lastImport.length + 1;

        content = content.slice(0, insertPosition) + importStatement + content.slice(insertPosition);
        modified = true;
    } else {
        // No imports found, add at the beginning
        content = importStatement + '\n' + content;
        modified = true;
    }

    // Replace toast.success with showSuccessToast
    content = content.replace(/toast\.success\(/g, 'showSuccessToast(');

    // Replace toast.error with handleApiError (for simple string messages)
    // Note: This is a simple replacement. Complex error handling may need manual review
    content = content.replace(/toast\.error\((['"`][^'"`]+['"`])\)/g, 'showErrorToast($1)');

    // Replace toast.info with showInfoToast
    content = content.replace(/toast\.info\(/g, 'showInfoToast(');

    // Replace toast.warning with showWarningToast
    content = content.replace(/toast\.warning\(/g, 'showWarningToast(');

    // Add showErrorToast to imports if we used it
    if (content.includes('showErrorToast(')) {
        content = content.replace(
            "import { handleApiError, showSuccessToast, showInfoToast, showWarningToast }",
            "import { handleApiError, showSuccessToast, showInfoToast, showWarningToast, showErrorToast }"
        );
    }

    if (modified) {
        console.log(`✏️  Fixing ${filePath}`);
        if (!DRY_RUN) {
            fs.writeFileSync(fullPath, content, 'utf-8');
        }
    }
}

function main() {
    console.log('Fixing missing toast references...\n');

    if (DRY_RUN) {
        console.log('🔍 DRY RUN MODE - No files will be modified\n');
    }

    FILES_TO_FIX.forEach(file => {
        fixToastReferences(file);
    });

    console.log('\n✅ Done!');
    console.log('\nNote: Please review the changes manually, especially error handling logic.');
    console.log('Some complex error cases may need manual adjustment.');
}

main();
