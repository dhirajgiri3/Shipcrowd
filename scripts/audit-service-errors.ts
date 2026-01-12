#!/usr/bin/env tsx

/**
 * Service Error Audit Script
 * Analyzes all service files for error handling patterns
 * 
 * Usage: npx tsx scripts/audit-service-errors.ts
 */

import fs from 'fs';
import path from 'path';

interface ServiceAudit {
    file: string;
    totalThrows: number;
    customErrors: number;
    genericErrors: number;
    errorTypes: Record<string, number>;
    hasLogger: boolean;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    issues: string[];
}

const results: ServiceAudit[] = [];

/**
 * Get all service files recursively
 */
function getServiceFiles(dir: string): string[] {
    const files: string[] = [];

    function scan(currentDir: string) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
                scan(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.service.ts')) {
                files.push(fullPath);
            }
        }
    }

    scan(dir);
    return files;
}

/**
 * Analyze a single service file
 */
function analyzeService(filePath: string): ServiceAudit {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    const audit: ServiceAudit = {
        file: path.relative(process.cwd(), filePath),
        totalThrows: 0,
        customErrors: 0,
        genericErrors: 0,
        errorTypes: {},
        hasLogger: content.includes('logger.'),
        priority: 'LOW',
        issues: [],
    };

    // Count throw statements
    const throwMatches = content.match(/throw\s+new\s+(\w+)/g) || [];
    audit.totalThrows = throwMatches.length;

    // Analyze error types
    throwMatches.forEach(throwStmt => {
        const match = throwStmt.match(/throw\s+new\s+(\w+)/);
        if (match) {
            const errorType = match[1];
            audit.errorTypes[errorType] = (audit.errorTypes[errorType] || 0) + 1;

            // Categorize
            if (errorType === 'Error') {
                audit.genericErrors++;
            } else if (errorType.endsWith('Error')) {
                audit.customErrors++;
            }
        }
    });

    // Check for issues
    if (audit.genericErrors > 0) {
        audit.issues.push(`${audit.genericErrors} generic Error throws`);
    }

    if (!audit.hasLogger && audit.totalThrows > 0) {
        audit.issues.push('No logger usage found');
    }

    // Check for string literals in errors
    const stringErrorMatches = content.match(/throw\s+new\s+\w+\s*\(\s*['"`]/g) || [];
    if (stringErrorMatches.length > 0) {
        audit.issues.push(`${stringErrorMatches.length} hardcoded error messages`);
    }

    // Determine priority
    if (audit.genericErrors > 5 || audit.issues.length > 2) {
        audit.priority = 'HIGH';
    } else if (audit.genericErrors > 0 || audit.issues.length > 0) {
        audit.priority = 'MEDIUM';
    }

    return audit;
}

/**
 * Main execution
 */
async function main() {
    console.log('🔍 Auditing service layer error handling...\n');

    const servicesDir = path.join(process.cwd(), 'server/src/core/application/services');
    const serviceFiles = getServiceFiles(servicesDir);

    console.log(`Found ${serviceFiles.length} service files\n`);

    // Analyze all services
    serviceFiles.forEach(file => {
        const audit = analyzeService(file);
        results.push(audit);
    });

    // Sort by priority
    const sorted = results.sort((a, b) => {
        const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Generate report
    console.log('📊 Audit Results:\n');

    const stats = {
        totalServices: results.length,
        highPriority: results.filter(r => r.priority === 'HIGH').length,
        mediumPriority: results.filter(r => r.priority === 'MEDIUM').length,
        lowPriority: results.filter(r => r.priority === 'LOW').length,
        totalThrows: results.reduce((sum, r) => sum + r.totalThrows, 0),
        totalGeneric: results.reduce((sum, r) => sum + r.genericErrors, 0),
        totalCustom: results.reduce((sum, r) => sum + r.customErrors, 0),
    };

    console.log('Summary:');
    console.log(`  Total services: ${stats.totalServices}`);
    console.log(`  High priority: ${stats.highPriority}`);
    console.log(`  Medium priority: ${stats.mediumPriority}`);
    console.log(`  Low priority: ${stats.lowPriority}`);
    console.log(`  Total throw statements: ${stats.totalThrows}`);
    console.log(`  Generic errors: ${stats.totalGeneric}`);
    console.log(`  Custom errors: ${stats.totalCustom}\n`);

    // High priority services
    const highPriority = sorted.filter(s => s.priority === 'HIGH');
    if (highPriority.length > 0) {
        console.log('🔴 HIGH PRIORITY Services:\n');
        highPriority.forEach(service => {
            console.log(`  ${service.file}`);
            console.log(`    Throws: ${service.totalThrows} (${service.genericErrors} generic, ${service.customErrors} custom)`);
            console.log(`    Issues: ${service.issues.join(', ')}`);
            console.log('');
        });
    }

    // Medium priority services
    const mediumPriority = sorted.filter(s => s.priority === 'MEDIUM');
    if (mediumPriority.length > 0) {
        console.log('🟡 MEDIUM PRIORITY Services:\n');
        mediumPriority.slice(0, 10).forEach(service => {
            console.log(`  ${service.file}`);
            console.log(`    Throws: ${service.totalThrows} (${service.genericErrors} generic)`);
            console.log('');
        });
        if (mediumPriority.length > 10) {
            console.log(`  ... and ${mediumPriority.length - 10} more\n`);
        }
    }

    // Save detailed report
    const report = {
        generatedAt: new Date().toISOString(),
        stats,
        services: sorted,
    };

    fs.writeFileSync(
        'service-error-audit.json',
        JSON.stringify(report, null, 2)
    );

    console.log('📄 Detailed report saved to: service-error-audit.json\n');

    // Recommendations
    console.log('💡 Recommendations:\n');
    console.log(`  1. Start with ${stats.highPriority} high-priority services`);
    console.log(`  2. Replace generic Error with custom error classes`);
    console.log(`  3. Use message constants instead of hardcoded strings`);
    console.log(`  4. Add logger.error() before throwing`);
    console.log('');
}

main().catch(console.error);
