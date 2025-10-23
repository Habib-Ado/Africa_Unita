// Debug Admin Status - Verifica stato utente admin
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { config } from './backend/config.js';

async function debugAdminStatus() {
    let connection;
    
    try {
        console.log('🔍 Debugging admin user status...');
        
        // Connessione al database Railway
        const connectionConfig = config.database.url 
            ? {
                uri: config.database.url,
                ssl: false
            }
            : {
                host: config.database.host,
                port: config.database.port,
                database: config.database.name,
                user: config.database.user,
                password: config.database.password,
                ssl: false
            };

        connection = await mysql.createConnection(connectionConfig);
        console.log('✅ Connected to Railway database');

        // 1. Verifica utente admin
        console.log('👤 Checking admin user...');
        const [adminUsers] = await connection.execute(
            'SELECT id, username, email, password_hash, role, status FROM users WHERE email = ?',
            ['admin@africaunita.it']
        );

        if (adminUsers.length === 0) {
            console.log('❌ Admin user not found');
            return;
        }

        const admin = adminUsers[0];
        console.log('📋 Admin user details:');
        console.log(`   ID: ${admin.id}`);
        console.log(`   Username: ${admin.username}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Role: ${admin.role}`);
        console.log(`   Status: ${admin.status}`);
        console.log(`   Password Hash: ${admin.password_hash ? 'Present' : 'Missing'}`);

        // 2. Verifica status
        console.log('🔍 Checking user status...');
        if (admin.status === 'pending') {
            console.log('⚠️  User status is PENDING - needs admin approval');
            console.log('💡 Fix: Update status to active');
        } else if (admin.status === 'blocked') {
            console.log('❌ User status is BLOCKED');
            console.log('💡 Fix: Update status to active');
        } else if (admin.status === 'deleted') {
            console.log('❌ User status is DELETED');
            console.log('💡 Fix: Update status to active');
        } else if (admin.status === 'active') {
            console.log('✅ User status is ACTIVE');
        } else {
            console.log(`⚠️  Unknown status: ${admin.status}`);
        }

        // 3. Test password
        console.log('🔑 Testing password...');
        const testPassword = 'password123';
        const isPasswordValid = await bcrypt.compare(testPassword, admin.password_hash);
        console.log(`Password '${testPassword}' is valid: ${isPasswordValid}`);

        // 4. Fix status if needed
        if (admin.status !== 'active') {
            console.log('🔧 Fixing user status...');
            await connection.execute(
                'UPDATE users SET status = ? WHERE email = ?',
                ['active', 'admin@africaunita.it']
            );
            console.log('✅ User status updated to active');
        }

        // 5. Fix role if needed
        if (admin.role !== 'admin') {
            console.log('🔧 Fixing user role...');
            await connection.execute(
                'UPDATE users SET role = ? WHERE email = ?',
                ['admin', 'admin@africaunita.it']
            );
            console.log('✅ User role updated to admin');
        }

        // 6. Verifica finale
        console.log('📋 Final admin user status:');
        const [finalAdmin] = await connection.execute(
            'SELECT username, email, role, status FROM users WHERE email = ?',
            ['admin@africaunita.it']
        );

        if (finalAdmin.length > 0) {
            const final = finalAdmin[0];
            console.log(`   Username: ${final.username}`);
            console.log(`   Email: ${final.email}`);
            console.log(`   Role: ${final.role}`);
            console.log(`   Status: ${final.status}`);
        }

        console.log('');
        console.log('🎉 Admin user should now work for login!');
        console.log('🔐 Test login with: admin@africaunita.it / password123');
        
    } catch (error) {
        console.error('❌ Error debugging admin status:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

debugAdminStatus();
