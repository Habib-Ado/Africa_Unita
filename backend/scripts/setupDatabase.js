import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const setupDatabase = async () => {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: 'postgres', // Connetti al database di default prima
    });

    try {
        await client.connect();
        console.log('✅ Connected to PostgreSQL');

        // Verifica se il database esiste
        const dbName = process.env.DB_NAME || 'africa_unita_db';
        const checkDb = await client.query(
            `SELECT 1 FROM pg_database WHERE datname = $1`,
            [dbName]
        );

        if (checkDb.rows.length === 0) {
            console.log(`📦 Creating database '${dbName}'...`);
            await client.query(`CREATE DATABASE ${dbName}`);
            console.log(`✅ Database '${dbName}' created successfully`);
        } else {
            console.log(`ℹ️  Database '${dbName}' already exists`);
        }

        await client.end();

        // Connetti al nuovo database e esegui lo schema
        const dbClient = new Client({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
            database: dbName,
        });

        await dbClient.connect();
        console.log(`✅ Connected to database '${dbName}'`);

        // Leggi e esegui schema SQL
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('📝 Executing schema SQL...');
        await dbClient.query(schemaSql);
        console.log('✅ Schema created successfully');

        await dbClient.end();

        console.log('');
        console.log('═══════════════════════════════════════════════');
        console.log('🎉 Database setup completed successfully!');
        console.log('═══════════════════════════════════════════════');
        console.log('');
        console.log('Next steps:');
        console.log('1. Run: npm run dev (to start the server)');
        console.log('2. Optional: npm run db:seed (to add sample data)');
        console.log('');

    } catch (error) {
        console.error('❌ Error setting up database:', error);
        process.exit(1);
    }
};

setupDatabase();
