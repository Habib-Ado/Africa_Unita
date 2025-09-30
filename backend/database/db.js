import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Configurazione pool di connessioni PostgreSQL
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'africa_unita_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    max: 20, // numero massimo di connessioni nel pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connessione
pool.on('connect', () => {
    console.log('✅ Connesso al database PostgreSQL');
});

pool.on('error', (err) => {
    console.error('❌ Errore inaspettato nel database pool:', err);
    process.exit(-1);
});

// Helper per query con gestione errori
export const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

// Helper per transazioni
export const transaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Helper per test connessione
export const testConnection = async () => {
    try {
        const res = await pool.query('SELECT NOW()');
        console.log('✅ Database connection test successful:', res.rows[0]);
        return true;
    } catch (error) {
        console.error('❌ Database connection test failed:', error);
        return false;
    }
};

export default pool;
