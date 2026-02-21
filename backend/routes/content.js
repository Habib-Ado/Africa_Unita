import express from 'express';
import { query } from '../database/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { uploadBase } from '../utils/uploadPath.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(uploadBase, 'content');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        // Permetti solo certi tipi di file
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/webm', 'video/quicktime',
            'application/pdf', 'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo di file non supportato'), false);
        }
    }
});

// GET /api/content - Ottieni tutti i contenuti pubblicati
router.get('/', async (req, res) => {
    try {
        const { type, page = 1, limit = 10, search } = req.query;
        const limitNum = parseInt(limit) || 10;
        const pageNum = parseInt(page) || 1;
        const offset = (pageNum - 1) * limitNum;

        let whereClause = "WHERE sc.status = ?";
        let queryParams = ['published'];
        let countParams = ['published'];

        // Aggiungi filtro per tipo
        if (type) {
            whereClause += ` AND sc.content_type = ?`;
            queryParams.push(type);
            countParams.push(type);
        }

        // Aggiungi ricerca per titolo e contenuto
        if (search) {
            whereClause += ` AND (sc.title LIKE ? OR sc.content LIKE ?)`;
            const searchParam = `%${search}%`;
            queryParams.push(searchParam, searchParam);
            countParams.push(searchParam, searchParam);
        }

        const result = await query(`
            SELECT 
                sc.id, sc.uuid, sc.title, sc.content, sc.content_type, 
                sc.featured_image_url, sc.tags, sc.view_count, sc.published_at,
                u.first_name as author_name, u.last_name as author_surname
            FROM site_content sc
            JOIN users u ON sc.author_id = u.id
            ${whereClause}
            ORDER BY sc.published_at DESC
            LIMIT ${limitNum} OFFSET ${offset}
        `, queryParams);

        const totalResult = await query(`
            SELECT COUNT(*) as count FROM site_content sc
            ${whereClause}
        `, countParams);

        res.status(200).json({
            success: true,
            data: {
                content: result.rows,
                total: parseInt(totalResult.rows[0].count),
                page: pageNum,
                limit: limitNum
            }
        });
    } catch (error) {
        console.error('Get content error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei contenuti'
        });
    }
});

// GET /api/content/my - Ottieni i miei contenuti (per moderatori)
// IMPORTANTE: Questa route DEVE essere PRIMA di /:id per evitare conflitti
router.get('/my', authenticateToken, requireRole('moderator', 'admin'), async (req, res) => {
    try {
        const { status, type, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        const userId = req.user.id;

        let whereClause = "WHERE sc.author_id = ?";
        let params = [userId];

        if (status) {
            whereClause += ` AND sc.status = ?`;
            params.push(status);
        }

        if (type) {
            whereClause += ` AND sc.content_type = ?`;
            params.push(type);
        }

        const limitNum = parseInt(limit) || 10;
        const offsetNum = parseInt(offset) || 0;

        const result = await query(`
            SELECT 
                sc.id, sc.uuid, sc.title, sc.content, sc.content_type, sc.status,
                sc.featured_image_url, sc.tags, sc.view_count, sc.published_at,
                sc.created_at, sc.updated_at
            FROM site_content sc
            ${whereClause}
            ORDER BY sc.created_at DESC
            LIMIT ${limitNum} OFFSET ${offsetNum}
        `, params);

        const totalResult = await query(`
            SELECT COUNT(*) as count FROM site_content sc
            ${whereClause}
        `, params);

        res.status(200).json({
            success: true,
            data: {
                content: result.rows,
                total: parseInt(totalResult.rows[0].count),
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get my content error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei tuoi contenuti'
        });
    }
});

// GET /api/content/:id - Ottieni contenuto specifico
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verifica se l'utente è autenticato (opzionale per questa route)
        let userId = null;
        let userRole = null;
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (token) {
            try {
                const jwt = (await import('jsonwebtoken')).default;
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'africa-unita-secret-key-2024');
                const userResult = await query('SELECT id, role FROM users WHERE id = ?', [decoded.userId]);
                if (userResult.rows.length > 0) {
                    userId = userResult.rows[0].id;
                    userRole = userResult.rows[0].role;
                }
            } catch (err) {
                // Token non valido, continua come utente non autenticato
            }
        }

        // Query base
        let whereClause = 'WHERE sc.id = ?';
        
        // Se non è autenticato o non è moderatore/admin, mostra solo contenuti pubblicati
        if (!userId || !['moderator', 'admin'].includes(userRole)) {
            whereClause += ` AND sc.status = 'published'`;
        } else {
            // Se è moderatore/admin, mostra solo pubblicati O i propri contenuti
            whereClause += ` AND (sc.status = 'published' OR sc.author_id = ${userId})`;
        }

        const contentResult = await query(`
            SELECT 
                sc.*, u.username as author_username, u.first_name as author_name, u.last_name as author_surname, 
                u.avatar_url as author_avatar
            FROM site_content sc
            JOIN users u ON sc.author_id = u.id
            ${whereClause}
        `, [id]);

        if (contentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Contenuto non trovato'
            });
        }

        // NON incrementiamo più qui - lo farà l'endpoint separato /view

        // Ottieni i file allegati
        const filesResult = await query(`
            SELECT id, file_name, file_path, file_size, mime_type, uploaded_at
            FROM content_files
            WHERE content_id = ?
            ORDER BY uploaded_at ASC
        `, [id]);

        res.status(200).json({
            success: true,
            data: {
                content: contentResult.rows[0],
                files: filesResult.rows
            }
        });
    } catch (error) {
        console.error('Get content by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero del contenuto'
        });
    }
});

