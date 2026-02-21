import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { config } from '../config.js';

async function resetPasswords() {
    const connectionConfig = config.database.url
        ? config.database.url
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
            { username: 'admin@africaunita.it', email: 'africaunita02@gmail.com' },
            { username: 'president@africaunita.it', email: 'president@africaunita.it' },
            { username: 'moderator@africaunita.it', email: 'moderator@africaunita.it' },
            { username: 'treasurer@africaunita.it', email: 'treasurer@africaunita.it' },
            { username: 'user@africaunita.it', email: 'user@africaunita.it' },
            { username: 'mario@africaunita.it', email: 'mario@africaunita.it' },
            { username: 'ibrahim@africaunita.it', email: 'ibrahim@africaunita.it' }
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
        console.log('   Username: admin@africaunita.it');
        console.log('   Email: africaunita02@gmail.com');
        console.log('   Password: password123');
        console.log('');
        console.log('👑 PRESIDENT:');
        console.log('   Username: president');
        console.log('   Email: president@africaunita.it');
        console.log('   Password: password123');
        console.log('');
        console.log('✏️ MODERATORE:');
        console.log('   Username: moderator');
        console.log('   Email: moderator@africaunita.it');
        console.log('   Password: password123');
        console.log('');
        console.log('💰 TESORIERE:');
        console.log('   Username: treasurer');
        console.log('   Email: treasurer@africaunita.it');
        console.log('   Password: password123');
        console.log('');
        console.log('👤 UTENTI NORMALI:');
        console.log('   Username: user1 | Email: user@africaunita.it');
        console.log('   Username: mario_rossi | Email: mario@test.com');
        console.log('   Username: ibrahim_sy | Email: ibrahim@test.com');
        console.log('   Password: password123 (per tutti)');
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

