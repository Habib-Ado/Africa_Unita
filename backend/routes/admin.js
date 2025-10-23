// Admin Routes - Gestione approvazione utenti
import express from 'express';
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

        // Aggiorna status utente
        await query(
            'UPDATE users SET status = ? WHERE id = ?',
            [newStatus, userId]
        );

        // Invia email di notifica all'utente
        await emailService.sendApprovalEmail(
            user.email,
            `${user.first_name} ${user.last_name}`,
            approved
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

                    // Aggiorna status
                    await query(
                        'UPDATE users SET status = ? WHERE id = ?',
                        [newStatus, userId]
                    );

                    // Invia email
                    await emailService.sendApprovalEmail(
                        user.email,
                        `${user.first_name} ${user.last_name}`,
                        approved
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
