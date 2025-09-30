import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../database/db.js';
import { validateRegister, validateLogin, validateResetPassword, validateNewPassword } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Genera JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// POST /api/auth/register - Registrazione nuovo utente
router.post('/register', validateRegister, async (req, res) => {
    try {
        const { username, email, password, first_name, last_name, phone, country_of_origin } = req.body;

        // Controlla se l'utente esiste già
        const existingUser = await query(
            'SELECT id FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email o username già registrati'
            });
        }

        // Hash della password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Inserisci nuovo utente
        const result = await query(
            `INSERT INTO users (username, email, password_hash, first_name, last_name, phone, country_of_origin)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, uuid, username, email, first_name, last_name, role, status, created_at`,
            [username, email, password_hash, first_name, last_name, phone, country_of_origin]
        );

        const user = result.rows[0];
        const token = generateToken(user.id);

        res.status(201).json({
            success: true,
            message: 'Registrazione completata con successo',
            data: {
                token,
                user: {
                    id: user.id,
                    uuid: user.uuid,
                    username: user.username,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    role: user.role,
                    status: user.status
                }
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore durante la registrazione'
        });
    }
});

// POST /api/auth/login - Login utente
router.post('/login', validateLogin, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Trova utente
        const result = await query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Email o password non corretti'
            });
        }

        const user = result.rows[0];

        // Verifica password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Email o password non corretti'
            });
        }

        // Verifica stato account
        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Account non attivo. Contatta l\'amministratore.'
            });
        }

        // Aggiorna last_login
        await query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        const token = generateToken(user.id);

        res.json({
            success: true,
            message: 'Login effettuato con successo',
            data: {
                token,
                user: {
                    id: user.id,
                    uuid: user.uuid,
                    username: user.username,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    role: user.role,
                    status: user.status,
                    avatar_url: user.avatar_url
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore durante il login'
        });
    }
});

// GET /api/auth/me - Ottieni info utente corrente
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const result = await query(
            `SELECT id, uuid, username, email, first_name, last_name, phone, role, status, 
                    avatar_url, bio, country_of_origin, city, province, created_at, last_login
             FROM users WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utente non trovato'
            });
        }

        res.json({
            success: true,
            data: {
                user: result.rows[0]
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle informazioni utente'
        });
    }
});

// POST /api/auth/forgot-password - Richiedi reset password
router.post('/forgot-password', validateResetPassword, async (req, res) => {
    try {
        const { email } = req.body;

        const result = await query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            // Per sicurezza, non rivelare se l'email esiste o meno
            return res.json({
                success: true,
                message: 'Se l\'email è registrata, riceverai le istruzioni per il reset'
            });
        }

        // Genera token di reset
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 3600000); // 1 ora

        await query(
            'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE email = $3',
            [resetToken, resetExpires, email]
        );

        // TODO: Invia email con link di reset
        // In produzione, implementare invio email con servizio SMTP

        res.json({
            success: true,
            message: 'Istruzioni per il reset inviate via email',
            // In sviluppo, restituisci il token (rimuovere in produzione!)
            ...(process.env.NODE_ENV === 'development' && { resetToken })
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella richiesta di reset password'
        });
    }
});

// POST /api/auth/reset-password - Reset password con token
router.post('/reset-password', validateNewPassword, async (req, res) => {
    try {
        const { token, password } = req.body;

        // Trova utente con token valido
        const result = await query(
            'SELECT id FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Token non valido o scaduto'
            });
        }

        const userId = result.rows[0].id;

        // Hash nuova password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Aggiorna password e rimuovi token
        await query(
            'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
            [password_hash, userId]
        );

        res.json({
            success: true,
            message: 'Password aggiornata con successo'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel reset della password'
        });
    }
});

// POST /api/auth/logout - Logout (opzionale, principalmente client-side)
router.post('/logout', authenticateToken, async (req, res) => {
    // Con JWT, il logout è principalmente gestito lato client rimuovendo il token
    // Qui possiamo registrare l'evento se necessario
    res.json({
        success: true,
        message: 'Logout effettuato con successo'
    });
});

export default router;
