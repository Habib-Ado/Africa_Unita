import jwt from 'jsonwebtoken';
import { query } from '../database/db.js';

// Middleware per verificare il token JWT
export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: 'Token di autenticazione mancante' 
            });
        }

        // Verifica il token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Recupera l'utente dal database
        const result = await query(
            'SELECT id, uuid, username, email, role, status FROM users WHERE id = $1 AND status = $2',
            [decoded.userId, 'active']
        );

        if (result.rows.length === 0) {
            return res.status(403).json({ 
                success: false,
                message: 'Utente non trovato o non attivo' 
            });
        }

        // Aggiungi l'utente alla request
        req.user = result.rows[0];
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ 
                success: false,
                message: 'Token non valido' 
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({ 
                success: false,
                message: 'Token scaduto' 
            });
        }
        return res.status(500).json({ 
            success: false,
            message: 'Errore di autenticazione' 
        });
    }
};

// Middleware per verificare il ruolo dell'utente
export const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false,
                message: 'Autenticazione richiesta' 
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false,
                message: 'Non hai i permessi per accedere a questa risorsa' 
            });
        }

        next();
    };
};

// Middleware per verificare che l'utente sia attivo
export const requireActiveUser = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            success: false,
            message: 'Autenticazione richiesta' 
        });
    }

    if (req.user.status !== 'active') {
        return res.status(403).json({ 
            success: false,
            message: 'Account non attivo' 
        });
    }

    next();
};

// Middleware opzionale per autenticazione (non richiesta)
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const result = await query(
                'SELECT id, uuid, username, email, role, status FROM users WHERE id = $1',
                [decoded.userId]
            );

            if (result.rows.length > 0) {
                req.user = result.rows[0];
            }
        }
    } catch (error) {
        // Ignora errori per auth opzionale
    }
    next();
};
