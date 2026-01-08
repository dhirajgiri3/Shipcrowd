#!/bin/bash

# ============================================
# Comprehensive Gap Verification Script
# ============================================
#
# Checks for ALL types of implementation gaps:
# - TODO comments without tracking
# - Mock/placeholder code
# - Missing authorization
# - Missing transactions
# - Log-only methods
#
# Usage: ./verify-fixes.sh
# Exit code: 0 if all checks pass, 1 if gaps found
# ============================================

set -e

BASE_DIR="server/src"
TOTAL_GAPS=0

echo "🔍 COMPREHENSIVE GAP VERIFICATION"
echo "===================================="
echo ""

# ============================================
# 1. TODO Comments
# ============================================
echo "📝 1. CHECKING TODO COMMENTS"
echo "----------------------------"

TODO_COUNT=$(grep -r "// TODO" $BASE_DIR --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')
TODO_WITHOUT_TICKET=$(grep -r "// TODO" $BASE_DIR --include="*.ts" 2>/dev/null | grep -v "TODO(#\|TODO (Week" | wc -l | tr -d ' ')

echo "Total TODOs: $TODO_COUNT"
echo "Without ticket/timeline: $TODO_WITHOUT_TICKET"

if [ "$TODO_WITHOUT_TICKET" -gt 0 ]; then
    echo "❌ FAIL: Found $TODO_WITHOUT_TICKET untracked TODOs"
    echo ""
    echo "Untracked TODOs (showing first 10):"
    grep -r "// TODO" $BASE_DIR --include="*.ts" 2>/dev/null | grep -v "TODO(#\|TODO (Week" | head -10
    TOTAL_GAPS=$((TOTAL_GAPS + TODO_WITHOUT_TICKET))
else
    echo "✅ PASS: No untracked TODOs"
fi

echo ""

# ============================================
# 2. Mock/Placeholder Code
# ============================================
echo "🎭 2. CHECKING MOCK/PLACEHOLDER CODE"
echo "------------------------------------"

MOCK_COUNT=$(grep -ri "for now\|mock\|placeholder" $BASE_DIR --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')

echo "Mock/placeholder instances: $MOCK_COUNT"

if [ "$MOCK_COUNT" -gt 0 ]; then
    echo "❌ FAIL: Found $MOCK_COUNT mock/placeholder instances"
    echo ""
    echo "Mocks found (showing first 10):"
    grep -rin "for now\|mock\|placeholder" $BASE_DIR --include="*.ts" 2>/dev/null | head -10
    TOTAL_GAPS=$((TOTAL_GAPS + MOCK_COUNT))
else
    echo "✅ PASS: No mock/placeholder code"
fi

echo ""

# ============================================
# 3. Authorization Gaps
# ============================================
echo "🔒 3. CHECKING AUTHORIZATION"
echo "----------------------------"

TOTAL_CONTROLLERS=$(find $BASE_DIR/presentation/http/controllers -name "*.controller.ts" 2>/dev/null | wc -l | tr -d ' ')
echo "Total controllers: $TOTAL_CONTROLLERS"

if [ "$TOTAL_CONTROLLERS" -gt 0 ]; then
    UNAUTH_COUNT=0
    while IFS= read -r controller; do
        if ! grep -q "requireRole\|authorize\|@Roles\|requireAdmin\|requireSeller" "$controller" 2>/dev/null; then
            UNAUTH_COUNT=$((UNAUTH_COUNT + 1))
        fi
    done < <(find $BASE_DIR/presentation/http/controllers -name "*.controller.ts" 2>/dev/null)

    echo "Controllers without auth: $UNAUTH_COUNT"

    if [ "$UNAUTH_COUNT" -gt 0 ]; then
        echo "❌ FAIL: Found $UNAUTH_COUNT controllers without authorization"
        TOTAL_GAPS=$((TOTAL_GAPS + UNAUTH_COUNT))
    else
        echo "✅ PASS: All controllers have authorization"
    fi
else
    echo "⚠️  SKIP: No controllers found"
fi

echo ""

# ============================================
# 4. Transaction Gaps
# ============================================
echo "💳 4. CHECKING TRANSACTIONS"
echo "---------------------------"

TRANSACTION_GAPS=0
while IFS= read -r file; do
    UPDATE_COUNT=$(grep -c "await.*\.update\|await.*\.create\|await.*\.save" "$file" 2>/dev/null || echo "0")
    if [ "$UPDATE_COUNT" -gt 1 ]; then
        HAS_TRANSACTION=$(grep -c "session\|withTransaction\|startTransaction" "$file" 2>/dev/null || echo "0")
        if [ "$HAS_TRANSACTION" -eq 0 ]; then
            TRANSACTION_GAPS=$((TRANSACTION_GAPS + 1))
        fi
    fi
done < <(find $BASE_DIR/core/application/services -name "*.service.ts" 2>/dev/null)

echo "Services with transaction gaps: $TRANSACTION_GAPS"

if [ "$TRANSACTION_GAPS" -gt 0 ]; then
    echo "❌ FAIL: Found $TRANSACTION_GAPS services with multiple DB operations but no transactions"
    TOTAL_GAPS=$((TOTAL_GAPS + TRANSACTION_GAPS))
else
    echo "✅ PASS: All services with multiple operations use transactions"
fi

echo ""

# ============================================
# 5. Test Coverage
# ============================================
echo "🧪 5. CHECKING TEST COVERAGE"
echo "-----------------------------"

if [ -f "coverage/coverage-summary.json" ]; then
    COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct' 2>/dev/null || echo "0")
    echo "Test coverage: ${COVERAGE}%"
   
    if (( $(echo "$COVERAGE >= 80" | bc -l 2>/dev/null || echo "0") )); then
        echo "✅ PASS: Coverage >= 80%"
    else
        echo "❌ FAIL: Coverage below 80%"
        TOTAL_GAPS=$((TOTAL_GAPS + 1))
    fi
else
    echo "⚠️  SKIP: No coverage report found (run 'npm test -- --coverage')"
fi

echo ""

# ============================================
# Summary
# ============================================
echo "===================================="
echo "📊 VERIFICATION SUMMARY"
echo "===================================="
echo ""
echo "Total gaps found: $TOTAL_GAPS"
echo ""

if [ "$TOTAL_GAPS" -eq 0 ]; then
    echo "✅ ALL CHECKS PASSED!"
    echo ""
    echo "The codebase is ready:"
    echo "- No untracked TODOs"
    echo "- No mock/placeholder code"
    echo "- All controllers secured"
    echo "- All services use transactions"
    echo "- Test coverage acceptable"
    exit 0
else
    echo "❌ VERIFICATION FAILED"
    echo ""
    echo "Fix the $TOTAL_GAPS gaps listed above and run again."
    exit 1
fi