// POST /api/content/:id/view - Incrementa contatore visualizzazioni
router.post('/:id/view', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Incrementa il contatore
        await query(`
            UPDATE site_content 
            SET view_count = view_count + 1 
            WHERE id = ? AND status = 'published'
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

// POST /api/content - Crea nuovo contenuto (solo moderatori e admin)
router.post('/', authenticateToken, requireRole('moderator', 'admin'), upload.fields([
    { name: 'featured_image', maxCount: 1 },
    { name: 'files', maxCount: 10 }
]), async (req, res) => {
    try {
        const { title, content, content_type, tags, status } = req.body;
        const authorId = req.user.id;

        // Status: draft o published (default published per visibilità in home)
        const contentStatus = (status === 'draft' || status === 'published') ? status : 'published';
        const publishedAt = contentStatus === 'published' ? new Date() : null;

        // Valida i dati richiesti
        if (!title || !content_type) {
            return res.status(400).json({
                success: false,
                message: 'Titolo e tipo di contenuto sono obbligatori'
            });
        }

        // Parsing dei tag se forniti
        let tagsArray = [];
        if (tags) {
            tagsArray = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags;
        }

        // Gestisci immagine in evidenza
        let featuredImageUrl = null;
        if (req.files && req.files['featured_image'] && req.files['featured_image'][0]) {
            const file = req.files['featured_image'][0];
            // Percorso relativo accessibile via URL
            featuredImageUrl = `/uploads/content/${file.filename}`;
        }

        // Crea il contenuto
        const contentResult = await query(`
            INSERT INTO site_content (title, content, content_type, author_id, featured_image_url, tags, status, published_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [title, content, content_type, authorId, featuredImageUrl, tagsArray, contentStatus, publishedAt]);

        let contentId = contentResult.rows?.insertId;
        if (contentId == null && contentResult.rows && !Array.isArray(contentResult.rows)) {
            contentId = contentResult.rows.insertId;
        }
        if (contentId == null) {
            const idResult = await query('SELECT LAST_INSERT_ID() as id', []);
            const row = Array.isArray(idResult.rows) ? idResult.rows[0] : idResult.rows;
            contentId = row?.id ?? row?.ID ?? row?.insertId ?? row?.insert_id;
        }

        // Gestisci i file allegati
        if (req.files && req.files['files'] && req.files['files'].length > 0) {
            for (const file of req.files['files']) {
                await query(`
                    INSERT INTO content_files (content_id, file_name, file_path, file_size, mime_type)
                    VALUES (?, ?, ?, ?, ?)
                `, [contentId, file.originalname, `/uploads/content/${file.filename}`, file.size, file.mimetype]);
            }
        }

        res.status(201).json({
            success: true,
            message: 'Contenuto creato con successo',
            data: { id: contentId, title, content_type, featured_image_url: featuredImageUrl, tags: tagsArray }
        });
    } catch (error) {
        console.error('Create content error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella creazione del contenuto'
        });
    }
});

