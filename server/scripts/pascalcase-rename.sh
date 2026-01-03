#!/bin/bash

# PascalCase Rename Script for Shipcrowd Server
# Converts: auth.controller.ts -> AuthController.ts
# Converts: amazon.routes.ts -> AmazonRoutes.ts

PROJECT_ROOT="/Users/dhirajgiri/Documents/Projects/Helix India/Shipcrowd/server"

echo "=== Starting PascalCase Rename ==="

# Services - rename lower.service.ts to LowerService.ts
find "$PROJECT_ROOT/src" -name "*.service.ts" | while read -r f; do
    base=$(basename "$f")
    # Skip files already in PascalCase
    if [[ "$base" =~ ^[A-Z] ]]; then
        continue
    fi
    newbase="$(echo "$base" | sed 's/\.service\.ts$//' | sed 's/[.-]/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)}1' | sed 's/ //g')Service.ts"
    if [ "$base" != "$newbase" ]; then
        newf=$(dirname "$f")/$newbase
        echo "Renaming: $f -> $newf"
        mv "$f" "$newf"
    fi
done

# Controllers - rename lower.controller.ts to LowerController.ts  
find "$PROJECT_ROOT/src" -name "*.controller.ts" | while read -r f; do
    base=$(basename "$f")
    if [[ "$base" =~ ^[A-Z] ]]; then
        continue
    fi
    newbase="$(echo "$base" | sed 's/\.controller\.ts$//' | sed 's/[.-]/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)}1' | sed 's/ //g')Controller.ts"
    if [ "$base" != "$newbase" ]; then
        newf=$(dirname "$f")/$newbase
        echo "Renaming: $f -> $newf"
        mv "$f" "$newf"
    fi
done

# Routes - rename lower.routes.ts to LowerRoutes.ts
find "$PROJECT_ROOT/src" -name "*.routes.ts" | while read -r f; do
    base=$(basename "$f")
    if [[ "$base" =~ ^[A-Z] ]]; then
        continue
    fi
    newbase="$(echo "$base" | sed 's/\.routes\.ts$//' | sed 's/[.-]/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)}1' | sed 's/ //g')Routes.ts"
    if [ "$base" != "$newbase" ]; then
        newf=$(dirname "$f")/$newbase
        echo "Renaming: $f -> $newf"
        mv "$f" "$newf"
    fi
done

# Jobs - rename lower.job.ts to LowerJob.ts
find "$PROJECT_ROOT/src" -name "*.job.ts" | while read -r f; do
    base=$(basename "$f")
    if [[ "$base" =~ ^[A-Z] ]]; then
        continue
    fi
    newbase="$(echo "$base" | sed 's/\.job\.ts$//' | sed 's/[.-]/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)}1' | sed 's/ //g')Job.ts"
    if [ "$base" != "$newbase" ]; then
        newf=$(dirname "$f")/$newbase
        echo "Renaming: $f -> $newf"
        mv "$f" "$newf"
    fi
done

echo "=== Rename Complete ==="
echo ""
echo "Next: Update all import paths in affected files"
