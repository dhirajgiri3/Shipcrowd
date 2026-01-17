#!/usr/bin/env node

/**
 * Frontend Polish Migration Script
 * 
 * Automates the merging of root-level /hooks and /components into /src
 * and updates all import paths throughout the codebase.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(60));
    log(title, 'cyan');
    console.log('='.repeat(60) + '\n');
}

// Migration configuration
const MIGRATIONS = {
    hooks: {
        source: path.join(__dirname, '../hooks'),
        target: path.join(__dirname, '../src/hooks/utility'),
        files: [
            'useCountUp.tsx',
            'useLoader.ts',
            'useProgress.ts',
        ],
    },
    components: {
        source: path.join(__dirname, '../components'),
        target: path.join(__dirname, '../src/components'),
        directories: [
            'admin',
            'auth',
            'charts',
            'kyc',
            'seller',
            'shared',
        ],
    },
};

// Import path replacements
const IMPORT_REPLACEMENTS = [
    {
        pattern: /from ['"]@\/components\//g,
        replacement: "from '@/src/components/",
        description: "@/components/ → @/src/components/"
    },
    {
        pattern: /from ['"]\/components\//g,
        replacement: "from '/src/components/",
        description: "/components/ → /src/components/"
    },
    {
        pattern: /from ['"]@\/hooks\//g,
        replacement: "from '@/src/hooks/",
        description: "@/hooks/ → @/src/hooks/"
    },
    {
        pattern: /from ['"]\/hooks\//g,
        replacement: "from '/src/hooks/",
        description: "/hooks/ → /src/hooks/"
    },
    {
        pattern: /from ['"]@\/components['"]/g,
        replacement: "from '@/src/components'",
        description: "@/components → @/src/components"
    },
    {
        pattern: /from ['"]@\/hooks['"]/g,
        replacement: "from '@/src/hooks'",
        description: "@/hooks → @/src/hooks"
    },
];

// Statistics
const stats = {
    filesMoved: 0,
    directoriesCreated: 0,
    importsUpdated: 0,
    filesScanned: 0,
};

/**
 * Recursively get all files in a directory
 */
function getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            if (!filePath.includes('node_modules') && !filePath.includes('.next')) {
                getAllFiles(filePath, fileList);
            }
        } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
            fileList.push(filePath);
        }
    });

    return fileList;
}

/**
 * Create directory if it doesn't exist
 */
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        if (DRY_RUN) {
            log(`[DRY RUN] Would create directory: ${dirPath}`, 'blue');
        } else {
            fs.mkdirSync(dirPath, { recursive: true });
            log(`✓ Created directory: ${dirPath}`, 'green');
        }
        stats.directoriesCreated++;
    }
}

/**
 * Move file from source to target
 */
function moveFile(sourcePath, targetPath) {
    ensureDir(path.dirname(targetPath));

    if (DRY_RUN) {
        log(`[DRY RUN] Would move: ${sourcePath} → ${targetPath}`, 'blue');
    } else {
        fs.copyFileSync(sourcePath, targetPath);
        log(`✓ Moved: ${path.basename(sourcePath)}`, 'green');
        if (VERBOSE) {
            log(`  From: ${sourcePath}`, 'reset');
            log(`  To: ${targetPath}`, 'reset');
        }
    }
    stats.filesMoved++;
}

/**
 * Update imports in a file
 */
function updateImports(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    let updatedContent = content;
    let hasChanges = false;

    IMPORT_REPLACEMENTS.forEach(({ pattern, replacement }) => {
        const matches = content.match(pattern);
        if (matches) {
            updatedContent = updatedContent.replace(pattern, replacement);
            hasChanges = true;
            stats.importsUpdated += matches.length;
        }
    });

    if (hasChanges) {
        if (DRY_RUN) {
            log(`[DRY RUN] Would update imports in: ${path.relative(process.cwd(), filePath)}`, 'yellow');
        } else {
            fs.writeFileSync(filePath, updatedContent, 'utf8');
            log(`✓ Updated: ${path.relative(process.cwd(), filePath)}`, 'green');
        }
    }

    stats.filesScanned++;
}

/**
 * Migrate hooks
 */
