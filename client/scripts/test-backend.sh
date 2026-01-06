#!/bin/bash

# ===============================================
# Frontend Authentication Testing Script
# ===============================================
# This script helps verify backend health and
# test authentication endpoints before running
# frontend tests.
# ===============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:5005/api/v1}"
BACKEND_URL="${API_URL%/api/v1}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Frontend Auth Testing - Backend Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test 1: Backend Health Check
echo -e "${YELLOW}[1/5] Testing backend health...${NC}"
if curl -s -f "${BACKEND_URL}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    echo -e "${RED}   Make sure backend is running on ${BACKEND_URL}${NC}"
    exit 1
fi
echo ""

# Test 2: CSRF Token Endpoint
echo -e "${YELLOW}[2/5] Testing CSRF token endpoint...${NC}"
CSRF_RESPONSE=$(curl -s "${API_URL}/auth/csrf-token")
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

if [ -n "$CSRF_TOKEN" ]; then
    TOKEN_LENGTH=${#CSRF_TOKEN}
    echo -e "${GREEN}✅ CSRF token received${NC}"
    echo -e "   Token length: ${TOKEN_LENGTH} (expected: 64)"
    
    if [ "$TOKEN_LENGTH" -eq 64 ]; then
        echo -e "${GREEN}   ✅ Token length is correct${NC}"
    else
        echo -e "${RED}   ❌ Token length is incorrect${NC}"
    fi
    
    # Check if token is hexadecimal
    if [[ "$CSRF_TOKEN" =~ ^[a-f0-9]{64}$ ]]; then
        echo -e "${GREEN}   ✅ Token format is valid (hexadecimal)${NC}"
    else
        echo -e "${RED}   ❌ Token format is invalid${NC}"
    fi
else
    echo -e "${RED}❌ Failed to get CSRF token${NC}"
    echo -e "   Response: ${CSRF_RESPONSE}"
    exit 1
fi
echo ""

# Test 3: Auth Me Endpoint (should return 401 when not authenticated)
echo -e "${YELLOW}[3/5] Testing /auth/me endpoint...${NC}"
AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/auth/me")

if [ "$AUTH_STATUS" -eq 401 ]; then
    echo -e "${GREEN}✅ /auth/me returns 401 (correct - not authenticated)${NC}"
elif [ "$AUTH_STATUS" -eq 200 ]; then
    echo -e "${YELLOW}⚠️  /auth/me returns 200 (user is already authenticated)${NC}"
else
    echo -e "${RED}❌ /auth/me returned unexpected status: ${AUTH_STATUS}${NC}"
fi
echo ""

# Test 4: Sessions Endpoint (should return 401 when not authenticated)
echo -e "${YELLOW}[4/5] Testing /auth/sessions endpoint...${NC}"
SESSIONS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/auth/sessions")

if [ "$SESSIONS_STATUS" -eq 401 ]; then
    echo -e "${GREEN}✅ /auth/sessions returns 401 (correct - not authenticated)${NC}"
elif [ "$SESSIONS_STATUS" -eq 200 ]; then
    echo -e "${YELLOW}⚠️  /auth/sessions returns 200 (user is already authenticated)${NC}"
else
    echo -e "${RED}❌ /auth/sessions returned unexpected status: ${SESSIONS_STATUS}${NC}"
fi
echo ""

# Test 5: Check if frontend is running
echo -e "${YELLOW}[5/5] Checking if frontend is running...${NC}"
FRONTEND_URL="http://localhost:3000"
if curl -s -f "${FRONTEND_URL}" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is running on ${FRONTEND_URL}${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend is not running${NC}"
    echo -e "   Start it with: npm run dev${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Backend verification complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Start frontend: cd client && npm run dev"
echo "2. Open browser: http://localhost:3000"
echo "3. Open DevTools Console (F12)"
echo "4. Run tests: authTests.runAllTests()"
echo ""
echo -e "${BLUE}Test user accounts:${NC}"
echo "  Admin:  admin@test.com / Admin@123456"
echo "  Seller: seller@test.com / Seller@123456"
echo "  New:    newuser@test.com / NewUser@123456"
echo ""
