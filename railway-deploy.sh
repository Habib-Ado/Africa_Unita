#!/bin/bash

echo "🚀 Deploying Africa Unita to Railway..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run database migration
echo "🗄️  Running database migration..."
cd backend
node scripts/railway-migration.js

# Start the server
echo "🚀 Starting server..."
npm start
