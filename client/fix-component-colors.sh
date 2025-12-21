#!/bin/bash

# Fix hardcoded colors in shared components for dark mode support
echo "🎨 Fixing hardcoded colors in components..."

cd "/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/client"

# Files to fix
files=(
  "components/shared/NotificationsDropdown.tsx"
  "components/shared/ProfileDropdown.tsx"
  "components/admin/ActivityFeed.tsx"
  "components/admin/CreateOrderModal.tsx"
  "components/admin/CreateShipmentModal.tsx"
  "components/admin/MetricCard.tsx"
  "components/admin/ChartCard.tsx"
  "components/admin/TrackingModal.tsx"
  "components/admin/ShipmentDetailModal.tsx"
  "components/admin/WalletModal.tsx"
)

# Common replacements
declare -A replacements=(
  ["text-gray-900"]="text-[var(--text-primary)]"
  ["text-gray-800"]="text-[var(--text-primary)]"
  ["text-gray-700"]="text-[var(--text-secondary)]"
  ["text-gray-600"]="text-[var(--text-secondary)]"
  ["text-gray-500"]="text-[var(--text-muted)]"
  ["text-gray-400"]="text-[var(--text-muted)]"
  ["text-gray-300"]="text-[var(--border-strong)]"
  ["bg-white"]="bg-[var(--bg-primary)]"
  ["bg-gray-50"]="bg-[var(--bg-secondary)]"
  ["bg-gray-100"]="bg-[var(--bg-tertiary)]"
  ["bg-gray-200"]="bg-[var(--bg-active)]"
  ["border-gray-50"]="border-[var(--border-subtle)]"
  ["border-gray-100"]="border-[var(--border-subtle)]"
  ["border-gray-200"]="border-[var(--border-default)]"
  ["border-gray-300"]="border-[var(--border-strong)]"
  ["hover:bg-gray-50"]="hover:bg-[var(--bg-hover)]"
  ["hover:bg-gray-100"]="hover:bg-[var(--bg-hover)]"
  ["hover:text-gray-900"]="hover:text-[var(--text-primary)]"
)

# Apply replacements
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  Fixing $file..."
    for old in "${!replacements[@]}"; do
      new="${replacements[$old]}"
      sed -i '' "s/${old}/${new}/g" "$file"
    done
  fi
done

echo "✅ Component fixes complete!"
echo ""
echo "Fixed files:"
for file in "${files[@]}"; do
  echo "  ✓ $file"
done
