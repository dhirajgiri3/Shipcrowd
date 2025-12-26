/**
 * Generate Baseline Metrics Script
 * Purpose: Capture current codebase metrics for tracking progress
 * Usage: npx tsx scripts/generateMetrics.ts
 */

import { execSync } from 'child_process';
import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface CodeMetrics {
  timestamp: string;
  linesOfCode: {
    total: number;
    byFileType: Record<string, number>;
    byDirectory: Record<string, number>;
  };
  files: {
    total: number;
    byExtension: Record<string, number>;
  };
  models: {
    total: number;
    list: string[];
  };
  services: {
    total: number;
    list: string[];
  };
  controllers: {
    total: number;
    list: string[];
  };
  routes: {
    total: number;
    list: string[];
  };
  tests: {
    total: number;
    unitTests: number;
    integrationTests: number;
  };
}

/**
 * Count lines in a file
 */
function countLines(filePath: string): number {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  } catch (error) {
    return 0;
  }
}

/**
 * Recursively scan directory and count files/lines
 */
function scanDirectory(
  dir: string,
  baseDir: string = dir
): { files: Record<string, number>; lines: Record<string, number> } {
  const result = {
    files: {} as Record<string, number>,
    lines: {} as Record<string, number>,
  };

  try {
    const items = readdirSync(dir);

    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip node_modules, .git, dist
        if (['node_modules', '.git', 'dist', 'build', 'coverage'].includes(item)) {
          continue;
        }

        const subResult = scanDirectory(fullPath, baseDir);

        // Merge results
        for (const [ext, count] of Object.entries(subResult.files)) {
          result.files[ext] = (result.files[ext] || 0) + count;
        }
        for (const [dir, lines] of Object.entries(subResult.lines)) {
          result.lines[dir] = (result.lines[dir] || 0) + lines;
        }
      } else if (stat.isFile()) {
        const ext = item.split('.').pop() || 'unknown';
        result.files[ext] = (result.files[ext] || 0) + 1;

        if (ext === 'ts' || ext === 'js') {
          const lines = countLines(fullPath);
          const relativeDir = dir.replace(baseDir, '').split('/')[1] || 'root';
          result.lines[relativeDir] = (result.lines[relativeDir] || 0) + lines;
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dir}:`, error);
  }

  return result;
}

/**
 * Get list of files matching pattern
 */
function getFiles(dir: string, pattern: RegExp): string[] {
  const files: string[] = [];

  try {
    const items = readdirSync(dir);

    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        if (!['node_modules', '.git', 'dist'].includes(item)) {
          files.push(...getFiles(fullPath, pattern));
        }
      } else if (pattern.test(item)) {
        files.push(fullPath.replace(process.cwd(), ''));
      }
    }
  } catch (error) {
    // Ignore errors
  }

  return files;
}

/**
 * Generate comprehensive code metrics
 */
async function generateMetrics(): Promise<CodeMetrics> {
  console.log('📊 Generating baseline metrics...\n');

  const srcDir = join(process.cwd(), 'src');
  const testsDir = join(process.cwd(), 'tests');

  // Scan source code
  const srcScan = scanDirectory(srcDir);

  // Count total lines
  const totalLines = Object.values(srcScan.lines).reduce((sum, lines) => sum + lines, 0);

  // Get models
  const models = getFiles(
    join(srcDir, 'infrastructure/database/mongoose/models'),
    /\.ts$/
  ).filter(f => !f.includes('index.ts'));

  // Get services
  const services = getFiles(
    join(srcDir, 'core/application/services'),
    /\.ts$/
  ).filter(f => !f.includes('index.ts'));

  // Get controllers
  const controllers = getFiles(
    join(srcDir, 'presentation/http/controllers'),
    /\.ts$/
  ).filter(f => !f.includes('index.ts'));

  // Get routes
  const routes = getFiles(
    join(srcDir, 'presentation/http/routes'),
    /\.ts$/
  ).filter(f => !f.includes('index.ts'));

  // Count tests
  const unitTests = getFiles(testsDir, /\.test\.ts$/).filter(f => f.includes('/unit/'));
  const integrationTests = getFiles(testsDir, /\.test\.ts$/).filter(f => f.includes('/integration/'));

  const metrics: CodeMetrics = {
    timestamp: new Date().toISOString(),
    linesOfCode: {
      total: totalLines,
      byFileType: srcScan.files,
      byDirectory: srcScan.lines,
    },
    files: {
      total: Object.values(srcScan.files).reduce((sum, count) => sum + count, 0),
      byExtension: srcScan.files,
    },
    models: {
      total: models.length,
      list: models,
    },
    services: {
      total: services.length,
      list: services,
    },
    controllers: {
      total: controllers.length,
      list: controllers,
    },
    routes: {
      total: routes.length,
      list: routes,
    },
    tests: {
      total: unitTests.length + integrationTests.length,
      unitTests: unitTests.length,
      integrationTests: integrationTests.length,
    },
  };

  return metrics;
}

/**
 * Display metrics in console
 */
function displayMetrics(metrics: CodeMetrics): void {
  console.log('📈 CODE METRICS SUMMARY\n');
  console.log(`Generated: ${new Date(metrics.timestamp).toLocaleString()}\n`);

  console.log('📝 Lines of Code:');
  console.log(`  Total: ${metrics.linesOfCode.total.toLocaleString()}`);
  console.log('  By Directory:');
  for (const [dir, lines] of Object.entries(metrics.linesOfCode.byDirectory).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${dir}: ${lines.toLocaleString()}`);
  }
  console.log('');

  console.log('📁 Files:');
  console.log(`  Total: ${metrics.files.total}`);
  console.log('  By Extension:');
  for (const [ext, count] of Object.entries(metrics.files.byExtension).sort((a, b) => b[1] - a[1])) {
    console.log(`    .${ext}: ${count}`);
  }
  console.log('');

  console.log('🗄️  Database Models:');
  console.log(`  Total: ${metrics.models.total}`);
  metrics.models.list.forEach(m => console.log(`    - ${m.split('/').pop()?.replace('.ts', '')}`));
  console.log('');

  console.log('⚙️  Services:');
  console.log(`  Total: ${metrics.services.total}`);
  console.log('');

  console.log('🎮 Controllers:');
  console.log(`  Total: ${metrics.controllers.total}`);
  console.log('');

  console.log('🛣️  Routes:');
  console.log(`  Total: ${metrics.routes.total}`);
  console.log('');

  console.log('🧪 Tests:');
  console.log(`  Total: ${metrics.tests.total}`);
  console.log(`  Unit Tests: ${metrics.tests.unitTests}`);
  console.log(`  Integration Tests: ${metrics.tests.integrationTests}`);
  console.log('');
}

