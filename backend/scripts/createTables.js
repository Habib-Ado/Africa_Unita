import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createTables() {
    let connection;
    
    try {
        console.log('🔌 Connexion à MySQL...');
        
        const connectionConfig = config.database.url 
            ? {
                uri: config.database.url,
                ssl: false,
                multipleStatements: true
            }
            : {
                host: config.database.host,
                port: config.database.port,
                database: config.database.name,
                user: config.database.user,
                password: config.database.password,
                ssl: false,
                multipleStatements: true
            };

        connection = await mysql.createConnection(connectionConfig);
        console.log('✅ Connecté');

        // Lire le schéma
        const schemaPath = path.join(__dirname, '../database/schema_simple.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('📄 Exécution du schéma SQL...');
        
        // Exécuter tout le fichier en une seule fois
        await connection.query(schema);
        
        console.log('✅ Tables créées avec succès');
        
        // Vérifier les tables créées
        const [tables] = await connection.query('SHOW TABLES');
        console.log(`\n📊 ${tables.length} tables créées:`);
        tables.forEach(table => console.log('  -', Object.values(table)[0]));
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

createTables();

