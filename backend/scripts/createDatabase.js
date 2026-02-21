import mysql from 'mysql2/promise';
import { config } from '../config.js';

async function createDatabase() {
    let connection;
    
    try {
        console.log('🔌 Connexion au serveur MySQL...');
        
        // Connexion sans database - Railway compatible (mysql2 accetta URL string direttamente)
        connection = config.database.url
            ? await mysql.createConnection(config.database.url)
            : await mysql.createConnection({
                host: config.database.host,
                port: config.database.port,
                user: config.database.user,
                password: config.database.password,
                ssl: false
            });
        console.log('✅ Connecté au serveur MySQL');

        // Créer la base de données si elle n'existe pas
        const dbName = config.database.name;
        console.log(`🗄️  Création de la base de données '${dbName}'...`);
        
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log(`✅ Base de données '${dbName}' créée avec succès (ou déjà existante)`);
        
        console.log('🎉 Base de données prête à être utilisée!');
        
    } catch (error) {
        console.error('❌ Erreur lors de la création de la base de données:', error.message);
        console.error('\n📋 Vérifiez que :');
        console.error('   1. MySQL est installé et en cours d\'exécution');
        console.error('   2. Les informations de connexion dans .env sont correctes');
        console.error('   3. L\'utilisateur MySQL a les permissions nécessaires');
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

createDatabase();

