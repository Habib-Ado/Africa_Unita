// Railway Console Fix - Esegui questo script nel Railway console
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

async function fixLogin() {
    let connection;
    
    try {
        console.log('🔧 Fixing login issue in Railway...');
        
        // Usa DATABASE_URL di Railway
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            console.error('❌ DATABASE_URL not found in environment variables');
            return;
        }

        // Connessione al database Railway
        connection = await mysql.createConnection({
            uri: databaseUrl,
            ssl: false
        });
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
        
        // Verifica aggiornamento
        const [users] = await connection.execute(
            'SELECT username, email, role FROM users WHERE email = ?',
            ['admin@africaunita.it']
        );

        if (users.length > 0) {
            console.log('📋 Admin user found:');
            console.log(`   Username: ${users[0].username}`);
            console.log(`   Email: ${users[0].email}`);
            console.log(`   Role: ${users[0].role}`);
        }

        console.log('');
        console.log('🎉 Login should now work with:');
        console.log('   Email: admin@africaunita.it');
        console.log('   Password: password123');
        console.log('   URL: https://africaunita.up.railway.app');
        
    } catch (error) {
        console.error('❌ Error fixing login:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

fixLogin();
