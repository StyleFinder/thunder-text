#!/bin/bash

echo "=== Starting build process ==="
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

echo "Installing root dependencies..."
npm install --legacy-peer-deps

echo "Building Next.js application..."
npm run build

echo "=== Build completed successfully ==="