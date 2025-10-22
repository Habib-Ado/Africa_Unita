// Fix Username Mismatch in Railway Database
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { config } from './backend/config.js';

async function fixUsernameMismatch() {
    let connection;
    
    try {
        console.log('🔧 Fixing username mismatch in Railway database...');
        
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

        // 1. Verifica username attuali
        console.log('📋 Current usernames:');
        const [currentUsers] = await connection.execute('SELECT username, email, role FROM users');
        currentUsers.forEach(user => {
            console.log(`  - ${user.username} (${user.email}) - ${user.role}`);
        });

        // 2. Correggi username mismatch
        console.log('🔧 Fixing username mismatch...');
        await connection.execute("UPDATE users SET username = 'moderator' WHERE username = 'moderator1'");
        await connection.execute("UPDATE users SET username = 'treasurer' WHERE username = 'treasurer1'");

        // 3. Reset password per tutti gli utenti
        console.log('🔑 Resetting passwords to password123...');
        const passwordHash = await bcrypt.hash('password123', 12);
        
        const users = ['admin', 'moderator', 'treasurer', 'mario_rossi', 'fatou_diop'];
        for (const username of users) {
            await connection.execute(
                'UPDATE users SET password_hash = ? WHERE username = ?',
                [passwordHash, username]
            );
            console.log(`✅ Password reset for: ${username}`);
        }

        // 4. Verifica finale
        console.log('📋 Final usernames:');
        const [finalUsers] = await connection.execute('SELECT username, email, role FROM users');
        finalUsers.forEach(user => {
            console.log(`  - ${user.username} (${user.email}) - ${user.role}`);
        });

        console.log('');
        console.log('🎉 Username mismatch fixed!');
        console.log('🔐 Test login with: admin@africaunita.it / password123');
        
    } catch (error) {
        console.error('❌ Error fixing username mismatch:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

fixUsernameMismatch();
