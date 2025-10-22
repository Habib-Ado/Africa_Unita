#!/bin/bash

# Railway Database Setup Script
echo "🚀 Setting up Africa Unita database on Railway..."

# Navigate to backend directory
cd backend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Setup database
echo "🗄️ Setting up database..."
npm run db:setup

# Seed database with test data
echo "🌱 Seeding database with test data..."
npm run db:seed

echo "✅ Database setup complete!"
echo ""
echo "🔐 Test credentials:"
echo "   Admin: admin@africaunita.it / password123"
echo "   President: president@africaunita.it / password123"
echo "   Moderator: moderator@africaunita.it / password123"
echo "   Treasurer: treasurer@africaunita.it / password123"
echo ""
echo "🎉 Your site is now ready at: https://africaunita.up.railway.app"
