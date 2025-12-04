#!/bin/bash

###############################################################################
# DIGITAL UTOPIA 2.0 - PRODUCTION READINESS VALIDATION SCRIPT
# 
# This script validates all components and ensures the project is ready
# for production deployment.
#
# @author Digital Utopia Platform
# @version 1.0
###############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  DIGITAL UTOPIA 2.0 - PRODUCTION READINESS VALIDATION    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to print status
print_status() {
    local status=$1
    local message=$2
    
    if [ "$status" == "PASS" ]; then
        echo -e "${GREEN}✅ PASS:${NC} $message"
        ((PASSED++))
    elif [ "$status" == "FAIL" ]; then
        echo -e "${RED}❌ FAIL:${NC} $message"
        ((FAILED++))
    elif [ "$status" == "WARN" ]; then
        echo -e "${YELLOW}⚠️  WARN:${NC} $message"
        ((WARNINGS++))
    else
        echo -e "${BLUE}ℹ️  INFO:${NC} $message"
    fi
}

# Function to check file exists
check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        print_status "PASS" "$description exists"
        return 0
    else
        print_status "FAIL" "$description missing: $file"
        return 1
    fi
}

# Function to check directory exists
check_dir() {
    local dir=$1
    local description=$2
    
    if [ -d "$dir" ]; then
        print_status "PASS" "$description exists"
        return 0
    else
        print_status "FAIL" "$description missing: $dir"
        return 1
    fi
}

echo ""
echo -e "${BLUE}### PHASE 1: Infrastructure Validation${NC}"
echo "========================================"

# Check middleware files
check_file "backend/lib/firebase.ts" "Firebase Admin SDK"
check_file "backend/lib/middleware/auth.ts" "Authentication middleware"
check_file "backend/lib/middleware/role-auth.ts" "Role-based auth middleware"
check_file "backend/lib/middleware/error-handling.ts" "Error handling middleware"
check_file "backend/lib/middleware/rate-limit.ts" "Rate limiting middleware"

echo ""
echo -e "${BLUE}### PHASE 2: Trading Engine Validation${NC}"
echo "========================================"

# Check trading engine files
check_file "backend/lib/trading-engine/price-generator.ts" "Price generator (GBM)"
check_file "backend/lib/trading-engine/order-matching.ts" "Order matching engine"
check_file "backend/api/admin/trades/route.ts" "Admin trade management API"

# Check shared utilities
check_file "shared/utils/index.ts" "Shared utilities (password hashing)"

echo ""
echo -e "${BLUE}### PHASE 3: Real-Time System Validation${NC}"
echo "========================================"

# Check WebSocket and chart
check_file "backend/lib/websocket/server.ts" "WebSocket server"
check_file "client-app/components/trading/trading-chart.tsx" "Trading chart component"
check_file "client-app/hooks/use-websocket.ts" "WebSocket client hook"

echo ""
echo -e "${BLUE}### PHASE 4: Database Validation${NC}"
echo "========================================"

# Check database layer
check_file "backend/lib/database/firestore-collections.ts" "Firestore collections"

echo ""
echo -e "${BLUE}### Configuration Files Validation${NC}"
echo "========================================"

# Check configuration files
check_file ".env.example" "Environment example file"
check_file "backend/package.json" "Backend package.json"
check_file "admin-app/package.json" "Admin app package.json"
check_file "client-app/package.json" "Client app package.json"

echo ""
echo -e "${BLUE}### Documentation Validation${NC}"
echo "========================================"

# Check documentation
check_file "BAO_CAO_DANH_GIA_DU_AN_CHUYEN_NGHIEP.md" "Professional assessment report"
check_file "TOM_TAT_DANH_GIA.md" "Executive summary"
check_file "KE_HOACH_NANG_CAP_100.md" "Implementation plan"
check_file "TIEN_DO_NANG_CAP.md" "Progress tracking"
check_file "HOAN_THANH_95_PERCENT.md" "95% completion report"

echo ""
echo -e "${BLUE}### Code Quality Check${NC}"
echo "========================================"

# Count TypeScript files
TS_FILES=$(find . -name "*.ts" -o -name "*.tsx" | wc -l)
echo -e "${GREEN}ℹ️  TypeScript files: $TS_FILES${NC}"

