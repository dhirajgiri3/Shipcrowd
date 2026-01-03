#!/bin/bash

# Dot-Case Rename Script for Shipcrowd Server
# Converts PascalCase files to dot-case format:
# - RTOService.ts -> rto.service.ts
# - AmazonOrderSyncJob.ts -> amazon-order-sync.job.ts
# - User.ts -> user.model.ts (for models)

PROJECT_ROOT="/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/server"
MODELS_DIR="$PROJECT_ROOT/src/infrastructure/database/mongoose/models"

# Function to convert PascalCase to kebab-case
pascal_to_kebab() {
    echo "$1" | sed 's/\([A-Z]\)/-\1/g' | sed 's/^-//' | tr '[:upper:]' '[:lower:]'
}

echo "=== Starting Dot-Case Rename ==="
echo ""

# ==========================================
# 1. Rename Models: User.ts -> user.model.ts
# ==========================================
echo "--- Renaming Models ---"
find "$MODELS_DIR" -maxdepth 1 -name "*.ts" -type f | while read -r f; do
    base=$(basename "$f")
    # Skip index.ts and already dot-case files
    if [ "$base" = "index.ts" ] || [[ "$base" == *.model.ts ]]; then
        continue
    fi
    # Convert PascalCase to kebab-case and add .model suffix
    name=$(echo "$base" | sed 's/\.ts$//')
    newname="$(pascal_to_kebab "$name").model.ts"
    if [ "$base" != "$newname" ]; then
        echo "  $base -> $newname"
        mv "$f" "$MODELS_DIR/$newname"
    fi
done

# ==========================================
# 2. Rename Services: RTOService.ts -> rto.service.ts
# ==========================================
echo ""
echo "--- Renaming Services ---"
find "$PROJECT_ROOT/src" -name "*Service.ts" -type f | while read -r f; do
    base=$(basename "$f")
    dir=$(dirname "$f")
    # Skip if already dot-case
    if [[ "$base" == *.service.ts ]]; then
        continue
    fi
    # Remove 'Service' suffix and convert
    name=$(echo "$base" | sed 's/Service\.ts$//')
    newname="$(pascal_to_kebab "$name").service.ts"
    if [ "$base" != "$newname" ]; then
        echo "  $base -> $newname"
        mv "$f" "$dir/$newname"
    fi
done

# ==========================================
# 3. Rename Jobs: AmazonOrderSyncJob.ts -> amazon-order-sync.job.ts
# ==========================================
echo ""
echo "--- Renaming Jobs ---"
find "$PROJECT_ROOT/src" -name "*Job.ts" -type f | while read -r f; do
    base=$(basename "$f")
    dir=$(dirname "$f")
    if [[ "$base" == *.job.ts ]]; then
        continue
    fi
    name=$(echo "$base" | sed 's/Job\.ts$//')
    newname="$(pascal_to_kebab "$name").job.ts"
    if [ "$base" != "$newname" ]; then
        echo "  $base -> $newname"
        mv "$f" "$dir/$newname"
    fi
done

# ==========================================
# 4. Rename Controllers: AddressUpdateController.ts -> address-update.controller.ts
# ==========================================
echo ""
echo "--- Renaming Controllers ---"
find "$PROJECT_ROOT/src" -name "*Controller.ts" -type f | while read -r f; do
    base=$(basename "$f")
    dir=$(dirname "$f")
    if [[ "$base" == *.controller.ts ]]; then
        continue
    fi
    name=$(echo "$base" | sed 's/Controller\.ts$//')
    newname="$(pascal_to_kebab "$name").controller.ts"
    if [ "$base" != "$newname" ]; then
        echo "  $base -> $newname"
        mv "$f" "$dir/$newname"
    fi
done

# ==========================================
# 5. Rename Clients: AmazonClient.ts -> amazon.client.ts
# ==========================================
echo ""
echo "--- Renaming Clients ---"
find "$PROJECT_ROOT/src" -name "*Client.ts" -type f | while read -r f; do
    base=$(basename "$f")
    dir=$(dirname "$f")
    if [[ "$base" == *.client.ts ]]; then
        continue
    fi
    name=$(echo "$base" | sed 's/Client\.ts$//')
    newname="$(pascal_to_kebab "$name").client.ts"
    if [ "$base" != "$newname" ]; then
        echo "  $base -> $newname"
        mv "$f" "$dir/$newname"
    fi
