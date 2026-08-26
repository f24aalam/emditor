#!/bin/bash
# Script to build a .deb package for Emditor on Linux

echo "Starting Emditor .deb package build..."

# Ensure we are in the project root (where this script is located)
cd "$(dirname "$0")"

# Install frontend dependencies if they are missing
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Run the Tauri build command targeting only the 'deb' bundle
# We use npx to ensure we use the local @tauri-apps/cli
echo "Running Tauri build..."
npx tauri build --bundles deb

if [ $? -eq 0 ]; then
    echo "========================================="
    echo "Build successful!"
    echo "Your .deb package is located in:"
    echo "src-tauri/target/release/bundle/deb/"
    echo "========================================="
else
    echo "========================================="
    echo "Build failed!"
    echo "Please ensure you have all Tauri Linux prerequisites installed."
    echo "Reference: https://tauri.app/start/prerequisites/"
    echo "========================================="
    exit 1
fi
