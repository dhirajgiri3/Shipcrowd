#!/bin/bash
# Fix acronyms script - corrects n-d-r -> ndr, r-t-o -> rto, etc.
PROJECT_ROOT="/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/server"

echo "=== Fixing Acronyms ==="

# Define fixes as "pattern:replacement"
fixes=(
    "n-d-r:ndr"
    "r-t-o:rto"
    "c-s-v:csv"
    "p-d-f:pdf"
    "o-auth:oauth"
    "open-a-i:openai"
    "whats-app:whatsapp"
    "i-packing:packing.interface"
    "i-picking:picking.interface"
    "i-inventory:inventory.interface"
    "woo-commerce:woocommerce"
)

for fix in "${fixes[@]}"; do
    pattern="${fix%%:*}"
    replacement="${fix##*:}"
    
    find "$PROJECT_ROOT/src" -type f -name "*$pattern*" | while read -r f; do
        dir=$(dirname "$f")
        base=$(basename "$f")
        newbase=$(echo "$base" | sed "s/$pattern/$replacement/g")
        if [ "$base" != "$newbase" ]; then
            echo "  $base -> $newbase"
            mv "$f" "$dir/$newbase"
        fi
    done
done

echo ""
echo "=== Acronym Fixes Complete ==="