// PUT /api/content/:id - Aggiorna contenuto (solo moderatori e admin)
router.put('/:id', authenticateToken, requireRole('moderator', 'admin'), upload.fields([
    { name: 'featured_image', maxCount: 1 },
    { name: 'files', maxCount: 10 }
]), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, content_type, status, featured_image_url, tags } = req.body;
        const userId = req.user.id;

        // Verifica che il contenuto esista e appartenga all'utente (o sia admin)
        const existingContent = await query(`
            SELECT author_id FROM site_content WHERE id = ?
        `, [id]);

        if (existingContent.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Contenuto non trovato'
            });
        }

        // Solo l'autore o un admin può modificare
        if (existingContent.rows[0].author_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Non hai i permessi per modificare questo contenuto'
            });
        }

        // Parsing dei tag
        let tagsArray = [];
        if (tags) {
            tagsArray = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags;
        }

        // Gestisci immagine in evidenza se caricata
        let featuredImageUrl = null;
        if (req.files && req.files['featured_image'] && req.files['featured_image'][0]) {
            const file = req.files['featured_image'][0];
            featuredImageUrl = `/uploads/content/${file.filename}`;
        }

        // Aggiorna il contenuto
        const updateFields = [];
        const values = [];

        if (title) {
            updateFields.push(`title = ?`);
            values.push(title);
        }
        if (content) {
            updateFields.push(`content = ?`);
            values.push(content);
        }
        if (content_type) {
            updateFields.push(`content_type = ?`);
            values.push(content_type);
        }
        if (status) {
            updateFields.push(`status = ?`);
            values.push(status);
            if (status === 'published') {
                updateFields.push(`published_at = CURRENT_TIMESTAMP`);
            }
        }
        // Aggiorna featured_image_url solo se è stata caricata una nuova immagine
        if (featuredImageUrl) {
            updateFields.push(`featured_image_url = ?`);
            values.push(featuredImageUrl);
        }
        if (tags) {
            updateFields.push(`tags = ?`);
            values.push(tagsArray);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nessun campo da aggiornare'
            });
        }

        values.push(id);
        const result = await query(`
            UPDATE site_content 
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `, values);

        res.status(200).json({
            success: true,
            message: 'Contenuto aggiornato con successo',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update content error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento del contenuto'
        });
    }
});

// DELETE /api/content/:id - Elimina contenuto (solo moderatori e admin)
router.delete('/:id', authenticateToken, requireRole('moderator', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Verifica che il contenuto esista
        const existingContent = await query(`
            SELECT author_id FROM site_content WHERE id = ?
        `, [id]);

        if (existingContent.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Contenuto non trovato'
            });
        }

        // Solo l'autore o un admin può eliminare
        if (existingContent.rows[0].author_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Non hai i permessi per eliminare questo contenuto'
            });
        }

        // Elimina i file allegati dal filesystem
        const filesResult = await query(`
            SELECT file_path FROM content_files WHERE content_id = ?
        `, [id]);

        for (const file of filesResult.rows) {
            try {
                if (fs.existsSync(file.file_path)) {
                    fs.unlinkSync(file.file_path);
                }
            } catch (fileError) {
                console.error('Error deleting file:', fileError);
            }
        }

        // Elimina il contenuto (i file allegati vengono eliminati automaticamente per CASCADE)
        await query(`DELETE FROM site_content WHERE id = ?`, [id]);

        res.status(200).json({
            success: true,
            message: 'Contenuto eliminato con successo'
        });
    } catch (error) {
        console.error('Delete content error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'eliminazione del contenuto'
        });
    }
});

export default router;



