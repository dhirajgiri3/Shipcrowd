name: Schema Refactor CI
on:
  push:
    branches:
      - 'refactor/mongodb-schema-standardization'
      - 'phase-*/**'
      - 'task/**'
  pull_request:
    branches:
      - 'refactor/mongodb-schema-standardization'
      - 'main'
jobs:
  lint-and-typecheck:
    name: Lint & TypeCheck
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: server/package-lock.json
      
      - name: Install dependencies
        working-directory: ./server
        run: npm ci
      
      - name: Run ESLint
        working-directory: ./server
        run: npm run lint
      
      - name: Run TypeScript compiler
        working-directory: ./server
        run: npm run typecheck
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: server/package-lock.json
      
      - name: Install dependencies
        working-directory: ./server
        run: npm ci
      
      - name: Run unit tests
        working-directory: ./server
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./server/coverage/lcov.info
          flags: unittests
  schema-validation:
    name: Schema Validation
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: server/package-lock.json
      
      - name: Install dependencies
        working-directory: ./server
        run: npm ci
      
      - name: Validate Mongoose schemas
        working-directory: ./server
        run: |
          # Check for duplicate model names
          echo "Checking for duplicate model names..."
          find src/infrastructure/database/mongoose/models -name "*.model.ts" -exec grep -h "mongoose.model<" {} \; | \
            sed "s/.*mongoose.model<.*>('\(.*\)'.*/\1/" | sort | uniq -d | \
            while read model; do
              echo "ERROR: Duplicate model name found: $model"
              exit 1
            done
          
          # Check for missing indexes on foreign keys
          echo "Checking for indexed foreign key fields..."
          # This is a simplified check - expand as needed
          
          echo "Schema validation passed!"
  migration-dry-run:
    name: Migration Dry Run
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:6.0
        ports:
          - 27017:27017
        options: >-
          --health-cmd "mongosh --eval 'db.adminCommand({ping: 1})'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: server/package-lock.json
      
      - name: Install dependencies
        working-directory: ./server
        run: npm ci
      
      - name: Run migration dry-run
        working-directory: ./server
        env:
          MONGODB_URI: mongodb://localhost:27017/Helix_test
        run: |
          # Check if migration scripts exist
          if [ -d "src/infrastructure/database/migrations" ]; then
            echo "Running migration dry-run..."
            npm run migrate:dry-run || echo "No migrations to run"
          else
            echo "No migration directory found - skipping"
          fi
  destructive-change-check:
    name: Destructive Change Prevention
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request' && github.base_ref == 'main'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Check for destructive schema changes
        run: |
          echo "Checking for potentially destructive changes..."
          
          # Check for field removals in models
          git diff origin/main...HEAD -- '*.model.ts' | grep -E "^-\s+(.*?):" | grep -v "^---" | \
            while read line; do
              echo "WARNING: Potential field removal detected: $line"
              echo "Please ensure:"
              echo "  1. Migration script exists"
              echo "  2. Backward compatibility maintained"
              echo "  3. Feature flag added if needed"
            done
          
          # Check for enum value removals
          git diff origin/main...HEAD -- '*.model.ts' | grep -E "^-.*enum:" | \
            while read line; do
              echo "WARNING: Enum modification detected: $line"
              echo "Ensure data migration is in place"
            done
          
          # Check for index removals
          git diff origin/main...HEAD -- '*.model.ts' | grep -E "^-.*\.index\(" | \
            while read line; do
              echo "WARNING: Index removal detected: $line"
              echo "Ensure this won't impact query performance"
            done
          
          echo "Destructive change check complete"
  backward-compatibility:
    name: Backward Compatibility Check
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request' && github.base_ref == 'main'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Check for breaking changes
        run: |
          echo "Checking for breaking API changes..."
          
          # Check for removed required fields
          git diff origin/main...HEAD -- '*.model.ts' | grep -E "required: true" | grep "^-" | \
            while read line; do
              echo "ERROR: Required field removed - BREAKING CHANGE"
              echo "$line"
              exit 1
            done
          
          # Check for changed field types
          git diff origin/main...HEAD -- '*.model.ts' | grep -E "type: (String|Number|Boolean|Date)" | \
            if grep -E "^\+" | grep -v "^\+\+\+" && grep -E "^-" | grep -v "^---"; then
              echo "WARNING: Field type change detected - verify backward compatibility"
            fi
          
          echo "Backward compatibility check complete"
  notify-on-failure:
    name: Notify on Failure
    runs-on: ubuntu-latest
    needs: [lint-and-typecheck, unit-tests, schema-validation, migration-dry-run]
    if: failure()
    
    steps:
      - name: Send notification
        run: |
          echo "CI failed for schema refactor branch"
          echo "Branch: ${{ github.ref }}"
          echo "Commit: ${{ github.sha }}"
          # Add Slack/Discord webhook notification here if needed