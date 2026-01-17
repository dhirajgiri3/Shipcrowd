const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CLIENT_DIR = path.join(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

// Directories where we moved the hooks
const DOMAIN_DIRS = [
    'orders', 'logistics', 'returns', 'finance', 'integrations',
    'communication', 'security', 'settings', 'analytics', 'seller'
];

function updateRelativeImports(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf-8');
        let modified = false;

        // Replace '../config' with '../../config'
        if (content.includes("'../config")) {
            content = content.replace(/'\.\.\/config/g, "'../../config");
            modified = true;
        }
        if (content.includes('"../config')) {
            content = content.replace(/"\.\.\/config/g, '"../../config');
            modified = true;
        }

        // Replace '../clients' with '../../clients'
        if (content.includes("'../clients")) {
            content = content.replace(/'\.\.\/clients/g, "'../../clients");
            modified = true;
        }
        if (content.includes('"../clients')) {
            content = content.replace(/"\.\.\/clients/g, '"../../clients');
            modified = true;
        }

        // Replace '../queries' with '../../queries'
        if (content.includes("'../queries")) {
            content = content.replace(/'\.\.\/queries/g, "'../../queries");
            modified = true;
        }
        if (content.includes('"../queries')) {
            content = content.replace(/"\.\.\/queries/g, '"../../queries');
            modified = true;
        }

        if (modified) {
            console.log(`Updating ${path.relative(CLIENT_DIR, filePath)}`);
            if (!DRY_RUN) {
                fs.writeFileSync(filePath, content, 'utf-8');
            }
        }
    } catch (e) {
        console.error(`Error updating ${filePath}: ${e.message}`);
    }
}

function main() {
    console.log('Fixing relative imports in reorganized hooks...');

    DOMAIN_DIRS.forEach(dir => {
        const dirPath = path.join(CLIENT_DIR, 'src/core/api/hooks', dir);
        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.ts'));
            files.forEach(file => {
                if (file !== 'index.ts') {
                    updateRelativeImports(path.join(dirPath, file));
                }
            });
        }
    });
}

main();
