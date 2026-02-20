import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurazione Multer per avatar
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/avatars');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Solo immagini sono permesse (jpeg, jpg, png, gif)'));
    }
});

const router = express.Router();

// GET /api/users - Ottieni lista utenti
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search, role, limit = 50, offset = 0, showBlocked = false } = req.query;

        // Se l'utente è admin, può vedere anche gli utenti bloccati
        let whereClause = 'WHERE status != ?';
        let queryParams = ['deleted'];
        let paramCount = 1;

        // Se showBlocked è false, mostra solo utenti attivi
        if (showBlocked === 'false' || showBlocked === false) {
            whereClause = 'WHERE status = ?';
            queryParams = ['active'];
        }

        // Filtro per ricerca
        if (search && search.trim()) {
            whereClause += ` AND (
                first_name LIKE ? OR 
                last_name LIKE ? OR 
                username LIKE ? OR 
                email LIKE ?
            )`;
            const searchTerm = `%${search.trim()}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Filtro per ruolo
        if (role && role !== 'all') {
            whereClause += ` AND role = ?`;
            queryParams.push(role);
        }

        // Query principale (LIMIT e OFFSET devono essere nella stringa, non come placeholder)
        const limitNum = parseInt(limit) || 50;
        const offsetNum = parseInt(offset) || 0;
        
        const result = await query(
            `SELECT id, uuid, username, email, first_name, last_name, role, status, created_at, last_login
             FROM users 
             ${whereClause}
             ORDER BY created_at DESC
             LIMIT ${limitNum} OFFSET ${offsetNum}`,
            queryParams
        );

        // Conteggio totale per paginazione
        const countResult = await query(
            `SELECT COUNT(*) as total FROM users ${whereClause}`,
            queryParams
        );

        res.status(200).json({
            success: true,
            data: {
                users: result.rows,
                pagination: {
                    total: parseInt(countResult.rows[0].total),
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            }
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero degli utenti'
        });
    }
});

// GET /api/users/pending - Ottieni utenti in attesa di approvazione (solo admin)
router.get('/pending', authenticateToken, async (req, res) => {
    try {
        // Verifica che l'utente sia admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Permessi insufficienti'
            });
        }

        const { limit = 50, offset = 0 } = req.query;

        const limitNum = parseInt(limit) || 50;
        const offsetNum = parseInt(offset) || 0;

        // Recupera utenti in attesa
        const result = await query(
            `SELECT id, uuid, username, email, first_name, last_name, role, status, created_at, country_of_origin, phone
             FROM users 
             WHERE status = 'pending'
             ORDER BY created_at ASC
             LIMIT ${limitNum} OFFSET ${offsetNum}`
        );

        // Conteggio totale
        const countResult = await query(
            'SELECT COUNT(*) as total FROM users WHERE status = ?',
            ['pending']
        );

        res.status(200).json({
            success: true,
            data: {
                users: result.rows,
                pagination: {
                    total: parseInt(countResult.rows[0].total),
                    limit: limitNum,
                    offset: offsetNum
                }
            }
        });

    } catch (error) {
        console.error('Get pending users error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero degli utenti in attesa'
        });
    }
});

// GET /api/users/:id - Ottieni profilo utente specifico
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT id, uuid, username, email, first_name, last_name, role, status, 
                    phone, address, city, country_of_origin, date_of_birth, avatar_url,
                    created_at, last_login
             FROM users 
             WHERE id = ? AND status = ?`,
            [id, 'active']
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
        console.error('Get user profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero del profilo utente'
        });
    }
});

