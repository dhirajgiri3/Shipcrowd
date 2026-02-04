#!/bin/bash

# Delhivery B2C Integration Test Suite Runner
# This script runs all Delhivery tests with proper environment setup

echo "╔════════════════════════════════════════════════════════════╗"
echo "║      Delhivery B2C Courier Integration Test Suite         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Load .env file if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Determine Base URL - Default to STAGING for safety
if [ -z "$DELHIVERY_BASE_URL" ]; then
    # Default to STAGING (safer for testing)
    export DELHIVERY_BASE_URL="https://staging-express.delhivery.com"
    echo -e "${GREEN}ℹ️  No DELHIVERY_BASE_URL set, defaulting to STAGING${NC}"
fi


echo "Environment Configuration:"
echo "  Base URL: $DELHIVERY_BASE_URL"
echo "  Allow Mutations: ${DELHIVERY_ALLOW_MUTATIONS:-false}"

if [[ "$DELHIVERY_BASE_URL" == *"track.delhivery.com"* ]]; then
    echo -e "${YELLOW}⚠️  WARNING: Running against PRODUCTION environment.${NC}"
    echo "  Shipment creation tests will generate REAL shipments if enabled."
    if [ "$DELHIVERY_ALLOW_MUTATIONS" = "true" ]; then
        echo -e "${RED}⚠️  Mutating tests are ENABLED against PRODUCTION.${NC}"
        echo "  Proceed only if you intend to create/cancel/update real shipments."
    fi
else
    echo -e "${GREEN}✅ Running against STAGING environment.${NC}"
fi

# Run Unit Tests
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Running Unit Tests...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npm test -- tests/unit/delhivery

UNIT_EXIT_CODE=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $UNIT_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Unit Tests: PASSED${NC}"
else
    echo -e "${RED}❌ Unit Tests: FAILED${NC}"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if integration tests should run
if [ "$RUN_DELHIVERY_LIVE" = "true" ]; then
    echo -e "${YELLOW}Running Integration Tests (Live API)...${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Validate required environment variables
    if [ -z "$DELHIVERY_API_TOKEN" ]; then
        echo -e "${RED}❌ DELHIVERY_API_TOKEN is not set${NC}"
        exit 1
    fi
    
    if [ -z "$DELHIVERY_TEST_ORIGIN_PIN" ]; then
        echo -e "${YELLOW}⚠️  DELHIVERY_TEST_ORIGIN_PIN not set, using default: 110001${NC}"
        export DELHIVERY_TEST_ORIGIN_PIN=110001
    fi
    
    if [ -z "$DELHIVERY_TEST_DEST_PIN" ]; then
        echo -e "${YELLOW}⚠️  DELHIVERY_TEST_DEST_PIN not set, using default: 400001${NC}"
        export DELHIVERY_TEST_DEST_PIN=400001
    fi
    
    # Run integration tests
    npm test -- tests/integration/delhivery
    
    INTEGRATION_EXIT_CODE=$?
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ $INTEGRATION_EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}✅ Integration Tests: PASSED${NC}"
    else
        echo -e "${RED}❌ Integration Tests: FAILED${NC}"
    fi
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}⏭️  Integration Tests: SKIPPED${NC}"
    echo ""
    echo "To run integration tests, set:"
    echo "  export RUN_DELHIVERY_LIVE=true"
    echo "  export DELHIVERY_API_TOKEN=<your_token>"
    echo "  export DELHIVERY_BASE_URL=<https://track.delhivery.com OR https://staging-express.delhivery.com>"
    echo "  export DELHIVERY_TEST_ORIGIN_PIN=<origin_pincode>"
    echo "  export DELHIVERY_TEST_DEST_PIN=<destination_pincode>"
    echo "  export DELHIVERY_TEST_TRACKING_AWB=<awb_for_tracking> (optional)"
    echo "  export DELHIVERY_TEST_POD_AWB=<awb_for_pod> (optional)"
    echo "  export DELHIVERY_ALLOW_MUTATIONS=true (optional, required for create/cancel/update/pickup)"
    echo "  export DELHIVERY_TEST_PICKUP_LOCATION=<warehouse_name> (optional, with mutations)"
    echo "  export DELHIVERY_TEST_PICKUP_DATE=YYYY-MM-DD (optional, with mutations)"
    echo "  export DELHIVERY_TEST_PICKUP_TIME=HH:MM (24h) (optional, with mutations)"
    echo "  export DELHIVERY_TEST_CANCEL_AWB=<awb_to_cancel> (optional, with mutations)"
    echo "  export DELHIVERY_TEST_ADDRESS_AWB=<awb_for_address_update> (optional, with mutations)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    INTEGRATION_EXIT_CODE=0
fi

echo ""
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                     Test Summary                           ║"
echo "╚════════════════════════════════════════════════════════════╝"

if [ $UNIT_EXIT_CODE -eq 0 ]; then
    echo -e "  Unit Tests:        ${GREEN}✅ PASSED${NC}"
else
    echo -e "  Unit Tests:        ${RED}❌ FAILED${NC}"
fi

if [ "$RUN_DELHIVERY_LIVE" = "true" ]; then
    if [ $INTEGRATION_EXIT_CODE -eq 0 ]; then
        echo -e "  Integration Tests: ${GREEN}✅ PASSED${NC}"
    else
        echo -e "  Integration Tests: ${RED}❌ FAILED${NC}"
    fi
else
    echo -e "  Integration Tests: ${YELLOW}⏭️  SKIPPED${NC}"
fi

echo ""

# Exit with error if any test failed
if [ $UNIT_EXIT_CODE -ne 0 ] || ([ "$RUN_DELHIVERY_LIVE" = "true" ] && [ $INTEGRATION_EXIT_CODE -ne 0 ]); then
    exit 1
fi

exit 0
