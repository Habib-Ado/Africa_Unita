import dotenv from 'dotenv';

// Carica variabili d'ambiente
dotenv.config();

export const config = {
    // Database - Railway deployment ready
    database: {
        url: process.env.DATABASE_URL, // Railway fornisce questa variabile automaticamente
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        name: process.env.DB_NAME || 'railway',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'password',
        ssl: process.env.DB_SSL === 'true' ? true : false,
        sslmode: process.env.DB_SSLMODE || 'disable'
    },
    
    // JWT
    jwt: {
        secret: process.env.JWT_SECRET || 'africa-unita-secret-key-2024',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    },
    
    // Server
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development'
    },
    
    // File upload
    upload: {
        dir: process.env.UPLOAD_DIR || 'uploads',
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB
    }
};

export default config;