function migrateHooks() {
    logSection('Phase 1: Migrating Hooks');

    const { source, target, files } = MIGRATIONS.hooks;

    if (!fs.existsSync(source)) {
        log('⚠ Hooks directory not found, skipping...', 'yellow');
        return;
    }

    ensureDir(target);

    files.forEach(file => {
        const sourcePath = path.join(source, file);
        const targetPath = path.join(target, file);

        if (fs.existsSync(sourcePath)) {
            moveFile(sourcePath, targetPath);
        } else {
            log(`⚠ File not found: ${file}`, 'yellow');
        }
    });

    // Update barrel export
    const barrelPath = path.join(__dirname, '../src/hooks/index.ts');
    if (fs.existsSync(barrelPath)) {
        const barrelContent = fs.readFileSync(barrelPath, 'utf8');
        const newExports = `
// Utility hooks
export * from './utility/useCountUp';
export * from './utility/useLoader';
export * from './utility/useProgress';
`;

        if (!barrelContent.includes('utility/useCountUp')) {
            if (DRY_RUN) {
                log('[DRY RUN] Would update hooks barrel export', 'blue');
            } else {
                fs.appendFileSync(barrelPath, newExports);
                log('✓ Updated hooks barrel export', 'green');
            }
        }
    }
}

/**
 * Migrate components
 */
function migrateComponents() {
    logSection('Phase 2: Migrating Components');

    const { source, target, directories } = MIGRATIONS.components;

    if (!fs.existsSync(source)) {
        log('⚠ Components directory not found, skipping...', 'yellow');
        return;
    }

    directories.forEach(dir => {
        const sourcePath = path.join(source, dir);
        const targetPath = path.join(target, dir);

        if (fs.existsSync(sourcePath)) {
            ensureDir(targetPath);

            // Copy all files in directory
            const files = fs.readdirSync(sourcePath);
            files.forEach(file => {
                const sourceFile = path.join(sourcePath, file);
                const targetFile = path.join(targetPath, file);

                if (fs.statSync(sourceFile).isFile()) {
                    moveFile(sourceFile, targetFile);
                }
            });
        } else {
            log(`⚠ Directory not found: ${dir}`, 'yellow');
        }
    });
}

/**
 * Update all imports
 */
function updateAllImports() {
    logSection('Phase 3: Updating Import Paths');

    const clientDir = path.join(__dirname, '..');
    const filesToUpdate = getAllFiles(clientDir)
        .filter(file => !file.includes('/scripts/') && !file.includes('/.next/'));

    log(`Found ${filesToUpdate.length} files to scan`, 'blue');

    filesToUpdate.forEach(file => {
        updateImports(file);
    });
}

/**
 * Clean up old directories
 */
function cleanup() {
    logSection('Phase 4: Cleanup');

    const dirsToRemove = [
        path.join(__dirname, '../hooks'),
        path.join(__dirname, '../components'),
    ];

    dirsToRemove.forEach(dir => {
        if (fs.existsSync(dir)) {
            // Check if directory is empty
            const files = fs.readdirSync(dir);
            const hasFiles = files.some(file => {
                const filePath = path.join(dir, file);
                return fs.statSync(filePath).isFile() && file !== 'index.ts';
            });

            if (!hasFiles) {
                if (DRY_RUN) {
                    log(`[DRY RUN] Would remove: ${dir}`, 'blue');
                } else {
                    fs.rmSync(dir, { recursive: true, force: true });
                    log(`✓ Removed: ${dir}`, 'green');
                }
            } else {
                log(`⚠ Directory not empty, skipping removal: ${dir}`, 'yellow');
            }
        }
    });
}

/**
 * Print summary
 */
function printSummary() {
    logSection('Migration Summary');

    console.log(`Files moved:          ${stats.filesMoved}`);
    console.log(`Directories created:  ${stats.directoriesCreated}`);
    console.log(`Files scanned:        ${stats.filesScanned}`);
    console.log(`Imports updated:      ${stats.importsUpdated}`);

    if (DRY_RUN) {
        log('\n⚠ This was a DRY RUN - no changes were made', 'yellow');
        log('Run without --dry-run to execute the migration', 'yellow');
    } else {
        log('\n✓ Migration completed successfully!', 'green');
        log('Next steps:', 'cyan');
        log('1. Run: npm run build', 'reset');
        log('2. Verify the build passes', 'reset');
        log('3. Test the application manually', 'reset');
    }
}

/**
 * Main execution
 */
function main() {
    console.clear();
    log('Frontend Polish Migration Script', 'cyan');
    log('================================\n', 'cyan');

    if (DRY_RUN) {
        log('Running in DRY RUN mode - no changes will be made\n', 'yellow');
    }

    try {
        migrateHooks();
        migrateComponents();
        updateAllImports();
        cleanup();
        printSummary();

        process.exit(0);
    } catch (error) {
        log('\n❌ Migration failed!', 'red');
        console.error(error);
        process.exit(1);
    }
}

// Run the migration
main();
