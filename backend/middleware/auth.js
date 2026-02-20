import jwt from 'jsonwebtoken';
import { query } from '../database/db.js';

export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token di accesso richiesto'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'africa-unita-secret-key-2024');
        
        // Verifica che l'utente esista ancora nel database e recupera last_activity
        const userResult = await query(
            'SELECT id, uuid, username, email, role, status, last_activity FROM users WHERE id = ? AND status = ?',
            [decoded.userId, 'active']
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Utente non trovato o non attivo'
            });
        }

        const user = userResult.rows[0];
        const now = new Date();
        const lastActivity = user.last_activity ? new Date(user.last_activity) : null;
        
        // Verifica inattività: se è passato più di 20 minuti dall'ultima attività, la sessione è scaduta
        const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000; // 20 minuti in millisecondi
        
        if (lastActivity) {
            const timeSinceLastActivity = now.getTime() - lastActivity.getTime();
            
            if (timeSinceLastActivity > INACTIVITY_TIMEOUT_MS) {
                // Sessione scaduta per inattività
                // Aggiorna last_activity a NULL per invalidare la sessione
                try {
                    await query(
                        'UPDATE users SET last_activity = NULL WHERE id = ?',
                        [user.id]
                    );
                } catch (updateError) {
                    // Se il campo last_activity non esiste ancora, ignora l'errore
                    console.warn('Campo last_activity non trovato, verrà creato con la migrazione:', updateError.message);
                }
                
                return res.status(401).json({
                    success: false,
                    message: 'Sessione scaduta per inattività. Effettua nuovamente il login.',
                    code: 'SESSION_EXPIRED'
                });
            }
        }

        // Aggiorna last_activity ad ogni richiesta autenticata
        // Se il campo non esiste ancora, la query fallirà silenziosamente
        try {
            await query(
                'UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE id = ?',
                [user.id]
            );
        } catch (updateError) {
            // Se il campo last_activity non esiste ancora, logga un warning ma continua
            // L'utente dovrà eseguire la migrazione del database
            console.warn('Campo last_activity non trovato. Esegui la migrazione add_last_activity.sql:', updateError.message);
        }

        // Rimuovi last_activity dalla risposta per sicurezza
        delete user.last_activity;
        req.user = user;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        
        // Se il token è scaduto, restituisci un messaggio più specifico
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token scaduto. Effettua nuovamente il login.',
                code: 'TOKEN_EXPIRED'
            });
        }
        
        return res.status(403).json({
            success: false,
            message: 'Token non valido'
        });
    }
};

export const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Autenticazione richiesta'
            });
        }

        // Gestisci sia array che argomenti multipli
        const roles = Array.isArray(allowedRoles[0]) ? allowedRoles[0] : allowedRoles;

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Permessi insufficienti'
            });
        }

        next();
    };
};