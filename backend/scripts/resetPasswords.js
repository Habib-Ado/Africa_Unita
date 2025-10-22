import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import { config } from '../config.js';

async function resetPasswords() {
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

    const connection = await mysql.createConnection(connectionConfig);

    try {
        console.log('🔌 Connessione al database MySQL...');
        console.log('✅ Connesso al database');

        // Password di default per tutti gli utenti di test: "password123"
        const defaultPassword = 'password123';
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);

        console.log('🔑 Reset password per utenti di test...');
        console.log('📝 Password impostata: password123');
        console.log('');

        // Aggiorna le password degli utenti di test
        const users = [
            { username: 'admin', email: 'admin@africaunita.it' },
            { username: 'moderator1', email: 'moderator@africaunita.it' },
            { username: 'treasurer1', email: 'treasurer@africaunita.it' },
            { username: 'mario_rossi', email: 'mario@test.com' },
            { username: 'fatou_diop', email: 'fatou@test.com' }
        ];

        for (const user of users) {
            await connection.execute(
                'UPDATE users SET password_hash = ? WHERE username = ?',
                [hashedPassword, user.username]
            );
            
            const [rows] = await connection.execute(
                'SELECT username, email, role FROM users WHERE username = ?',
                [user.username]
            );
            
            if (rows.length > 0) {
                const updatedUser = rows[0];
                console.log(`✅ Password aggiornata per: ${updatedUser.username} (${updatedUser.email}) - Ruolo: ${updatedUser.role}`);
            }
        }

        console.log('');
        console.log('🎉 Password reset completato!');
        console.log('');
        console.log('═══════════════════════════════════════════════════');
        console.log('📋 CREDENZIALI DI ACCESSO:');
        console.log('═══════════════════════════════════════════════════');
        console.log('');
        console.log('👑 ADMIN:');
        console.log('   Username: admin');
        console.log('   Email: admin@africaunita.it');
        console.log('   Password: password123');
        console.log('');
        console.log('✏️ MODERATORE:');
        console.log('   Username: moderator1');
        console.log('   Email: moderator@africaunita.it');
        console.log('   Password: password123');
        console.log('');
        console.log('💰 TESORIERE:');
        console.log('   Username: treasurer1');
        console.log('   Email: treasurer@africaunita.it');
        console.log('   Password: password123');
        console.log('');
        console.log('👤 UTENTI NORMALI:');
        console.log('   Username: mario_rossi | Email: mario@test.com');
        console.log('   Username: fatou_diop | Email: fatou@test.com');
        console.log('   Password: password123 (per entrambi)');
        console.log('');
        console.log('═══════════════════════════════════════════════════');
        
    } catch (error) {
        console.error('❌ Errore durante il reset delle password:', error.message);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

resetPasswords();

