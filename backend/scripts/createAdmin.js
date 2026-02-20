// Script per creare/aggiornare l'utente admin
import bcrypt from 'bcryptjs';
import { query } from '../database/db.js';

async function createAdmin() {
    try {
        console.log('🔐 Creazione/aggiornamento utente admin...');
        
        const adminUsername = 'admin@africaunita.it';
        const adminEmail = 'africaunita02@gmail.com'; // Email per notifiche (può essere diversa)
        const adminPassword = 'Password123!';
        const adminFirstName = 'Admin';
        const adminLastName = 'Sistema';
        
        // Hash della password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
        
        // Verifica se l'admin esiste già
        const existingAdmin = await query(
            'SELECT id, username, email, role, status FROM users WHERE username = ? OR email = ?',
            [adminUsername, adminEmail]
        );
        
        if (existingAdmin.rows.length > 0) {
            const admin = existingAdmin.rows[0];
            console.log(`🔄 Aggiornamento utente admin esistente (ID: ${admin.id})...`);
            
            // Aggiorna l'utente admin
            await query(
                `UPDATE users 
                 SET username = ?, email = ?, password_hash = ?, first_name = ?, last_name = ?, 
                     role = 'admin', status = 'active', updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [adminUsername, adminEmail, passwordHash, adminFirstName, adminLastName, admin.id]
            );
            
            console.log('✅ Utente admin aggiornato con successo!');
        } else {
            console.log('✅ Creazione nuovo utente admin...');
            
            // Crea nuovo utente admin
            const result = await query(
                `INSERT INTO users (username, email, password_hash, first_name, last_name, role, status)
                 VALUES (?, ?, ?, ?, ?, 'admin', 'active')`,
                [adminUsername, adminEmail, passwordHash, adminFirstName, adminLastName]
            );
            
            const userId = result.rows?.insertId ?? (result.rows && !Array.isArray(result.rows) ? result.rows.insertId : null);
            if (userId == null) {
                const idResult = await query('SELECT LAST_INSERT_ID() as id', []);
                const row = Array.isArray(idResult.rows) ? idResult.rows[0] : idResult.rows;
                console.log('✅ Utente admin creato con ID:', row?.id ?? row?.ID);
            } else {
                console.log('✅ Utente admin creato con ID:', userId);
            }
        }
        
        console.log('');
        console.log('═══════════════════════════════════════════════════');
        console.log('👑 CREDENZIALI ADMIN:');
        console.log('═══════════════════════════════════════════════════');
        console.log(`   Username (Email di accesso): ${adminUsername}`);
        console.log(`   Password: ${adminPassword}`);
        console.log(`   Email (per notifiche): ${adminEmail}`);
        console.log('═══════════════════════════════════════════════════');
        console.log('');
        
    } catch (error) {
        console.error('❌ Errore durante la creazione dell\'admin:', error);
        throw error;
    }
}

// Esegui se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
    createAdmin()
        .then(() => {
            console.log('✅ Script completato con successo!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Errore:', error);
            process.exit(1);
        });
}

export default createAdmin;
