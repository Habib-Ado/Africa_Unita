import express from 'express';
import { query } from '../database/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();

// Configurazione multer per upload immagini posts
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/posts');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'post-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit per immagini
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo immagini sono permesse per il campo image'), false);
        }
    }
});

// Configurazione multer per file allegati (documenti, etc.)
const uploadFiles = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit per documenti
    },
    fileFilter: (req, file, cb) => {
        // Permetti vari tipi di file
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 
            'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'application/zip'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo di file non supportato'), false);
        }
    }
});

// GET /api/posts - Ottieni post pubblici
router.get('/', async (req, res) => {
    try {
        const { limit = 10, offset = 0, search } = req.query;

        let whereClause = 'WHERE p.is_published = ?';
        let params = [1]; // 1 pour true en MySQL

        // Aggiungi ricerca per titolo e contenuto
        if (search) {
            whereClause += ` AND (p.title LIKE ? OR p.description LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        // Converti limit e offset in numeri interi
        const limitNum = parseInt(limit) || 10;
        const offsetNum = parseInt(offset) || 0;

        const result = await query(
            `SELECT 
                p.id, p.title, p.description, p.category, p.image_url, p.created_at, p.updated_at,
                u.first_name as author_name,
                u.last_name as author_surname
             FROM posts p
             LEFT JOIN users u ON p.user_id = u.id
             ${whereClause}
             ORDER BY p.created_at DESC
             LIMIT ${limitNum} OFFSET ${offsetNum}`,
            params
        );

        res.status(200).json({
            success: true,
            data: { posts: result.rows }
        });

    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei post'
        });
    }
});

// GET /api/posts/my - Ottieni i propri posts (DEVE stare PRIMA di /:id)
router.get('/my', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await query(`
            SELECT 
                p.id, p.title, p.description as content, p.category, p.image_url,
                p.is_published, p.views, p.created_at, p.updated_at
            FROM posts p
            WHERE p.user_id = ?
            ORDER BY p.created_at DESC
        `, [userId]);

        res.status(200).json({
            success: true,
            data: { posts: result.rows }
        });
    } catch (error) {
        console.error('Get my posts error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei tuoi annunci'
        });
    }
});

// GET /api/posts/:id - Ottieni post specifico
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT 
                p.id, p.title, p.description as content, p.category, p.image_url,
                p.views, p.created_at, p.updated_at,
                u.id as user_id, u.username as author_username, u.first_name as author_name,
                u.last_name as author_surname, u.avatar_url as author_avatar
             FROM posts p
             LEFT JOIN users u ON p.user_id = u.id
             WHERE p.id = ? AND p.is_published = ?`,
            [id, 1]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Post non trovato'
            });
        }

        // Ottieni i file allegati al post
        const filesResult = await query(`
            SELECT id, file_name, file_path, file_size, mime_type, uploaded_at
            FROM post_files
            WHERE post_id = ?
            ORDER BY uploaded_at ASC
        `, [id]);

        res.status(200).json({
            success: true,
            data: { 
                post: result.rows[0],
                files: filesResult.rows
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

// POST /api/posts - Crea nuovo post con file allegati
router.post('/', authenticateToken, uploadFiles.fields([
    { name: 'image', maxCount: 1 },
    { name: 'files', maxCount: 10 }
]), async (req, res) => {
    try {
        const { title, content, description, category } = req.body;
        const userId = req.user.id;
        const postContent = content || description;

        if (!title || !postContent || !category) {
            return res.status(400).json({
                success: false,
                message: 'Titolo, contenuto e categoria sono obbligatori'
            });
        }

        // Gestisci immagine se caricata
        let imageUrl = null;
        if (req.files && req.files['image'] && req.files['image'][0]) {
            imageUrl = `/uploads/posts/${req.files['image'][0].filename}`;
        }

        const location = req.body.location || null;
        const contactInfo = req.body.contact_info || null;

        const result = await query(`
            INSERT INTO posts (user_id, title, description, category, location, contact_info, image_url, is_published)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `, [userId, title, postContent, category, location, contactInfo, imageUrl]);

        let postId = result.rows?.insertId;
        if (postId == null && result.rows && !Array.isArray(result.rows)) {
            postId = result.rows.insertId;
        }
        if (postId == null) {
            const idResult = await query('SELECT LAST_INSERT_ID() as id', []);
            const row = Array.isArray(idResult.rows) ? idResult.rows[0] : idResult.rows;
            if (row && typeof row.id !== 'undefined') postId = row.id;
            else if (row && typeof row.ID !== 'undefined') postId = row.ID;
        }

        // Gestisci i file allegati (solo se abbiamo un postId valido)
        if (postId != null && req.files && req.files['files'] && req.files['files'].length > 0) {
            for (const file of req.files['files']) {
                await query(`
                    INSERT INTO post_files (post_id, file_name, file_path, file_size, mime_type)
                    VALUES (?, ?, ?, ?, ?)
                `, [postId, file.originalname, `/uploads/posts/${file.filename}`, file.size, file.mimetype]);
            }
        }

        res.status(201).json({
            success: true,
            message: 'Annuncio creato con successo',
            data: { post: { id: postId, title, description: postContent, category } }
        });
    } catch (error) {
        console.error('Create post error:', error);
        const msg = error.message || 'Errore nella creazione dell\'annuncio';
        res.status(500).json({
            success: false,
            message: msg
        });
    }
});

// PUT /api/posts/:id - Modifica post
router.put('/:id', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, description, category } = req.body;
        const postContent = content || description;
        const userId = req.user.id;

        // Verifica che il post esista e appartenga all'utente
        const existingPost = await query(
            'SELECT user_id FROM posts WHERE id = ?',
            [id]
        );

        if (existingPost.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Annuncio non trovato'
            });
        }

        // Solo l'autore o un admin può modificare
        if (existingPost.rows[0].user_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Non hai i permessi per modificare questo annuncio'
            });
        }

        // Gestisci immagine se caricata
        let imageUrl = null;
        if (req.file) {
            imageUrl = `/uploads/posts/${req.file.filename}`;
        }

        const updateFields = [];
        const values = [];

        if (title) {
            updateFields.push(`title = ?`);
            values.push(title);
        }
        if (postContent) {
            updateFields.push(`description = ?`);
            values.push(postContent);
        }
        if (category) {
            updateFields.push(`category = ?`);
            values.push(category);
        }
        if (imageUrl) {
            updateFields.push(`image_url = ?`);
            values.push(imageUrl);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nessun campo da aggiornare'
            });
        }

        values.push(id);
        const result = await query(`
            UPDATE posts 
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `, values);

        res.status(200).json({
            success: true,
            message: 'Annuncio aggiornato con successo',
            data: { post: result.rows[0] }
        });
    } catch (error) {
        console.error('Update post error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento dell\'annuncio'
        });
    }
});