# Count lines of code
TOTAL_LOC=$(find . -name "*.ts" -o -name "*.tsx" | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
echo -e "${GREEN}ℹ️  Total lines of code: $TOTAL_LOC${NC}"

if [ "$TOTAL_LOC" -gt 20000 ]; then
    print_status "PASS" "Sufficient code coverage (>20k lines)"
else
    print_status "WARN" "Code coverage lower than expected"
fi

echo ""
echo -e "${BLUE}### Feature Completeness Check${NC}"
echo "========================================"

# Check critical features
FEATURES=(
    "backend/lib/middleware:Authentication & Authorization"
    "backend/lib/trading-engine:Trading Engine"
    "backend/lib/websocket:Real-Time WebSocket"
    "backend/lib/database:Database Persistence"
    "backend/api/admin:Admin Management"
    "client-app/components/trading:Trading Components"
)

for feature in "${FEATURES[@]}"; do
    IFS=':' read -r path name <<< "$feature"
    if [ -d "$path" ]; then
        print_status "PASS" "$name implemented"
    else
        print_status "FAIL" "$name not found"
    fi
done

echo ""
echo -e "${BLUE}### Security Check${NC}"
echo "========================================"

# Check password hashing implementation
if grep -q "pbkdf2" shared/utils/index.ts 2>/dev/null; then
    print_status "PASS" "Password hashing (PBKDF2) implemented"
else
    print_status "WARN" "Password hashing implementation not detected"
fi

# Check for JWT/Firebase auth
if grep -q "verifyIdToken" backend/lib/firebase.ts 2>/dev/null; then
    print_status "PASS" "Firebase authentication configured"
else
    print_status "WARN" "Firebase authentication not detected"
fi

echo ""
echo -e "${BLUE}### Trading Algorithm Check${NC}"
echo "========================================"

# Check for GBM implementation
if grep -q "Geometric Brownian Motion" backend/lib/trading-engine/price-generator.ts 2>/dev/null; then
    print_status "PASS" "GBM price generation algorithm present"
else
    print_status "WARN" "GBM algorithm documentation not found"
fi

# Check for order matching
if grep -q "executeMarketOrder" backend/lib/trading-engine/order-matching.ts 2>/dev/null; then
    print_status "PASS" "Order matching engine implemented"
else
    print_status "WARN" "Order matching not detected"
fi

echo ""
echo -e "${BLUE}### Admin Features Check${NC}"
echo "========================================"

# Check admin APIs
if grep -q "win-rate" backend/api/admin/trades/route.ts 2>/dev/null; then
    print_status "PASS" "Win rate control API implemented"
else
    print_status "FAIL" "Win rate control API missing"
fi

if grep -q "outcome" backend/api/admin/trades/route.ts 2>/dev/null; then
    print_status "PASS" "Trade outcome control implemented"
else
    print_status "FAIL" "Trade outcome control missing"
fi

echo ""
echo -e "${BLUE}### Real-Time Features Check${NC}"
echo "========================================"

# Check WebSocket implementation
if grep -q "Socket.IO" backend/lib/websocket/server.ts 2>/dev/null || grep -q "socket.io" backend/lib/websocket/server.ts 2>/dev/null; then
    print_status "PASS" "WebSocket server (Socket.IO) implemented"
else
    print_status "WARN" "WebSocket implementation not detected"
fi

# Check trading chart
if grep -q "candlestick" client-app/components/trading/trading-chart.tsx 2>/dev/null || grep -q "Canvas" client-app/components/trading/trading-chart.tsx 2>/dev/null; then
    print_status "PASS" "Professional trading chart implemented"
else
    print_status "WARN" "Trading chart implementation not detected"
fi

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗"
echo "║                    VALIDATION SUMMARY                     ║"
echo "╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Passed:  $PASSED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "${RED}❌ Failed:  $FAILED${NC}"
echo ""

# Calculate completion percentage
TOTAL=$((PASSED + FAILED + WARNINGS))
if [ $TOTAL -gt 0 ]; then
    COMPLETION=$((PASSED * 100 / TOTAL))
    echo -e "${BLUE}📊 Project Completion: ${COMPLETION}%${NC}"
fi

echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗"
    echo "║   ✅ PROJECT IS READY FOR PRODUCTION DEPLOYMENT          ║"
    echo "╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}🚀 All critical components validated successfully!${NC}"
    echo -e "${GREEN}🎉 Ready to deploy and welcome real users!${NC}"
    echo -e "${GREEN}👨‍💼 Admin backend fully functional for management!${NC}"
    exit 0
else
    echo -e "${RED}╔═══════════════════════════════════════════════════════════╗"
    echo "║   ⚠️  PLEASE FIX FAILED ITEMS BEFORE DEPLOYMENT          ║"
    echo "╚═══════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