/**
 * Save metrics to file
 */
function saveMetrics(metrics: CodeMetrics, outputPath: string): void {
  const jsonPath = `${outputPath}/CODE_METRICS.json`;
  const mdPath = `${outputPath}/CODE_METRICS.md`;
  const historyPath = `${outputPath}/METRICS_HISTORY.json`;

  // Save current metrics as JSON (latest snapshot)
  writeFileSync(jsonPath, JSON.stringify(metrics, null, 2));
  console.log(`✅ Saved metrics to ${jsonPath}`);

  // Append to history
  let history: CodeMetrics[] = [];

  // Load existing history if it exists
  try {
    const existingHistory = readFileSync(historyPath, 'utf-8');
    history = JSON.parse(existingHistory);
    if (!Array.isArray(history)) {
      history = [];
    }
  } catch (error) {
    // File doesn't exist or is invalid - start fresh
    console.log('📝 Creating new metrics history file...');
  }

  // Append current metrics
  history.push(metrics);

  // Save updated history
  writeFileSync(historyPath, JSON.stringify(history, null, 2));
  console.log(`✅ Appended to history (${history.length} snapshots total)`);


  // Save Markdown report
  const mdContent = `# Code Metrics Baseline Report
**Generated:** ${new Date(metrics.timestamp).toLocaleString()}
**Purpose:** Week 1 Session 2 baseline metrics

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Lines of Code** | ${metrics.linesOfCode.total.toLocaleString()} |
| **Total Files** | ${metrics.files.total} |
| **Database Models** | ${metrics.models.total} |
| **Services** | ${metrics.services.total} |
| **Controllers** | ${metrics.controllers.total} |
| **Routes** | ${metrics.routes.total} |
| **Tests** | ${metrics.tests.total} (${metrics.tests.unitTests} unit, ${metrics.tests.integrationTests} integration) |

---

## Lines of Code by Directory

| Directory | Lines |
|-----------|-------|
${Object.entries(metrics.linesOfCode.byDirectory)
      .sort((a, b) => b[1] - a[1])
      .map(([dir, lines]) => `| ${dir} | ${lines.toLocaleString()} |`)
      .join('\n')}

---

## Files by Extension

| Extension | Count |
|-----------|-------|
${Object.entries(metrics.files.byExtension)
      .sort((a, b) => b[1] - a[1])
      .map(([ext, count]) => `| .${ext} | ${count} |`)
      .join('\n')}

---

## Database Models (${metrics.models.total})

${metrics.models.list.map(m => `- ${m.split('/').pop()?.replace('.ts', '')}`).join('\n')}

---

## Services (${metrics.services.total})

${metrics.services.list.map(s => `- ${s.replace('/src/core/application/services/', '')}`).join('\n')}

---

## Controllers (${metrics.controllers.total})

${metrics.controllers.list.map(c => `- ${c.replace('/src/presentation/http/controllers/', '')}`).join('\n')}

---

## Routes (${metrics.routes.total})

${metrics.routes.list.map(r => `- ${r.replace('/src/presentation/http/routes/', '')}`).join('\n')}

---

## Test Coverage

- **Unit Tests:** ${metrics.tests.unitTests}
- **Integration Tests:** ${metrics.tests.integrationTests}
- **Total Tests:** ${metrics.tests.total}

---

**Next Steps:**
- Compare metrics after each week
- Track growth in tests, models, services
- Monitor code quality trends
`;

  writeFileSync(mdPath, mdContent);
  console.log(`✅ Saved report to ${mdPath}`);
}

