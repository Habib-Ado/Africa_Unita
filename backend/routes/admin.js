// Admin Routes - Gestione approvazione utenti
import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../database/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import emailService from '../services/emailService.js';

const router = express.Router();

// Middleware per richiedere autenticazione e ruolo admin
router.use(authenticateToken);
router.use(requireRole(['admin', 'president']));

// GET /api/admin/pending-users - Lista utenti in attesa di approvazione
router.get('/pending-users', async (req, res) => {
    try {
        const result = await query(
            `SELECT id, uuid, username, email, first_name, last_name, phone, 
                    country_of_origin, status, created_at 
             FROM users 
             WHERE status = 'email_verified' 
             ORDER BY created_at DESC`
        );

        res.status(200).json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get pending users error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore durante il recupero degli utenti'
        });
    }
});

// POST /api/admin/approve-user - Approva utente
router.post('/approve-user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { approved } = req.body;

        if (typeof approved !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Parametro approved richiesto (true/false)'
            });
        }

        // Verifica che l'utente esista e sia in attesa
        const userResult = await query(
            'SELECT id, email, first_name, last_name, status FROM users WHERE id = ? AND status = ?',
            [userId, 'email_verified']
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utente non trovato o già processato'
            });
        }

        const user = userResult.rows[0];
        const newStatus = approved ? 'active' : 'blocked';

        let loginUsername = null;
        let loginPassword = null;

        if (approved) {
            // Genera username: prima lettera del nome + cognome@africaunita.it (lowercase, senza spazi)
            const firstLetter = user.first_name ? user.first_name.charAt(0).toLowerCase() : '';
            const lastName = user.last_name ? user.last_name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') : '';
            let baseUsername = `${firstLetter}${lastName}@africaunita.it`;
            
            // Verifica se lo username esiste già e aggiungi un numero se necessario (escludendo utenti eliminati)
            let counter = 1;
            loginUsername = baseUsername;
            while (true) {
                const existingUsername = await query(
                    'SELECT id FROM users WHERE username = ? AND id != ? AND status != ?',
                    [loginUsername, userId, 'deleted']
                );
                if (existingUsername.rows.length === 0) {
                    break; // Username disponibile
                }
                // Se esiste già, aggiungi un numero prima di @africaunita.it
                loginUsername = `${firstLetter}${lastName}${counter}@africaunita.it`;
                counter++;
            }

            // Genera password temporanea sicura (12 caratteri: lettere maiuscole, minuscole, numeri)
            const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const lowercase = 'abcdefghijklmnopqrstuvwxyz';
            const numbers = '0123456789';
            const allChars = uppercase + lowercase + numbers;
            
            let password = '';
            // Assicura almeno un carattere di ogni tipo
            password += uppercase[Math.floor(Math.random() * uppercase.length)];
            password += lowercase[Math.floor(Math.random() * lowercase.length)];
            password += numbers[Math.floor(Math.random() * numbers.length)];
            
            // Completa la password con caratteri casuali
            for (let i = password.length; i < 12; i++) {
                password += allChars[Math.floor(Math.random() * allChars.length)];
            }
            
            // Mescola la password
            loginPassword = password.split('').sort(() => Math.random() - 0.5).join('');

            // Hash della password
            const saltRounds = 12;
            const password_hash = await bcrypt.hash(loginPassword, saltRounds);

            // Aggiorna utente con nuovo username (email di accesso), password e status
            // L'email originale viene mantenuta per le notifiche
            // Imposta last_login = NULL per forzare il cambio password al primo accesso
            await query(
                'UPDATE users SET username = ?, password_hash = ?, status = ?, last_login = NULL WHERE id = ?',
                [loginUsername, password_hash, newStatus, userId]
            );
        } else {
            // Se non approvato, aggiorna solo lo status
            await query(
                'UPDATE users SET status = ? WHERE id = ?',
                [newStatus, userId]
            );
        }

        // Invia email di notifica all'utente (usa sempre l'email originale per le notifiche)
        await emailService.sendApprovalEmail(
            user.email,
            `${user.first_name} ${user.last_name}`,
            approved,
            loginUsername,
            loginPassword
        );

        res.status(200).json({
            success: true,
            message: `Utente ${approved ? 'approvato' : 'rifiutato'} con successo`,
            data: { 
                userId, 
                status: newStatus,
                emailSent: true
            }
        });

    } catch (error) {
        console.error('Approve user error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore durante l\'approvazione utente'
        });
    }
});

