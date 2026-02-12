import fs from 'fs';
import path from 'path';

type Match = {
  file: string;
  line: number;
  label: string;
};

const SERVER_ROOT = path.resolve(__dirname, '..', '..');

const REMOVED_FILES = [
  'src/infrastructure/database/mongoose/models/logistics/shipping/configuration/rate-card.model.ts',
  'src/infrastructure/database/mongoose/models/shipping/courier.model.ts',
  'src/infrastructure/database/migrations/phase-2/ratecard-scope-migration.ts',
  'src/scripts/migrations/migrate-rate-card-versions.ts',
  'src/infrastructure/database/seeders/seeders/23-rate-card-and-zones.seeder.ts',
  'src/infrastructure/database/seeders/seeders/29-couriers.seeder.ts',
];

const BANNED_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  {
    label: 'legacy RateCard model import',
    regex: /\/rate-card\.model/,
  },
  {
    label: 'legacy RateCard symbol',
    regex: /\bRateCard\b/,
  },
  {
    label: 'legacy company defaultRateCardId',
    regex: /\bdefaultRateCardId\b/,
  },
  {
    label: 'legacy Courier model import',
    regex: /shipping\/courier\.model/,
  },
  {
    label: 'legacy Courier model export/import symbol',
    regex: /\bimport\s*\{[^}]*\bCourier\b[^}]*\}\s*from\s*['"].*mongoose\/models['"]/,
  },
  {
    label: 'legacy Courier mongoose ref',
    regex: /ref:\s*['"]Courier['"]/
  },
];

const SCAN_DIRS = ['src'];

function walkFiles(dir: string, acc: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, acc);
      continue;
    }
    if (entry.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx'))) {
      acc.push(fullPath);
    }
  }
  return acc;
}

function relative(filePath: string): string {
  return path.relative(SERVER_ROOT, filePath).split(path.sep).join('/');
}

function main(): void {
  const failures: string[] = [];
  const matches: Match[] = [];

  console.log('🔍 Verifying legacy RateCard/Courier retirement...');

  for (const file of REMOVED_FILES) {
    const absolute = path.join(SERVER_ROOT, file);
    if (fs.existsSync(absolute)) {
      failures.push(`Legacy file still present: ${file}`);
    }
  }

  for (const scanDir of SCAN_DIRS) {
    const root = path.join(SERVER_ROOT, scanDir);
    if (!fs.existsSync(root)) continue;

    for (const filePath of walkFiles(root)) {
      const lines = fs.readFileSync(filePath, 'utf8').split('\n');
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        for (const rule of BANNED_PATTERNS) {
          if (rule.regex.test(line)) {
            matches.push({
              file: relative(filePath),
              line: i + 1,
              label: rule.label,
            });
          }
        }
      }
    }
  }

  if (failures.length > 0 || matches.length > 0) {
    if (failures.length > 0) {
      console.error('\n❌ Structural failures:');
      failures.forEach((failure) => console.error(` - ${failure}`));
    }

    if (matches.length > 0) {
      console.error('\n❌ Legacy references found:');
      matches.forEach((match) => {
        console.error(` - ${match.file}:${match.line} [${match.label}]`);
      });
    }

    process.exit(1);
  }

  console.log('✅ Legacy RateCard/Courier retirement verification passed');
}

main();
