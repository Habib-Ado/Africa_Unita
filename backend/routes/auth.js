import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../database/db.js';
import { validateRegister, validateLogin } from '../middleware/validation.js';

const router = express.Router();

// POST /api/auth/register - Registrazione nuovo utente
router.post('/register', validateRegister, async (req, res) => {
    try {
        const { username, email, password, first_name, last_name, phone, country_of_origin } = req.body;

        // Verifica se email o username esistono già
        const existingUser = await query(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email o username già utilizzati'
            });
        }

        // Hash della password
        const saltRounds = 12;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Inserisci nuovo utente con status 'pending' per l'approvazione
        const countryValue = country_of_origin && country_of_origin.trim() !== '' ? country_of_origin : 'Africa';
        const result = await query(
            `INSERT INTO users (username, email, password_hash, first_name, last_name, phone, country_of_origin, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [username, email, password_hash, first_name, last_name, phone, countryValue]
        );

        const user = result.rows[0];

        res.status(201).json({
            success: true,
            message: 'Registrazione completata! Il tuo account è in attesa di approvazione da parte di un amministratore. Riceverai una notifica via email una volta approvato.',
            data: { user: { ...user, status: 'pending' } }
        });

    } catch (error) {
        console.error('Registration error:', error);
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

        // Trova utente per email
        const result = await query(
            'SELECT id, uuid, username, email, password_hash, first_name, last_name, role, status FROM users WHERE email = ?',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Credenziali non valide'
            });
        }

        const user = result.rows[0];

        // Verifica se l'utente è attivo
        if (user.status === 'blocked' || user.status === 'deleted') {
            return res.status(401).json({
                success: false,
                message: 'Account non attivo'
            });
        }

        // Verifica se l'utente è in attesa di approvazione
        if (user.status === 'pending') {
            return res.status(401).json({
                success: false,
                message: 'Il tuo account è in attesa di approvazione da parte di un amministratore. Riceverai una notifica una volta approvato.'
            });
        }

        // Verifica password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Credenziali non valide'
            });
        }

        // Aggiorna ultimo login
        await query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [user.id]
        );

        // Genera token JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || 'africa-unita-secret-key-2024',
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        // Rimuovi password_hash dalla risposta
        delete user.password_hash;

        res.status(200).json({
            success: true,
            message: 'Login effettuato con successo',
            data: { user, token }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore durante il login'
        });
    }
});

// GET /api/auth/me - Ottieni informazioni utente corrente
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token di accesso richiesto'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'africa-unita-secret-key-2024');
        
        const result = await query(
            `SELECT id, uuid, username, email, first_name, last_name, role, status, 
                    phone, address, city, country_of_origin, date_of_birth, avatar_url,
                    created_at, last_login 
             FROM users WHERE id = ?`,
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utente non trovato'
            });
        }

        res.status(200).json({
            success: true,
            data: { user: result.rows[0] }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(401).json({
            success: false,
            message: 'Token non valido'
        });
    }
});

// POST /api/auth/logout - Logout (solo per compatibilità)
router.post('/logout', async (req, res) => {
    // Con JWT non c'è bisogno di logout lato server
    res.status(200).json({
        success: true,
        message: 'Logout effettuato con successo'
    });
});

export default router;