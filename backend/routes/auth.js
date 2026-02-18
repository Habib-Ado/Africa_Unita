import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../database/db.js';
import { validateRegister, validateLogin } from '../middleware/validation.js';
import emailService from '../services/emailService.js';
import verificationService from '../services/verificationService.js';

const router = express.Router();

// POST /api/auth/register - Registrazione nuovo utente
router.post('/register', validateRegister, async (req, res) => {
    try {
        const { username, email, password, first_name, last_name, phone, country_of_origin } = req.body;

        // Verifica se email o username esistono già (escludendo utenti eliminati)
        const existingUser = await query(
            'SELECT id FROM users WHERE (email = ? OR username = ?) AND status != ?',
            [email, username, 'deleted']
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

        // Inserisci nuovo utente con status 'pending' per la verifica email
        const countryValue = country_of_origin && country_of_origin.trim() !== '' ? country_of_origin : 'Africa';
        const result = await query(
            `INSERT INTO users (username, email, password_hash, first_name, last_name, phone, country_of_origin, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [username, email, password_hash, first_name, last_name, phone, countryValue]
        );

        const userId = result.insertId;
        const user = { id: userId, username, email, first_name, last_name, status: 'pending' };

        // Genera token di verifica email
        const verificationToken = await verificationService.generateVerificationToken(userId);

        // Invia email di verifica
        const emailSent = await emailService.sendVerificationEmail(
            email, 
            verificationToken, 
            `${first_name} ${last_name}`
        );

        if (!emailSent) {
            console.warn('⚠️ Email di verifica non inviata, ma utente creato');
        }

        res.status(201).json({
            success: true,
            message: 'Registrazione completata! Ti abbiamo inviato un\'email di verifica. Controlla la tua casella di posta e clicca sul link per verificare il tuo account.',
            data: { user }
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
        const { email, password } = req.body; // 'email' nel body è in realtà lo username (email di accesso)

        // Trova utente per username (che è l'email di accesso nel formato @africaunita.it)
        const result = await query(
            'SELECT id, uuid, username, email, password_hash, first_name, last_name, role, status FROM users WHERE username = ?',
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

// GET /api/auth/verify-email - Verifica email con token
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token di verifica richiesto'
            });
        }

        const verification = await verificationService.verifyToken(token);

        if (!verification.valid) {
            return res.status(400).json({
                success: false,
                message: verification.message
            });
        }

        // Invia notifica agli admin
        await emailService.sendAdminNotificationEmail(verification.user);

        res.status(200).json({
            success: true,
            message: 'Email verificata con successo! Un amministratore esaminerà la tua richiesta e ti invierà una notifica quando il tuo account sarà approvato.',
            data: { user: verification.user }
        });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore durante la verifica email'
        });
    }
});

// POST /api/auth/resend-verification - Reinvia email di verifica
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email richiesta'
            });
        }

        // Trova utente
        const result = await query(
            'SELECT id, email, first_name, last_name, status FROM users WHERE email = ?',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utente non trovato'
            });
        }

        const user = result.rows[0];

        if (user.status === 'active' || user.status === 'email_verified') {
            return res.status(400).json({
                success: false,
                message: 'Email già verificata'
            });
        }

        // Genera nuovo token
        const verificationToken = await verificationService.generateVerificationToken(user.id);

        // Invia email di verifica
        const emailSent = await emailService.sendVerificationEmail(
            email, 
            verificationToken, 
            `${user.first_name} ${user.last_name}`
        );

        if (!emailSent) {
            return res.status(500).json({
                success: false,
                message: 'Errore invio email di verifica'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Email di verifica reinviata con successo'
        });

    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore durante il reinvio della verifica'
        });
    }
});

export default router;