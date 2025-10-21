import mysql from 'mysql2/promise';
import { config } from '../config.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrateUserColumns() {
    let connection;
    
    try {
        // Configurazione connessione
        const dbConfig = config.database.url 
            ? { uri: config.database.url, ssl: false }
            : {
                host: config.database.host,
                port: config.database.port,
                database: config.database.name,
                user: config.database.user,
                password: config.database.password,
                ssl: false
            };

        connection = await mysql.createConnection(dbConfig);
        
        console.log('✅ Connesso al database');
        
        // Verifica se le colonne name e surname esistono
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME IN ('name', 'surname', 'first_name', 'last_name')
        `, [config.database.name]);
        
        const columnNames = columns.map(col => col.COLUMN_NAME);
        console.log('📋 Colonne trovate:', columnNames);
        
        // Migra name -> first_name
        if (columnNames.includes('name') && !columnNames.includes('first_name')) {
            console.log('🔄 Rinomino colonna: name -> first_name');
            await connection.execute(`
                ALTER TABLE users CHANGE COLUMN name first_name VARCHAR(100)
            `);
            console.log('✅ Colonna name rinominata in first_name');
        } else if (columnNames.includes('first_name')) {
            console.log('✅ Colonna first_name già esistente');
        }
        
        // Migra surname -> last_name
        if (columnNames.includes('surname') && !columnNames.includes('last_name')) {
            console.log('🔄 Rinomino colonna: surname -> last_name');
            await connection.execute(`
                ALTER TABLE users CHANGE COLUMN surname last_name VARCHAR(100)
            `);
            console.log('✅ Colonna surname rinominata in last_name');
        } else if (columnNames.includes('last_name')) {
            console.log('✅ Colonna last_name già esistente');
        }
        
        // Verifica finale
        const [finalColumns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'users'
            ORDER BY ORDINAL_POSITION
        `, [config.database.name]);
        
        console.log('\n📊 Struttura finale tabella users:');
        finalColumns.forEach(col => {
            console.log(`  - ${col.COLUMN_NAME}`);
        });
        
        console.log('\n✅ Migrazione completata con successo!');
        console.log('🔄 Riavvia il server per applicare le modifiche.');
        
    } catch (error) {
        console.error('❌ Errore durante la migrazione:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

migrateUserColumns();

