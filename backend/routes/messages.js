import express from 'express';
import { query } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateMessage } from '../middleware/validation.js';

const router = express.Router();

// GET /api/messages - Ottieni messaggi dell'utente
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await query(
            `SELECT 
                m.id, m.subject, m.content, m.created_at, m.read_at,
                sender.id as sender_id,
                sender.username as sender_username,
                sender.first_name as sender_first_name,
                sender.last_name as sender_last_name,
                recipient.id as recipient_id,
                recipient.username as recipient_username,
                recipient.first_name as recipient_first_name,
                recipient.last_name as recipient_last_name
             FROM messages m
             LEFT JOIN users sender ON m.sender_id = sender.id
             LEFT JOIN users recipient ON m.recipient_id = recipient.id
             WHERE m.sender_id = ? OR m.recipient_id = ?
             ORDER BY m.created_at DESC`,
            [userId, userId]
        );

        res.status(200).json({
            success: true,
            data: { messages: result.rows }
        });

    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei messaggi'
        });
    }
});

// POST /api/messages - Invia nuovo messaggio
router.post('/', authenticateToken, validateMessage, async (req, res) => {
    try {
        const { recipient_id, subject, content } = req.body;
        const sender_id = req.user.id;

        // Verifica che il destinatario esista
        const recipientResult = await query(
            'SELECT id FROM users WHERE id = ? AND status = ?',
            [recipient_id, 'active']
        );

        if (recipientResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Destinatario non trovato'
            });
        }

        // Inserisci messaggio
        const result = await query(
            `INSERT INTO messages (sender_id, recipient_id, subject, content)
             VALUES (?, ?, ?, ?)`,
            [sender_id, recipient_id, subject, content]
        );

        res.status(201).json({
            success: true,
            message: 'Messaggio inviato con successo',
            data: { 
                messageId: result.rows.insertId
            }
        });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'invio del messaggio'
        });
    }
});

// PUT /api/messages/:id/read - Segna messaggio come letto
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await query(
            `UPDATE messages 
             SET read_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND recipient_id = ? AND read_at IS NULL
             `,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Messaggio non trovato'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Messaggio segnato come letto'
        });

    } catch (error) {
        console.error('Mark message read error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento del messaggio'
        });
    }
});

export default router;