done

# ==========================================
# 6. Rename Other PascalCase files
# ==========================================
echo ""
echo "--- Renaming Other PascalCase Files ---"

# Adapters
find "$PROJECT_ROOT/src" -name "*Adapter.ts" -type f | while read -r f; do
    base=$(basename "$f")
    dir=$(dirname "$f")
    name=$(echo "$base" | sed 's/Adapter\.ts$//')
    newname="$(pascal_to_kebab "$name").adapter.ts"
    if [ "$base" != "$newname" ]; then
        echo "  $base -> $newname"
        mv "$f" "$dir/$newname"
    fi
done

# Factories
find "$PROJECT_ROOT/src" -name "*Factory.ts" -type f | while read -r f; do
    base=$(basename "$f")
    dir=$(dirname "$f")
    name=$(echo "$base" | sed 's/Factory\.ts$//')
    newname="$(pascal_to_kebab "$name").factory.ts"
    if [ "$base" != "$newname" ]; then
        echo "  $base -> $newname"
        mv "$f" "$dir/$newname"
    fi
done

# Listeners
find "$PROJECT_ROOT/src" -name "*Listener.ts" -type f | while read -r f; do
    base=$(basename "$f")
    dir=$(dirname "$f")
    name=$(echo "$base" | sed 's/Listener\.ts$//')
    newname="$(pascal_to_kebab "$name").listener.ts"
    if [ "$base" != "$newname" ]; then
        echo "  $base -> $newname"
        mv "$f" "$dir/$newname"
    fi
done

# Types files
find "$PROJECT_ROOT/src" -name "*Types.ts" -type f | while read -r f; do
    base=$(basename "$f")
    dir=$(dirname "$f")
    name=$(echo "$base" | sed 's/Types\.ts$//')
    newname="$(pascal_to_kebab "$name").types.ts"
    if [ "$base" != "$newname" ]; then
        echo "  $base -> $newname"
        mv "$f" "$dir/$newname"
    fi
done

# Error classes
find "$PROJECT_ROOT/src" -name "*Error.ts" -type f | while read -r f; do
    base=$(basename "$f")
    dir=$(dirname "$f")
    name=$(echo "$base" | sed 's/Error\.ts$//')
    newname="$(pascal_to_kebab "$name").error.ts"
    if [ "$base" != "$newname" ]; then
        echo "  $base -> $newname"
        mv "$f" "$dir/$newname"
    fi
done

# Usecases
find "$PROJECT_ROOT/src" -name "*.usecase.ts" -type f | while read -r f; do
    base=$(basename "$f")
    dir=$(dirname "$f")
    # LoginUser.usecase.ts -> login-user.usecase.ts
    name=$(echo "$base" | sed 's/\.usecase\.ts$//')
    newname="$(pascal_to_kebab "$name").usecase.ts"
    if [ "$base" != "$newname" ]; then
        echo "  $base -> $newname"
        mv "$f" "$dir/$newname"
    fi
done

# Entities
find "$PROJECT_ROOT/src" -name "*.entity.ts" -type f | while read -r f; do
    base=$(basename "$f")
    dir=$(dirname "$f")
    name=$(echo "$base" | sed 's/\.entity\.ts$//')
    newname="$(pascal_to_kebab "$name").entity.ts"
    if [ "$base" != "$newname" ]; then
        echo "  $base -> $newname"
        mv "$f" "$dir/$newname"
    fi
done

# Remaining PascalCase files in specific directories
for pattern in Auth Mapper Manager Provider; do
    find "$PROJECT_ROOT/src" -name "*$pattern.ts" -type f | while read -r f; do
        base=$(basename "$f")
        dir=$(dirname "$f")
        if [[ "$base" =~ \. ]]; then
            continue  # Skip already dot-cased
        fi
        suffix=$(echo "$pattern" | tr '[:upper:]' '[:lower:]')
        name=$(echo "$base" | sed "s/$pattern\.ts$//")
        newname="$(pascal_to_kebab "$name").$suffix.ts"
        if [ "$base" != "$newname" ]; then
            echo "  $base -> $newname"
            mv "$f" "$dir/$newname"
        fi
    done
done

echo ""
echo "=== Rename Complete ==="
echo ""
echo "Next steps:"
echo "1. Update all import paths"
echo "2. Update index.ts barrel exports"
echo "3. Verify TypeScript compilation"