/**
 * Run security audit
 */
function runSecurityAudit(outputPath: string): void {
  console.log('\n🔒 Running security audit...');

  try {
    const auditResult = execSync('npm audit --json', {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    writeFileSync(`${outputPath}/SECURITY_BASELINE.json`, auditResult);
    console.log(`✅ Saved security audit to ${outputPath}/SECURITY_BASELINE.json`);

    const audit = JSON.parse(auditResult);
    console.log(`\nSecurity Summary:`);
    console.log(`  Vulnerabilities: ${audit.metadata?.vulnerabilities?.total || 0}`);
    console.log(`  Critical: ${audit.metadata?.vulnerabilities?.critical || 0}`);
    console.log(`  High: ${audit.metadata?.vulnerabilities?.high || 0}`);
    console.log(`  Moderate: ${audit.metadata?.vulnerabilities?.moderate || 0}`);
    console.log(`  Low: ${audit.metadata?.vulnerabilities?.low || 0}`);
  } catch (error: any) {
    // npm audit returns non-zero if vulnerabilities found
    if (error.stdout) {
      writeFileSync(`${outputPath}/SECURITY_BASELINE.json`, error.stdout);
      console.log(`⚠️  Security audit complete (vulnerabilities found)`);
    } else {
      console.error('❌ Security audit failed:', error.message);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const outputPath = join(process.cwd(), '../docs/Development');

    // Generate metrics
    const metrics = await generateMetrics();

    // Display in console
    displayMetrics(metrics);

    // Save to files
    saveMetrics(metrics, outputPath);

    // Run security audit
    runSecurityAudit(outputPath);

    console.log('\n✅ Baseline metrics generation complete!');
    console.log(`\nFiles created in ${outputPath}:`);
    console.log('  - CODE_METRICS.json (latest snapshot)');
    console.log('  - CODE_METRICS.md (readable report)');
    console.log('  - METRICS_HISTORY.json (all historical snapshots)');
    console.log('  - SECURITY_BASELINE.json\n');
  } catch (error) {
    console.error('❌ Error generating metrics:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { generateMetrics, displayMetrics, saveMetrics };
