#!/bin/bash

# Railway deployment script for Africa Unita
echo "🚀 Starting Africa Unita deployment..."

# Navigate to backend directory
cd backend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start the server
echo "🌐 Starting server..."
npm start