// PUT /api/users/profile - Aggiorna il proprio profilo
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { first_name, last_name, date_of_birth, phone, address, city, country_of_origin } = req.body;
        
        const result = await query(
            `UPDATE users
             SET first_name = COALESCE(?, first_name),
                 last_name = COALESCE(?, last_name),
                 date_of_birth = COALESCE(?, date_of_birth),
                 phone = COALESCE(?, phone),
                 address = COALESCE(?, address),
                 city = COALESCE(?, city),
                 country_of_origin = COALESCE(?, country_of_origin),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [first_name, last_name, date_of_birth, phone, address, city, country_of_origin, userId]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utente non trovato'
            });
        }
        
        // Recupera l'utente aggiornato
        const userResult = await query(
            `SELECT username, email, first_name, last_name, date_of_birth, phone, address, city, country_of_origin, role, avatar_url
             FROM users WHERE id = ?`,
            [userId]
        );
        
        res.json({
            success: true,
            message: 'Profilo aggiornato con successo',
            data: { user: userResult.rows[0] }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento del profilo'
        });
    }
});

// PUT /api/users/change-password - Cambia password
router.put('/change-password', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { current_password, new_password } = req.body;

        if (!new_password) {
            return res.status(400).json({
                success: false,
                message: 'Nuova password richiesta'
            });
        }

        // Validazione nuova password
        if (new_password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'La nuova password deve essere di almeno 8 caratteri'
            });
        }

        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(new_password)) {
            return res.status(400).json({
                success: false,
                message: 'La nuova password deve contenere almeno una lettera maiuscola, una minuscola e un numero'
            });
        }

        // Recupera utente con password hash e last_login
        const userResult = await query(
            'SELECT password_hash, last_login FROM users WHERE id = ?',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utente non trovato'
            });
        }

        const user = userResult.rows[0];
        const isFirstLogin = user.last_login === null;

        // Se non è il primo accesso, verifica la password corrente
        if (!isFirstLogin) {
            if (!current_password) {
                return res.status(400).json({
                    success: false,
                    message: 'Password corrente richiesta'
                });
            }

            const isValidPassword = await bcrypt.compare(current_password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Password corrente non corretta'
                });
            }
        }

        // Hash della nuova password
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

        // Aggiorna password e imposta last_login se è il primo accesso
        if (isFirstLogin) {
            await query(
                'UPDATE users SET password_hash = ?, last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [newPasswordHash, userId]
            );
        } else {
            await query(
                'UPDATE users SET password_hash = ? WHERE id = ?',
                [newPasswordHash, userId]
            );
        }

        res.json({
            success: true,
            message: isFirstLogin 
                ? 'Password impostata con successo! Ora puoi utilizzare la piattaforma.'
                : 'Password cambiata con successo'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore durante il cambio password'
        });
    }
});

// POST /api/users/profile/avatar - Aggiorna avatar
router.post('/profile/avatar', authenticateToken, uploadAvatar.single('avatar'), async (req, res) => {
    try {
        const userId = req.user.id;
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Nessun file caricato'
            });
        }
        
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        
        // Recupera il vecchio avatar per eliminarlo
        const oldAvatarResult = await query(
            'SELECT avatar_url FROM users WHERE id = ?',
            [userId]
        );
        
        // Aggiorna l'avatar nel database
        await query(
            `UPDATE users 
             SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [avatarUrl, userId]
        );
        
        // Elimina il vecchio avatar se esiste
        if (oldAvatarResult.rows[0]?.avatar_url) {
            const oldAvatarPath = path.join(__dirname, '..', oldAvatarResult.rows[0].avatar_url);
            if (fs.existsSync(oldAvatarPath)) {
                fs.unlinkSync(oldAvatarPath);
            }
        }
        
        // Recupera l'utente aggiornato
        const userResult = await query(
            'SELECT username, email, first_name, last_name, avatar_url FROM users WHERE id = ?',
            [userId]
        );
        
        res.json({
            success: true,
            message: 'Avatar aggiornato con successo',
            data: { 
                user: userResult.rows[0],
                avatarUrl: avatarUrl
            }
        });
    } catch (error) {
        console.error('Update avatar error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento dell\'avatar'
        });
    }
});

