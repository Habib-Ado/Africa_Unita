import express from 'express';
import { query } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/notifications - Ottieni notifiche dell'utente corrente
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20 } = req.query;

        const result = await query(
            `SELECT id, type, title, message, link, is_read, created_at
             FROM notifications
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT ?`,
            [userId, Math.min(parseInt(limit, 10) || 20, 100)]
        );

        const notifications = result.rows || [];
        const unreadCount = notifications.filter(n => n.is_read === 0 || n.is_read === false).length;

        res.json({
            success: true,
            data: {
                notifications,
                unreadCount
            }
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle notifiche'
        });
    }
});

// PUT /api/notifications/:id/read - Segna notifica come letta
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const result = await query(
            `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
            [id, userId]
        );

        const affected = result.rows?.affectedRows ?? result.rowCount ?? 0;
        if (affected === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notifica non trovata'
            });
        }

        res.json({
            success: true,
            message: 'Notifica segnata come letta'
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento della notifica'
        });
    }
});

export default router;
