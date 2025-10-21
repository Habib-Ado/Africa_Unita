import express from 'express';
import { query } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Validation middleware
const validateComment = [
    body('content')
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage('Il commento deve essere tra 1 e 1000 caratteri'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Errore di validazione',
                errors: errors.array()
            });
        }
        next();
    }
];

// GET /api/comments/post/:postId - Ottieni commenti per un post
router.get('/post/:postId', async (req, res) => {
    try {
        const { postId } = req.params;

        const result = await query(`
            SELECT 
                c.id, c.content, c.created_at, c.parent_comment_id,
                u.id as user_id, u.username, u.first_name, u.last_name, u.avatar_url
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ? AND c.is_approved = true
            ORDER BY c.created_at ASC
        `, [postId]);

        res.status(200).json({
            success: true,
            data: { comments: result.rows }
        });
    } catch (error) {
        console.error('Get post comments error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei commenti'
        });
    }
});

// GET /api/comments/content/:contentId - Ottieni commenti per site_content
router.get('/content/:contentId', async (req, res) => {
    try {
        const { contentId } = req.params;

        const result = await query(`
            SELECT 
                c.id, c.content, c.created_at, c.parent_comment_id,
                u.id as user_id, u.username, u.first_name, u.last_name, u.avatar_url
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.content_id = ? AND c.is_approved = true
            ORDER BY c.created_at ASC
        `, [contentId]);

        res.status(200).json({
            success: true,
            data: { comments: result.rows }
        });
    } catch (error) {
        console.error('Get content comments error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei commenti'
        });
    }
});

// POST /api/comments/post/:postId - Aggiungi commento a un post
router.post('/post/:postId', authenticateToken, validateComment, async (req, res) => {
    try {
        const { postId } = req.params;
        const { content, parent_comment_id } = req.body;
        const userId = req.user.id;

        // Verifica che il post esista
        const postExists = await query('SELECT id FROM posts WHERE id = ?', [postId]);
        if (postExists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Post non trovato'
            });
        }

        const result = await query(`
            INSERT INTO comments (post_id, user_id, content, parent_comment_id)
            VALUES (?, ?, ?, ?)
            , content, created_at
        `, [postId, userId, content, parent_comment_id || null]);

        res.status(201).json({
            success: true,
            message: 'Commento aggiunto con successo',
            data: { comment: result.rows[0] }
        });
    } catch (error) {
        console.error('Add post comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiunta del commento'
        });
    }
});

// POST /api/comments/content/:contentId - Aggiungi commento a site_content
router.post('/content/:contentId', authenticateToken, validateComment, async (req, res) => {
    try {
        const { contentId } = req.params;
        const { content, parent_comment_id } = req.body;
        const userId = req.user.id;

        // Verifica che il contenuto esista e sia pubblicato
        const contentExists = await query(
            'SELECT id FROM site_content WHERE id = ? AND status = ?',
            [contentId, 'published']
        );
        if (contentExists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Contenuto non trovato o non pubblicato'
            });
        }

        const result = await query(`
            INSERT INTO comments (content_id, user_id, content, parent_comment_id)
            VALUES (?, ?, ?, ?)
            , content, created_at
        `, [contentId, userId, content, parent_comment_id || null]);

        res.status(201).json({
            success: true,
            message: 'Commento aggiunto con successo',
            data: { comment: result.rows[0] }
        });
    } catch (error) {
        console.error('Add content comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiunta del commento'
        });
    }
});

// DELETE /api/comments/:id - Elimina commento
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Verifica che il commento esista
        const comment = await query(
            'SELECT user_id FROM comments WHERE id = ?',
            [id]
        );

        if (comment.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Commento non trovato'
            });
        }

        // Solo l'autore o un admin può eliminare
        if (comment.rows[0].user_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Non hai i permessi per eliminare questo commento'
            });
        }

        await query('DELETE FROM comments WHERE id = ?', [id]);

        res.status(200).json({
            success: true,
            message: 'Commento eliminato con successo'
        });
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'eliminazione del commento'
        });
    }
});

export default router;

