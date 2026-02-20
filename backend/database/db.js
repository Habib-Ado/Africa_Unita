import mysql from 'mysql2/promise';
import { config } from '../config.js';

// Configurazione del pool di connessioni MySQL - Railway ready
// mysql2 accetta la stringa DATABASE_URL direttamente, NON come { uri: url }
const pool = config.database.url
    ? mysql.createPool(config.database.url, { connectionLimit: 20 })
    : mysql.createPool({
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        user: config.database.user,
        password: config.database.password,
        ssl: false,
        connectionLimit: 20
    });

// Helper per eseguire query con retry
export const query = async (text, params = [], retries = 3) => {
    const start = Date.now();
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const [rows, fields] = await pool.execute(text, params);
            const duration = Date.now() - start;
            console.log('Executed query', { text, duration, rows: rows.length });
            return { rows, rowCount: rows.length };
        } catch (error) {
            console.error(`Database query error (attempt ${attempt}/${retries}):`, error.message);
            
            if (attempt === retries) {
                console.error('Database query failed after all retries:', error);
                throw error;
            }
            
            // Se è un errore di connessione, aspetta prima di riprovare
            if (error.message.includes('Connection terminated') || 
                error.message.includes('timeout') ||
                error.message.includes('ECONNRESET') ||
                error.message.includes('SSL')) {
                console.log(`Retrying query in ${attempt * 1000}ms...`);
                await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            } else {
                // Per altri errori, non riprovare
                throw error;
            }
        }
    }
};

// Helper per eseguire query raw (senza prepared statements) - necessario per CREATE FUNCTION, DELIMITER, ecc.
export const queryRaw = async (text, retries = 3) => {
    const start = Date.now();
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const [rows, fields] = await pool.query(text);
            const duration = Date.now() - start;
            console.log('Executed raw query', { text: text.substring(0, 100) + '...', duration, rows: rows?.length || 0 });
            return { rows, rowCount: rows?.length || 0 };
        } catch (error) {
            console.error(`Database raw query error (attempt ${attempt}/${retries}):`, error.message);
            
            if (attempt === retries) {
                console.error('Database raw query failed after all retries:', error);
                throw error;
            }
            
            // Se è un errore di connessione, aspetta prima di riprovare
            if (error.message.includes('Connection terminated') || 
                error.message.includes('timeout') ||
                error.message.includes('ECONNRESET') ||
                error.message.includes('SSL')) {
                console.log(`Retrying raw query in ${attempt * 1000}ms...`);
                await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            } else {
                // Per altri errori, non riprovare
                throw error;
            }
        }
    }
};

// Helper per testare la connessione
export const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT NOW()');
        connection.release();
        console.log('✅ Database connection successful:', rows[0]['NOW()']);
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

// Gestione graceful shutdown
process.on('SIGINT', async () => {
    console.log('Closing database pool...');
    await pool.end();
    process.exit(0);
});

export default pool;