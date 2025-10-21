import mysql from 'mysql2/promise';
import { config } from '../config.js';

// Configurazione del pool di connessioni MySQL
const poolConfig = config.database.url 
    ? {
        uri: config.database.url,
        ssl: false, // Disabilita SSL per Railway MySQL
        connectionLimit: 20
    }
    : {
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        user: config.database.user,
        password: config.database.password,
        ssl: false,
        connectionLimit: 20
    };

const pool = mysql.createPool(poolConfig);

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