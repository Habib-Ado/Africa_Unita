import express from 'express';
import { query } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateMessage } from '../middleware/validation.js';

const router = express.Router();

// GET /api/messages - Ottieni messaggi dell'utente
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { type = 'received', page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let queryText;
        if (type === 'sent') {
            queryText = `
                SELECT m.*, 
                       r.id as recipient_id, r.username as recipient_username, 
                       r.first_name as recipient_first_name, r.last_name as recipient_last_name,
                       r.avatar_url as recipient_avatar
                FROM messages m
                JOIN users r ON m.recipient_id = r.id
                WHERE m.sender_id = $1
                ORDER BY m.created_at DESC
                LIMIT $2 OFFSET $3
            `;
        } else {
            queryText = `
                SELECT m.*, 
                       s.id as sender_id, s.username as sender_username, 
                       s.first_name as sender_first_name, s.last_name as sender_last_name,
                       s.avatar_url as sender_avatar
                FROM messages m
                JOIN users s ON m.sender_id = s.id
                WHERE m.recipient_id = $1
                ORDER BY m.created_at DESC
                LIMIT $2 OFFSET $3
            `;
        }

        const result = await query(queryText, [req.user.id, limit, offset]);

        // Conta totale
        const countQuery = type === 'sent' 
            ? 'SELECT COUNT(*) FROM messages WHERE sender_id = $1'
            : 'SELECT COUNT(*) FROM messages WHERE recipient_id = $1';
        const countResult = await query(countQuery, [req.user.id]);

        res.json({
            success: true,
            data: {
                messages: result.rows,
                pagination: {
                    total: parseInt(countResult.rows[0].count),
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(countResult.rows[0].count / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei messaggi'
        });
    }
});

// GET /api/messages/unread-count - Conta messaggi non letti
router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
        const result = await query(
            `SELECT COUNT(*) FROM messages 
             WHERE recipient_id = $1 AND status != 'read'`,
            [req.user.id]
        );

        res.json({
            success: true,
            data: {
                count: parseInt(result.rows[0].count)
            }
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel conteggio messaggi non letti'
        });
    }
});

// GET /api/messages/:id - Ottieni messaggio specifico
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT m.*, 
                    s.username as sender_username, s.first_name as sender_first_name, 
                    s.last_name as sender_last_name, s.avatar_url as sender_avatar,
                    r.username as recipient_username, r.first_name as recipient_first_name, 
                    r.last_name as recipient_last_name, r.avatar_url as recipient_avatar
             FROM messages m
             JOIN users s ON m.sender_id = s.id
             JOIN users r ON m.recipient_id = r.id
             WHERE m.id = $1 AND (m.sender_id = $2 OR m.recipient_id = $2)`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Messaggio non trovato'
            });
        }

        const message = result.rows[0];

        // Se è il destinatario e non è ancora stato letto, marca come letto
        if (message.recipient_id === req.user.id && message.status !== 'read') {
            await query(
                `UPDATE messages 
                 SET status = 'read', read_at = CURRENT_TIMESTAMP 
                 WHERE id = $1`,
                [id]
            );
            message.status = 'read';
            message.read_at = new Date();
        }

        res.json({
            success: true,
            data: {
                message
            }
        });
    } catch (error) {
        console.error('Get message error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero del messaggio'
        });
    }
});

// POST /api/messages - Invia nuovo messaggio
router.post('/', authenticateToken, validateMessage, async (req, res) => {
    try {
        const { recipient_id, subject, content, parent_message_id } = req.body;

        // Verifica che il destinatario esista
        const recipientCheck = await query(
            'SELECT id FROM users WHERE id = $1 AND status = $2',
            [recipient_id, 'active']
        );

        if (recipientCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Destinatario non trovato o non attivo'
            });
        }

        // Non permettere di inviare messaggi a se stessi
        if (parseInt(recipient_id) === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Non puoi inviare messaggi a te stesso'
            });
        }

        const result = await query(
            `INSERT INTO messages (sender_id, recipient_id, subject, content, parent_message_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, uuid, sender_id, recipient_id, subject, content, status, created_at`,
            [req.user.id, recipient_id, subject, content, parent_message_id || null]
        );

        // Crea notifica per il destinatario
        await query(
            `INSERT INTO notifications (user_id, type, title, message, link)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                recipient_id,
                'new_message',
                'Nuovo messaggio',
                `Hai ricevuto un nuovo messaggio da ${req.user.username}`,
                `/messages/${result.rows[0].id}`
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Messaggio inviato con successo',
            data: {
                message: result.rows[0]
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

// DELETE /api/messages/:id - Elimina messaggio
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            'DELETE FROM messages WHERE id = $1 AND (sender_id = $2 OR recipient_id = $2) RETURNING id',
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Messaggio non trovato'
            });
        }

        res.json({
            success: true,
            message: 'Messaggio eliminato con successo'
        });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'eliminazione del messaggio'
        });
    }
});

// GET /api/messages/conversations/list - Ottieni lista conversazioni
router.get('/conversations/list', authenticateToken, async (req, res) => {
    try {
        const result = await query(
            `WITH latest_messages AS (
                SELECT DISTINCT ON (
                    CASE 
                        WHEN sender_id = $1 THEN recipient_id 
                        ELSE sender_id 
                    END
                )
                m.id,
                m.sender_id,
                m.recipient_id,
                m.subject,
                m.content,
                m.status,
                m.created_at,
                CASE 
                    WHEN sender_id = $1 THEN recipient_id 
                    ELSE sender_id 
                END as other_user_id
                FROM messages m
                WHERE sender_id = $1 OR recipient_id = $1
                ORDER BY other_user_id, created_at DESC
            )
            SELECT 
                lm.*,
                u.username as other_username,
                u.first_name as other_first_name,
                u.last_name as other_last_name,
                u.avatar_url as other_avatar,
                (SELECT COUNT(*) FROM messages 
                 WHERE sender_id = lm.other_user_id 
                 AND recipient_id = $1 
                 AND status != 'read') as unread_count
            FROM latest_messages lm
            JOIN users u ON u.id = lm.other_user_id
            ORDER BY lm.created_at DESC`,
            [req.user.id]
        );

        res.json({
            success: true,
            data: {
                conversations: result.rows
            }
        });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle conversazioni'
        });
    }
});

export default router;
