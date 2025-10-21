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
        
        // Verifica che l'utente esista ancora nel database
        const userResult = await query(
            'SELECT id, uuid, username, email, role, status FROM users WHERE id = ? AND status = ?',
            [decoded.userId, 'active']
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Utente non trovato o non attivo'
            });
        }

        req.user = userResult.rows[0];
        next();
    } catch (error) {
        console.error('Token verification error:', error);
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