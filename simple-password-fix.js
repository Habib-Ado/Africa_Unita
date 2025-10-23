// Simple Password Fix for Railway
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { config } from './backend/config.js';

async function fixPassword() {
    let connection;
    
    try {
        console.log('🔧 Fixing password for admin user...');
        
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

        // Genera nuovo hash per password123
        const passwordHash = await bcrypt.hash('password123', 12);
        console.log('🔑 Generated new password hash');

        // Aggiorna password per admin
        await connection.execute(
            'UPDATE users SET password_hash = ? WHERE email = ?',
            [passwordHash, 'admin@africaunita.it']
        );

        console.log('✅ Password updated for admin@africaunita.it');
        console.log('');
        console.log('🎉 Login should now work with:');
        console.log('   Email: admin@africaunita.it');
        console.log('   Password: password123');
        
    } catch (error) {
        console.error('❌ Error fixing password:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

fixPassword();
