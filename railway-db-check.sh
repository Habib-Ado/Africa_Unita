#!/bin/bash

# Railway Database Check Script
echo "🔍 Checking Railway Database Status..."

# Navigate to backend directory
cd backend

# Test database connection
echo "📡 Testing database connection..."
npm run test-connection

if [ $? -eq 0 ]; then
    echo "✅ Database connection successful!"
    
    # Check if tables exist
    echo "📊 Checking database tables..."
    node -e "
    import('./database/db.js').then(async (db) => {
        try {
            const result = await db.query('SHOW TABLES');
            console.log('📋 Tables found:', result.rows.length);
            if (result.rows.length === 0) {
                console.log('❌ No tables found. Running db:setup...');
                process.exit(1);
            } else {
                console.log('✅ Database tables exist');
            }
        } catch (error) {
            console.error('❌ Error checking tables:', error.message);
            process.exit(1);
        }
    });
    "
    
    # Check if users exist
    echo "👥 Checking users..."
    node -e "
    import('./database/db.js').then(async (db) => {
        try {
            const result = await db.query('SELECT COUNT(*) as user_count FROM users');
            console.log('👤 Users found:', result.rows[0].user_count);
            if (result.rows[0].user_count === 0) {
                console.log('❌ No users found. Running db:seed...');
                process.exit(1);
            } else {
                console.log('✅ Users exist in database');
            }
        } catch (error) {
            console.error('❌ Error checking users:', error.message);
            process.exit(1);
        }
    });
    "
    
    echo "🎉 Database is ready!"
    echo "🔐 Test login with: admin@africaunita.it / password123"
    
else
    echo "❌ Database connection failed!"
    echo "🛠️ Try running: npm run railway:setup"
    exit 1
fi
