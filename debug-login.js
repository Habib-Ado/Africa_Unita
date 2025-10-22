// Debug Login Issue
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { config } from './backend/config.js';

async function debugLogin() {
    let connection;
    
    try {
        console.log('🔍 Debugging login issue...');
        
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
            'SELECT username, email, password_hash, role FROM users WHERE email = ?',
            ['admin@africaunita.it']
        );

        if (adminUsers.length === 0) {
            console.log('❌ No admin user found with email admin@africaunita.it');
            return;
        }

        const adminUser = adminUsers[0];
        console.log('📋 Admin user found:');
        console.log(`  Username: ${adminUser.username}`);
        console.log(`  Email: ${adminUser.email}`);
        console.log(`  Role: ${adminUser.role}`);
        console.log(`  Password Hash: ${adminUser.password_hash ? 'Present' : 'Missing'}`);

        // 2. Test password
        console.log('🔑 Testing password...');
        const testPassword = 'password123';
        const isPasswordValid = await bcrypt.compare(testPassword, adminUser.password_hash);
        console.log(`Password '${testPassword}' is valid: ${isPasswordValid}`);

        // 3. Genera nuovo hash per confronto
        console.log('🔧 Generating new password hash...');
        const newHash = await bcrypt.hash(testPassword, 12);
        console.log(`New hash: ${newHash}`);

        // 4. Aggiorna password con nuovo hash
        console.log('🔄 Updating password hash...');
        await connection.execute(
            'UPDATE users SET password_hash = ? WHERE email = ?',
            [newHash, 'admin@africaunita.it']
        );

        // 5. Verifica aggiornamento
        console.log('✅ Password updated. Testing again...');
        const [updatedUsers] = await connection.execute(
            'SELECT username, email, password_hash FROM users WHERE email = ?',
            ['admin@africaunita.it']
        );

        const updatedUser = updatedUsers[0];
        const isNewPasswordValid = await bcrypt.compare(testPassword, updatedUser.password_hash);
        console.log(`New password hash is valid: ${isNewPasswordValid}`);

        console.log('');
        console.log('🎉 Login should now work with:');
        console.log('   Email: admin@africaunita.it');
        console.log('   Password: password123');
        
    } catch (error) {
        console.error('❌ Error debugging login:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

debugLogin();
