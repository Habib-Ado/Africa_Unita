// Setup Railway Environment Variables
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

async function setupRailwayEnvironment() {
    let connection;
    
    try {
        console.log('🚀 Setting up Railway Environment...');
        console.log('');
        
        // DATABASE_URL di Railway
        const databaseUrl = 'mysql://root:SLBQYMBhSReyvReKHdgozPCzQrEAKqyx@hopper.proxy.rlwy.net:38226/railway';
        
        // Connessione al database Railway
        connection = await mysql.createConnection({
            uri: databaseUrl,
            ssl: false
        });
        console.log('✅ Connected to Railway database');

        // 1. Verifica se admin esiste
        console.log('👤 Checking admin user...');
        const [adminUsers] = await connection.execute(
            'SELECT id, username, email, role, status FROM users WHERE email = ?',
            ['admin@africaunita.it']
        );

        if (adminUsers.length === 0) {
            console.log('❌ Admin user not found. Creating admin user...');
            
            // Crea utente admin
            const passwordHash = await bcrypt.hash('password123', 12);
            await connection.execute(
                `INSERT INTO users (username, email, password_hash, first_name, last_name, role, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['admin', 'admin@africaunita.it', passwordHash, 'Admin', 'Sistema', 'admin', 'active']
            );
            console.log('✅ Admin user created');
        } else {
            const admin = adminUsers[0];
            console.log('✅ Admin user found');
            console.log(`   Username: ${admin.username}`);
            console.log(`   Email: ${admin.email}`);
            console.log(`   Role: ${admin.role}`);
            console.log(`   Status: ${admin.status}`);
            
            // Fix status se necessario
            if (admin.status !== 'active') {
                console.log('🔧 Fixing admin status...');
                await connection.execute(
                    'UPDATE users SET status = ? WHERE email = ?',
                    ['active', 'admin@africaunita.it']
                );
                console.log('✅ Admin status updated to active');
            }
            
            // Fix role se necessario
            if (admin.role !== 'admin') {
                console.log('🔧 Fixing admin role...');
                await connection.execute(
                    'UPDATE users SET role = ? WHERE email = ?',
                    ['admin', 'admin@africaunita.it']
                );
                console.log('✅ Admin role updated to admin');
            }
            
            // Reset password
            console.log('🔑 Resetting admin password...');
            const passwordHash = await bcrypt.hash('password123', 12);
            await connection.execute(
                'UPDATE users SET password_hash = ? WHERE email = ?',
                [passwordHash, 'admin@africaunita.it']
            );
            console.log('✅ Admin password reset to password123');
        }

        // 2. Verifica finale
        console.log('📋 Final admin user status:');
        const [finalAdmin] = await connection.execute(
            'SELECT username, email, role, status FROM users WHERE email = ?',
            ['admin@africaunita.it']
        );

        if (finalAdmin.length > 0) {
            const admin = finalAdmin[0];
            console.log(`   Username: ${admin.username}`);
            console.log(`   Email: ${admin.email}`);
            console.log(`   Role: ${admin.role}`);
            console.log(`   Status: ${admin.status}`);
        }

        console.log('');
        console.log('🎉 Railway environment setup complete!');
        console.log('🔐 Login credentials:');
        console.log('   Email: admin@africaunita.it');
        console.log('   Password: password123');
        console.log('   URL: https://africaunita.up.railway.app');
        
    } catch (error) {
        console.error('❌ Error setting up Railway environment:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

setupRailwayEnvironment();
