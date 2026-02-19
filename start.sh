#!/bin/bash

# Railway deployment script for Africa Unita
# NIXPACKS installa già le dipendenze durante il build, quindi qui avviamo solo il server
echo "🚀 Starting Africa Unita server..."

# Navigate to backend directory
cd backend || {
    echo "❌ Error: backend directory not found"
    exit 1
}

# Start the server
echo "🌐 Starting Node.js server..."
exec npm start
