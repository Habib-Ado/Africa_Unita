import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { testConnection } from './database/db.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import messageRoutes from './routes/messages.js';
import postRoutes from './routes/posts.js';
import feesRoutes from './routes/fees.js';

// Configurazione
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
    credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/fees', feesRoutes);


// Serve frontend (anche in sviluppo, per comodità)
const frontendPath = path.join(__dirname, '../frontend');
app.use('/static', express.static(path.join(frontendPath, 'static')));

// Serve favicon.ico from favicon.png
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(frontendPath, 'static', 'img', 'favicon.png'));
});

// Handle Chrome DevTools requests
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
    res.status(404).end();
});

// SPA fallback SOLO per rotte senza estensione (esclude /static/, /api/ e file con estensione)
app.get('*', (req, res, next) => {
    // Se è una richiesta API, passa al next (404 handler)
    if (req.path.startsWith('/api/')) {
        return next();
    }
    // Se ha un'estensione (file statico), passa al next
    if (path.extname(req.path)) {
        return next();
    }
    // Altrimenti serve l'index.html per il routing client-side
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
    // Se è una richiesta per un file statico, restituisci 404 silenzioso
    if (req.path.includes('.')) {
        return res.status(404).end();
    }
    
    // Per richieste API, restituisci JSON
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            message: 'Endpoint API non trovato'
        });
    }
    
    // Per altre richieste, restituisci 404 silenzioso
    res.status(404).end();
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    // Errori di validazione
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Errore di validazione',
            errors: err.errors
        });
    }

    // Errori database
    if (err.code && err.code.startsWith('23')) {
        return res.status(400).json({
            success: false,
            message: 'Errore nel database: violazione dei vincoli'
        });
    }

    // Errore generico
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Errore interno del server',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ============================================
// SERVER STARTUP
// ============================================

const startServer = async () => {
    try {
        // Test connessione database
        console.log('🔍 Testing database connection...');
        const dbConnected = await testConnection();
        
        if (!dbConnected) {
            console.error('❌ Database connection failed. Please check your configuration.');
            process.exit(1);
        }

        // Start server
        app.listen(PORT, () => {
            console.log('');
            console.log('═══════════════════════════════════════════════');
            console.log(`🚀 Africa Unita Server Running`);
            console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🌐 Port: ${PORT}`);
            console.log(`🔗 URL: http://localhost:${PORT}`);
            console.log(`📊 Health Check: http://localhost:${PORT}/health`);
            console.log('═══════════════════════════════════════════════');
            console.log('');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    process.exit(0);
});
