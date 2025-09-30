import express from 'express';
import { query } from '../database/db.js';
import { authenticateToken, optionalAuth, requireRole } from '../middleware/auth.js';
import { validatePost } from '../middleware/validation.js';

const router = express.Router();

// GET /api/posts - Ottieni lista posts (pubblico)
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            category = '', 
            search = '',
            featured = false,
            user_id = ''
        } = req.query;
        const offset = (page - 1) * limit;

        let queryText = `
            SELECT p.*, 
                   u.username as author_username, 
                   u.first_name as author_first_name,
                   u.last_name as author_last_name,
                   u.avatar_url as author_avatar,
                   (SELECT COUNT(*) FROM favorites WHERE post_id = p.id) as favorites_count,
                   (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.is_published = true
        `;
        const params = [];
        let paramCount = 1;

        if (category) {
            queryText += ` AND p.category = $${paramCount}`;
            params.push(category);
            paramCount++;
        }

        if (search) {
            queryText += ` AND (p.title ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        if (featured === 'true') {
            queryText += ` AND p.is_featured = true`;
        }

        if (user_id) {
            queryText += ` AND p.user_id = $${paramCount}`;
            params.push(user_id);
            paramCount++;
        }

        queryText += ` ORDER BY p.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await query(queryText, params);

        // Conta totale
        let countQuery = 'SELECT COUNT(*) FROM posts WHERE is_published = true';
        const countParams = [];
        if (category) {
            countQuery += ' AND category = $1';
            countParams.push(category);
        }
        const countResult = await query(countQuery, countParams);

        res.json({
            success: true,
            data: {
                posts: result.rows,
                pagination: {
                    total: parseInt(countResult.rows[0].count),
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(countResult.rows[0].count / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei posts'
        });
    }
});

// GET /api/posts/:id - Ottieni post specifico
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT p.*, 
                    u.username as author_username, 
                    u.first_name as author_first_name,
                    u.last_name as author_last_name,
                    u.avatar_url as author_avatar,
                    u.phone as author_phone,
                    (SELECT COUNT(*) FROM favorites WHERE post_id = p.id) as favorites_count
             FROM posts p
             JOIN users u ON p.user_id = u.id
             WHERE p.id = $1 AND p.is_published = true`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Post non trovato'
            });
        }

        // Incrementa view count
        await query('SELECT increment_post_views($1)', [id]);

        // Verifica se è nei favoriti dell'utente (se autenticato)
        let isFavorite = false;
        if (req.user) {
            const favCheck = await query(
                'SELECT id FROM favorites WHERE user_id = $1 AND post_id = $2',
                [req.user.id, id]
            );
            isFavorite = favCheck.rows.length > 0;
        }

        res.json({
            success: true,
            data: {
                post: {
                    ...result.rows[0],
                    is_favorite: isFavorite
                }
            }
        });
    } catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero del post'
        });
    }
});

// POST /api/posts - Crea nuovo post (autenticato)
router.post('/', authenticateToken, validatePost, async (req, res) => {
    try {
        const { title, description, category, location, contact_info, image_url } = req.body;

        const result = await query(
            `INSERT INTO posts (user_id, title, description, category, location, contact_info, image_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [req.user.id, title, description, category, location, contact_info, image_url]
        );

        res.status(201).json({
            success: true,
            message: 'Post creato con successo',
            data: {
                post: result.rows[0]
            }
        });
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella creazione del post'
        });
    }
});

// PUT /api/posts/:id - Aggiorna post (proprietario o admin)
router.put('/:id', authenticateToken, validatePost, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, category, location, contact_info, image_url, is_published } = req.body;

        // Verifica proprietà
        const postCheck = await query(
            'SELECT user_id FROM posts WHERE id = $1',
            [id]
        );

        if (postCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Post non trovato'
            });
        }

        if (postCheck.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Non autorizzato a modificare questo post'
            });
        }

        const result = await query(
            `UPDATE posts 
             SET title = $1, description = $2, category = $3, 
                 location = $4, contact_info = $5, image_url = $6,
                 is_published = COALESCE($7, is_published)
             WHERE id = $8
             RETURNING *`,
            [title, description, category, location, contact_info, image_url, is_published, id]
        );

        res.json({
            success: true,
            message: 'Post aggiornato con successo',
            data: {
                post: result.rows[0]
            }
        });
    } catch (error) {
        console.error('Update post error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento del post'
        });
    }
});

// DELETE /api/posts/:id - Elimina post (proprietario o admin)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const postCheck = await query(
            'SELECT user_id FROM posts WHERE id = $1',
            [id]
        );

        if (postCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Post non trovato'
            });
        }

        if (postCheck.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Non autorizzato a eliminare questo post'
            });
        }

        await query('DELETE FROM posts WHERE id = $1', [id]);

        res.json({
            success: true,
            message: 'Post eliminato con successo'
        });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'eliminazione del post'
        });
    }
});

// POST /api/posts/:id/favorite - Aggiungi/rimuovi dai preferiti
router.post('/:id/favorite', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Verifica se il post esiste
        const postCheck = await query('SELECT id FROM posts WHERE id = $1', [id]);
        if (postCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Post non trovato'
            });
        }

        // Verifica se è già nei favoriti
        const favCheck = await query(
            'SELECT id FROM favorites WHERE user_id = $1 AND post_id = $2',
            [req.user.id, id]
        );

        if (favCheck.rows.length > 0) {
            // Rimuovi dai favoriti
            await query(
                'DELETE FROM favorites WHERE user_id = $1 AND post_id = $2',
                [req.user.id, id]
            );
            return res.json({
                success: true,
                message: 'Rimosso dai preferiti',
                data: { is_favorite: false }
            });
        } else {
            // Aggiungi ai favoriti
            await query(
                'INSERT INTO favorites (user_id, post_id) VALUES ($1, $2)',
                [req.user.id, id]
            );
            return res.json({
                success: true,
                message: 'Aggiunto ai preferiti',
                data: { is_favorite: true }
            });
        }
    } catch (error) {
        console.error('Toggle favorite error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella gestione dei preferiti'
        });
    }
});

// GET /api/posts/my/favorites - Ottieni posts preferiti dell'utente
router.get('/my/favorites', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const result = await query(
            `SELECT p.*, 
                    u.username as author_username, 
                    u.first_name as author_first_name,
                    u.last_name as author_last_name,
                    f.created_at as favorited_at
             FROM favorites f
             JOIN posts p ON f.post_id = p.id
             JOIN users u ON p.user_id = u.id
             WHERE f.user_id = $1 AND p.is_published = true
             ORDER BY f.created_at DESC
             LIMIT $2 OFFSET $3`,
            [req.user.id, limit, offset]
        );

        res.json({
            success: true,
            data: {
                posts: result.rows
            }
        });
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei preferiti'
        });
    }
});

// PUT /api/posts/:id/feature - Metti in evidenza (solo admin)
router.put('/:id/feature', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { is_featured } = req.body;

        const result = await query(
            'UPDATE posts SET is_featured = $1 WHERE id = $2 RETURNING *',
            [is_featured, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Post non trovato'
            });
        }

        res.json({
            success: true,
            message: `Post ${is_featured ? 'messo in evidenza' : 'rimosso dall\'evidenza'}`,
            data: {
                post: result.rows[0]
            }
        });
    } catch (error) {
        console.error('Feature post error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento del post'
        });
    }
});

export default router;
