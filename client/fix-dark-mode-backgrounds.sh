#!/bin/bash

# Fix all hardcoded backgrounds in dashboards for proper dark mode support
# This script systematically replaces bg-white, bg-gray-50, bg-gray-100 with CSS variables

echo "🎨 Fixing hardcoded backgrounds for dark mode support..."

# Navigate to client directory
cd "/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/client"

# Counter for changes
total_changes=0

# Fix bg-white -> bg-[var(--bg-primary)]
echo "📝 Fixing bg-white instances..."
count=$(find app/ -name "*.tsx" -o -name "*.jsx" | xargs sed -i '' 's/className="\([^"]*\)bg-white\([^"]*\)"/className="\1bg-[var(--bg-primary)]\2"/g' 2>&1 | grep -c "^" || echo 0)
echo "   Fixed $count files with bg-white"
total_changes=$((total_changes + count))

# Fix bg-gray-50 -> bg-[var(--bg-secondary)]
echo "📝 Fixing bg-gray-50 instances..."
count=$(find app/ -name "*.tsx" -o -name "*.jsx" | xargs sed -i '' 's/className="\([^"]*\)bg-gray-50\([^"]*\)"/className="\1bg-[var(--bg-secondary)]\2"/g' 2>&1 | grep -c "^" || echo 0)
echo "   Fixed $count files with bg-gray-50"
total_changes=$((total_changes + count))

# Fix bg-gray-100 -> bg-[var(--bg-tertiary)]
echo "📝 Fixing bg-gray-100 instances..."
count=$(find app/ -name "*.tsx" -o -name "*.jsx" | xargs sed -i '' 's/className="\([^"]*\)bg-gray-100\([^"]*\)"/className="\1bg-[var(--bg-tertiary)]\2"/g' 2>&1 | grep -c "^" || echo 0)
echo "   Fixed $count files with bg-gray-100"
total_changes=$((total_changes + count))

# Fix hover:bg-gray-50 -> hover:bg-[var(--bg-hover)]
echo "📝 Fixing hover:bg-gray-50 instances..."
find app/ -name "*.tsx" -o -name "*.jsx" | xargs sed -i '' 's/hover:bg-gray-50/hover:bg-[var(--bg-hover)]/g'

# Fix hover:bg-gray-100 -> hover:bg-[var(--bg-hover)]
echo "📝 Fixing hover:bg-gray-100 instances..."
find app/ -name "*.tsx" -o -name "*.jsx" | xargs sed -i '' 's/hover:bg-gray-100/hover:bg-[var(--bg-hover)]/g'

# Fix hover:bg-gray-200 -> hover:bg-[var(--bg-active)]
echo "📝 Fixing hover:bg-gray-200 instances..."
find app/ -name "*.tsx" -o -name "*.jsx" | xargs sed -i '' 's/hover:bg-gray-200/hover:bg-[var(--bg-active)]/g'

echo ""
echo "✅ Background color fixes complete!"
echo "   Total file changes: $total_changes"
echo ""
echo "🔍 Remaining instances:"
echo "   bg-white: $(grep -r 'bg-white' app/ --include='*.tsx' --include='*.jsx' | wc -l | tr -d ' ')"
echo "   bg-gray-50: $(grep -r 'bg-gray-50' app/ --include='*.tsx' --include='*.jsx' | wc -l | tr -d ' ')"
echo "   bg-gray-100: $(grep -r 'bg-gray-100' app/ --include='*.tsx' --include='*.jsx' | wc -l | tr -d ' ')"
