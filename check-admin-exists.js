// Check if admin exists in database
import mysql from 'mysql2/promise';
import { config } from './backend/config.js';

async function checkAdmin() {
    let connection;
    
    try {
        console.log('🔍 Checking if admin exists in database...');
        
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

        // Controlla tutti gli utenti
        const [users] = await connection.execute('SELECT username, email, role FROM users');
        console.log(`📊 Total users in database: ${users.length}`);
        
        if (users.length > 0) {
            console.log('👥 Users found:');
            users.forEach(user => {
                console.log(`  - ${user.username} (${user.email}) - Role: ${user.role}`);
            });
        } else {
            console.log('❌ No users found in database');
        }

        // Controlla specificamente admin
        const [adminUsers] = await connection.execute(
            'SELECT username, email, role, password_hash FROM users WHERE email = ?',
            ['admin@africaunita.it']
        );

        if (adminUsers.length > 0) {
            const admin = adminUsers[0];
            console.log('✅ Admin user found:');
            console.log(`   Username: ${admin.username}`);
            console.log(`   Email: ${admin.email}`);
            console.log(`   Role: ${admin.role}`);
            console.log(`   Password Hash: ${admin.password_hash ? 'Present' : 'Missing'}`);
        } else {
            console.log('❌ Admin user not found');
            console.log('💡 You can create admin from browser registration form');
        }

        // Controlla se ci sono utenti con ruolo admin
        const [adminRoleUsers] = await connection.execute(
            'SELECT username, email, role FROM users WHERE role = ?',
            ['admin']
        );

        if (adminRoleUsers.length > 0) {
            console.log('👑 Users with admin role:');
            adminRoleUsers.forEach(user => {
                console.log(`  - ${user.username} (${user.email})`);
            });
        } else {
            console.log('❌ No users with admin role found');
        }
        
    } catch (error) {
        console.error('❌ Error checking admin:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkAdmin();
