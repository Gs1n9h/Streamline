#!/bin/bash

# Streamline Setup Script
# This script sets up the development environment for the Streamline workforce management platform

set -e

echo "🚀 Setting up Streamline - Workforce Management Platform"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if pnpm is installed, install if not
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
else
    echo "✅ pnpm $(pnpm -v) detected"
fi

# Check if Expo CLI is installed
if ! command -v expo &> /dev/null; then
    echo "📱 Installing Expo CLI..."
    npm install -g @expo/cli
else
    echo "✅ Expo CLI detected"
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build shared types
echo "🔧 Building shared types..."
cd packages/shared-types
pnpm build
cd ../..

# Copy environment template
if [ ! -f ".env" ]; then
    echo "📝 Creating environment file..."
    cp env.example .env
    echo "⚠️  Please update .env with your Supabase credentials"
else
    echo "✅ Environment file already exists"
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p apps/web/.next
mkdir -p apps/mobile/.expo

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your Supabase credentials"
echo "2. Set up your Supabase project and run the SQL scripts:"
echo "   - packages/db/sql/01-schema.sql"
echo "   - packages/db/sql/02-rls-policies.sql"
echo "   - packages/db/sql/03-functions.sql"
echo "3. Deploy the daily report edge function:"
echo "   supabase functions deploy daily-report"
echo "4. Start development:"
echo "   pnpm dev"
echo ""
echo "For more information, see README.md"

