#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "🚀 Installing dependencies..."
pnpm install

echo "📦 Building TypeScript..."
pnpm run build

echo "🛠 Generating Prisma client..."
npx prisma generate

echo "🗄 Deploying Prisma migrations..."
npx prisma migrate deploy

echo "✅ Render predeploy completed."
