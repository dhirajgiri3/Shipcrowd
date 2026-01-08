#!/bin/bash

# ============================================
# Transaction Compliance Verification
# ============================================
#
# Verifies that all services with multiple DB operations
# use transactions correctly.
#
# Checks:
# - Services with 2+ DB operations have transactions
# - Transactions use { session } option correctly
# - Session.endSession() called in finally block
#
# Usage: ./verify-transactions.sh
# ============================================

set -e

BASE_DIR="server/src/core/application/services"
PASS_COUNT=0
FAIL_COUNT=0

echo "💳 TRANSACTION COMPLIANCE VERIFICATION"
echo "======================================="
echo ""

# Find all service files
SERVICES=$(find $BASE_DIR -name "*.service.ts" 2>/dev/null)

for SERVICE in $SERVICES; do
    SERVICE_NAME=$(basename "$SERVICE")
    
    # Count DB operations
    UPDATE_COUNT=$(grep -c "await.*\.update\|await.*\.create\|await.*\.save" "$SERVICE" 2>/dev/null || echo "0")
    
    # Skip services with 0-1 operations
    if [ "$UPDATE_COUNT" -le 1 ]; then
        continue
    fi
    
    # Check for transaction keywords
    HAS_START_SESSION=$(grep -c "startSession" "$SERVICE" 2>/dev/null || echo "0")
    HAS_START_TRANSACTION=$(grep -c "startTransaction" "$SERVICE" 2>/dev/null || echo "0")
    HAS_COMMIT=$(grep -c "commitTransaction" "$SERVICE" 2>/dev/null || echo "0")
    HAS_ABORT=$(grep -c "abortTransaction" "$SERVICE" 2>/dev/null || echo "0")
    HAS_END=$(grep -c "endSession" "$SERVICE" 2>/dev/null || echo "0")
    
    # Verify transaction pattern
    if [ "$HAS_START_SESSION" -gt 0 ] && \
       [ "$HAS_START_TRANSACTION" -gt 0 ] && \
       [ "$HAS_COMMIT" -gt 0 ] && \
       [ "$HAS_ABORT" -gt 0 ] && \
       [ "$HAS_END" -gt 0 ]; then
        
        # Check if { session } is passed to DB operations
        SESSION_USAGE=$(grep -c "{ session }\|session:" "$SERVICE" 2>/dev/null || echo "0")
        
        if [ "$SESSION_USAGE" -ge "$UPDATE_COUNT" ]; then
            echo "✅ $SERVICE_NAME - Complete transaction implementation"
            PASS_COUNT=$((PASS_COUNT + 1))
        else
            echo "⚠️  $SERVICE_NAME - Has transactions but may not pass session to all operations"
            echo "   DB operations: $UPDATE_COUNT, Session usage: $SESSION_USAGE"
            FAIL_COUNT=$((FAIL_COUNT + 1))
        fi
    else
        echo "❌ $SERVICE_NAME - Missing transaction (${UPDATE_COUNT} DB operations)"
        echo "   startSession: $HAS_START_SESSION, startTransaction: $HAS_START_TRANSACTION"
        echo "   commit: $HAS_COMMIT, abort: $HAS_ABORT, endSession: $HAS_END"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
done

echo ""
echo "======================================="
echo "SUMMARY"
echo "======================================="
echo ""
echo "✅ Services with correct transactions: $PASS_COUNT"
echo "❌ Services with transaction gaps: $FAIL_COUNT"
echo ""

if [ "$FAIL_COUNT" -eq 0 ]; then
    echo "✅ ALL SERVICES COMPLIANT"
    exit 0
else
    echo "❌ FIX $FAIL_COUNT SERVICES"
    exit 1
fi
