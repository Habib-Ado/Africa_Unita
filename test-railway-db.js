// Test Railway Database Connection
import mysql from 'mysql2/promise';

async function testRailwayDatabase() {
    let connection;
    
    try {
        console.log('🔍 Testing Railway Database Connection...');
        console.log('');
        
        // DATABASE_URL di Railway
        const databaseUrl = 'mysql://root:SLBQYMBhSReyvReKHdgozPCzQrEAKqyx@hopper.proxy.rlwy.net:38226/railway';
        
        console.log('📡 Database URL:');
        console.log(`   Host: hopper.proxy.rlwy.net`);
        console.log(`   Port: 38226`);
        console.log(`   Database: railway`);
        console.log(`   User: root`);
        console.log('');

        // Connessione al database Railway
        connection = await mysql.createConnection({
            uri: databaseUrl,
            ssl: false
        });
        console.log('✅ Connected to Railway database successfully!');

        // Test query - verifica utenti
        console.log('👥 Checking users in database...');
        const [users] = await connection.execute('SELECT COUNT(*) as user_count FROM users');
        console.log(`📊 Total users: ${users[0].user_count}`);

        // Verifica utente admin
        const [adminUsers] = await connection.execute(
            'SELECT username, email, role, status FROM users WHERE email = ?',
            ['admin@africaunita.it']
        );

        if (adminUsers.length > 0) {
            const admin = adminUsers[0];
            console.log('✅ Admin user found:');
            console.log(`   Username: ${admin.username}`);
            console.log(`   Email: ${admin.email}`);
            console.log(`   Role: ${admin.role}`);
            console.log(`   Status: ${admin.status}`);
            
            // Verifica se status è attivo
            if (admin.status === 'active') {
                console.log('✅ Admin user is ACTIVE - login should work!');
            } else {
                console.log(`⚠️  Admin user status is ${admin.status} - needs to be 'active'`);
            }
        } else {
            console.log('❌ Admin user not found');
            console.log('💡 You may need to create admin user or check email');
        }

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

        console.log('');
        console.log('🎉 Railway database is working correctly!');
        console.log('🔐 You can now test login with: admin@africaunita.it / password123');
        
    } catch (error) {
        console.error('❌ Error connecting to Railway database:', error.message);
        console.log('');
        console.log('🛠️ Troubleshooting:');
        console.log('1. Check if Railway service is running');
        console.log('2. Verify DATABASE_URL is correct');
        console.log('3. Check Railway logs for errors');
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testRailwayDatabase();
