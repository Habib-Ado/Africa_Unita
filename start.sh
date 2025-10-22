#!/bin/bash

# Railway deployment script for Africa Unita
echo "🚀 Starting Africa Unita deployment..."

# Navigate to backend directory
cd backend

# Remove bcrypt and install bcryptjs
echo "🔧 Fixing bcrypt compatibility..."
npm uninstall bcrypt
npm install bcryptjs

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start the server
echo "🌐 Starting server..."
npm start