// PUT /api/users/:id/role - Cambia ruolo utente (solo admin)
router.put('/:id/role', authenticateToken, async (req, res) => {
    try {
        // Verifica che l'utente sia admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Permessi insufficienti'
            });
        }

        const { id } = req.params;
        const { role } = req.body;

        // Valida il ruolo
        const validRoles = ['admin', 'president', 'moderator', 'treasurer', 'user'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Ruolo non valido'
            });
        }

        // Aggiorna il ruolo
        const result = await query(
            `UPDATE users 
             SET role = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [role, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utente non trovato'
            });
        }

        // Recupera l'utente aggiornato
        const userResult = await query(
            'SELECT id, username, email, first_name, last_name, role FROM users WHERE id = ?',
            [id]
        );

        res.json({
            success: true,
            message: 'Ruolo aggiornato con successo',
            data: { user: userResult.rows[0] }
        });
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento del ruolo'
        });
    }
});

// PUT /api/users/:id/block - Blocca/sblocca utente (solo admin)
router.put('/:id/block', authenticateToken, async (req, res) => {
    try {
        // Verifica che l'utente sia admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Permessi insufficienti'
            });
        }

        const { id } = req.params;
        const { blocked } = req.body;

        // Non permettere di bloccare se stesso
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Non puoi bloccare il tuo account'
            });
        }

        // Cambia lo status in base al parametro blocked
        const newStatus = blocked ? 'blocked' : 'active';

        // Aggiorna lo status
        const result = await query(
            `UPDATE users 
             SET status = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND status != 'deleted'`,
            [newStatus, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utente non trovato'
            });
        }

        // Recupera l'utente aggiornato
        const userResult = await query(
            'SELECT username, email, first_name, last_name, status FROM users WHERE id = ?',
            [id]
        );

        res.json({
            success: true,
            message: blocked ? 'Utente bloccato con successo' : 'Utente sbloccato con successo',
            data: { user: userResult.rows[0] }
        });
    } catch (error) {
        console.error('Block/unblock user error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento dello stato utente'
        });
    }
});

// PUT /api/users/:id/approve - Approva utente in attesa (solo admin)
router.put('/:id/approve', authenticateToken, async (req, res) => {
    try {
        // Verifica che l'utente sia admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Permessi insufficienti'
            });
        }

        const { id } = req.params;

        // Verifica che l'utente esista e sia in attesa
        const userResult = await query(
            'SELECT id, username, email, first_name, last_name, status FROM users WHERE id = ?',
            [id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utente non trovato'
            });
        }

        const user = userResult.rows[0];

        if (user.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'L\'utente non è in attesa di approvazione'
            });
        }

        // Approva l'utente
        const result = await query(
            `UPDATE users 
             SET status = 'active', updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [id]
        );

        // TODO: Invia notifica email all'utente approvato

        res.json({
            success: true,
            message: 'Utente approvato con successo',
            data: { user: { ...user, status: 'active' } }
        });
    } catch (error) {
        console.error('Approve user error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'approvazione dell\'utente'
        });
    }
});

// PUT /api/users/:id/reject - Rifiuta utente in attesa (solo admin)
router.put('/:id/reject', authenticateToken, async (req, res) => {
    try {
        // Verifica che l'utente sia admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Permessi insufficienti'
            });
        }

        const { id } = req.params;
        const { reason } = req.body;

        // Verifica che l'utente esista e sia in attesa
        const userResult = await query(
            'SELECT id, username, email, first_name, last_name, status FROM users WHERE id = ?',
            [id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utente non trovato'
            });
        }

        const user = userResult.rows[0];

        if (user.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'L\'utente non è in attesa di approvazione'
            });
        }

        // Rifiuta l'utente (soft delete)
        const result = await query(
            `UPDATE users 
             SET status = 'deleted', updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [id]
        );

        // TODO: Invia notifica email all'utente rifiutato con la motivazione

        res.json({
            success: true,
            message: 'Utente rifiutato con successo',
            data: { user: { ...user, status: 'deleted' } }
        });
    } catch (error) {
        console.error('Reject user error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel rifiuto dell\'utente'
        });
    }
});

// DELETE /api/users/:id - Elimina utente (solo admin)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        // Verifica che l'utente sia admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Permessi insufficienti'
            });
        }

        const { id } = req.params;

        // Non permettere di eliminare se stesso
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Non puoi eliminare il tuo account'
            });
        }

        // Elimina l'utente (soft delete cambiando lo status)
        const result = await query(
            `UPDATE users 
             SET status = 'deleted', updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? 
             `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utente non trovato'
            });
        }

        res.json({
            success: true,
            message: 'Utente eliminato con successo'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'eliminazione dell\'utente'
        });
    }
});

export default router;