// POST /api/admin/bulk-approve - Approvazione multipla
router.post('/bulk-approve', async (req, res) => {
    try {
        const { userIds, approved } = req.body;

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Lista ID utenti richiesta'
            });
        }

        if (typeof approved !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Parametro approved richiesto (true/false)'
            });
        }

        const newStatus = approved ? 'active' : 'blocked';
        const results = [];

        for (const userId of userIds) {
            try {
                // Verifica utente
                const userResult = await query(
                    'SELECT id, email, first_name, last_name FROM users WHERE id = ? AND status = ?',
                    [userId, 'email_verified']
                );

                if (userResult.rows.length > 0) {
                    const user = userResult.rows[0];

                    let loginUsername = null;
                    let loginPassword = null;

                    if (approved) {
                        // Genera username: prima lettera del nome + cognome@africaunita.it (lowercase, senza spazi)
                        const firstLetter = user.first_name ? user.first_name.charAt(0).toLowerCase() : '';
                        const lastName = user.last_name ? user.last_name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') : '';
                        let baseUsername = `${firstLetter}${lastName}@africaunita.it`;
                        
                        // Verifica se lo username esiste già e aggiungi un numero se necessario (escludendo utenti eliminati)
                        let counter = 1;
                        loginUsername = baseUsername;
                        while (true) {
                            const existingUsername = await query(
                                'SELECT id FROM users WHERE username = ? AND id != ? AND status != ?',
                                [loginUsername, userId, 'deleted']
                            );
                            if (existingUsername.rows.length === 0) {
                                break; // Username disponibile
                            }
                            // Se esiste già, aggiungi un numero prima di @africaunita.it
                            loginUsername = `${firstLetter}${lastName}${counter}@africaunita.it`;
                            counter++;
                        }

                        // Genera password temporanea sicura (12 caratteri)
                        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
                        const numbers = '0123456789';
                        const allChars = uppercase + lowercase + numbers;
                        
                        let password = '';
                        password += uppercase[Math.floor(Math.random() * uppercase.length)];
                        password += lowercase[Math.floor(Math.random() * lowercase.length)];
                        password += numbers[Math.floor(Math.random() * numbers.length)];
                        
                        for (let i = password.length; i < 12; i++) {
                            password += allChars[Math.floor(Math.random() * allChars.length)];
                        }
                        
                        loginPassword = password.split('').sort(() => Math.random() - 0.5).join('');

                        // Hash della password
                        const saltRounds = 12;
                        const password_hash = await bcrypt.hash(loginPassword, saltRounds);

                        // Aggiorna utente con nuovo username (email di accesso), password e status
                        // L'email originale viene mantenuta per le notifiche
                        // Imposta last_login = NULL per forzare il cambio password al primo accesso
                        await query(
                            'UPDATE users SET username = ?, password_hash = ?, status = ?, last_login = NULL WHERE id = ?',
                            [loginUsername, password_hash, newStatus, userId]
                        );
                    } else {
                        // Se non approvato, aggiorna solo lo status
                        await query(
                            'UPDATE users SET status = ? WHERE id = ?',
                            [newStatus, userId]
                        );
                    }

                    // Invia email (usa sempre l'email originale per le notifiche)
                    await emailService.sendApprovalEmail(
                        user.email,
                        `${user.first_name} ${user.last_name}`,
                        approved,
                        loginUsername,
                        loginPassword
                    );

                    results.push({ userId, success: true });
                } else {
                    results.push({ userId, success: false, error: 'Utente non trovato' });
                }
            } catch (error) {
                results.push({ userId, success: false, error: error.message });
            }
        }

        res.status(200).json({
            success: true,
            message: `Processamento completato: ${results.filter(r => r.success).length}/${results.length} utenti processati`,
            data: results
        });

    } catch (error) {
        console.error('Bulk approve error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore durante l\'approvazione multipla'
        });
    }
});

// GET /api/admin/user-stats - Statistiche utenti
router.get('/user-stats', async (req, res) => {
    try {
        const stats = await query(`
            SELECT 
                status,
                COUNT(*) as count
            FROM users 
            GROUP BY status
        `);

        const totalUsers = await query('SELECT COUNT(*) as total FROM users');
        const pendingUsers = await query('SELECT COUNT(*) as count FROM users WHERE status = "email_verified"');

        res.status(200).json({
            success: true,
            data: {
                total: totalUsers.rows[0].total,
                pending: pendingUsers.rows[0].count,
                byStatus: stats.rows
            }
        });

    } catch (error) {
        console.error('User stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore durante il recupero delle statistiche'
        });
    }
});

export default router;
