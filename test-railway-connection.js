// Test Railway Connection with specific DATABASE_URL
import mysql from 'mysql2/promise';

async function testRailwayConnection() {
    let connection;
    
    try {
        console.log('🔍 Testing Railway Database Connection...');
        console.log('');

        // DATABASE_URL specifico di Railway
        const databaseUrl = 'mysql://root:SLBQYMBhSReyvReKHdgozPCzQrEAKqyx@hopper.proxy.rlwy.net:38226/railway';
        
        console.log('📡 Database URL:');
        console.log(`   Host: hopper.proxy.rlwy.net`);
        console.log(`   Port: 38226`);
        console.log(`   Database: railway`);
        console.log(`   User: root`);
        console.log('');

        // Test connessione diretta
        console.log('🔌 Testing direct connection...');
        connection = await mysql.createConnection({
            uri: databaseUrl,
            ssl: false
        });
        console.log('✅ Connected to Railway database successfully!');

        // Test query
        console.log('📊 Testing database query...');
        const [result] = await connection.execute('SELECT NOW() as current_time');
        console.log(`✅ Database query successful: ${result[0].current_time}`);

        // Verifica tabelle
        console.log('📋 Checking database tables...');
        const [tables] = await connection.execute('SHOW TABLES');
        console.log(`📊 Total tables: ${tables.length}`);
        
        if (tables.length > 0) {
            console.log('📋 Tables found:');
            tables.forEach(table => {
                console.log(`   - ${Object.values(table)[0]}`);
            });
        }

        // Verifica utenti
        console.log('👥 Checking users...');
        const [users] = await connection.execute('SELECT COUNT(*) as user_count FROM users');
        console.log(`📊 Total users: ${users[0].user_count}`);

        console.log('');
        console.log('🎉 Railway database connection is working!');
        console.log('💡 The issue is that DATABASE_URL is not being read by the application');
        console.log('🛠️ Solution: Add DATABASE_URL to Railway dashboard variables');
        
    } catch (error) {
        console.error('❌ Error connecting to Railway database:', error.message);
        console.log('');
        console.log('🛠️ Troubleshooting:');
        console.log('1. Check if Railway service is running');
        console.log('2. Verify the DATABASE_URL is correct');
        console.log('3. Check Railway logs for errors');
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testRailwayConnection();