// DELETE /api/posts/:id - Elimina post
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Verifica che il post esista
        const existingPost = await query(
            'SELECT user_id, image_url FROM posts WHERE id = ?',
            [id]
        );

        if (existingPost.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Annuncio non trovato'
            });
        }

        // Solo l'autore o un admin può eliminare
        if (existingPost.rows[0].user_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Non hai i permessi per eliminare questo annuncio'
            });
        }

        // Elimina l'immagine dal filesystem se esiste
        if (existingPost.rows[0].image_url) {
            const imagePath = path.join(__dirname, '..', existingPost.rows[0].image_url);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await query('DELETE FROM posts WHERE id = ?', [id]);

        res.status(200).json({
            success: true,
            message: 'Annuncio eliminato con successo'
        });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'eliminazione dell\'annuncio'
        });
    }
});

// POST /api/posts/:id/view - Incrementa contatore visualizzazioni
router.post('/:id/view', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Incrementa il contatore
        await query(`
            UPDATE posts 
            SET views = views + 1 
            WHERE id = ? AND is_published = 1
        `, [id]);
        
        res.status(200).json({
            success: true,
            message: 'Visualizzazione registrata'
        });
    } catch (error) {
        console.error('Error tracking view:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella registrazione della visualizzazione'
        });
    }
});

export default router;