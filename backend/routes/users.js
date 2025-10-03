import express from 'express';
import bcrypt from 'bcrypt';
import { query } from '../database/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { validateProfileUpdate } from '../middleware/validation.js';

const router = express.Router();

// GET /api/users/profile/:id - Ottieni profilo pubblico utente
router.get('/profile/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT id, uuid, username, first_name, last_name, avatar_url, bio, 
                    country_of_origin, city, created_at
             FROM users WHERE id = $1 AND status = 'active'`,
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
            data: {
                user: result.rows[0]
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero del profilo'
        });
    }
});

// PUT /api/users/profile - Aggiorna proprio profilo
router.put('/profile', authenticateToken, validateProfileUpdate, async (req, res) => {
    try {
        const { 
            first_name, last_name, phone, bio, 
            country_of_origin, date_of_birth, address, 
            city, province, postal_code 
        } = req.body;

        const result = await query(
            `UPDATE users 
             SET first_name = COALESCE($1, first_name),
                 last_name = COALESCE($2, last_name),
                 phone = COALESCE($3, phone),
                 bio = COALESCE($4, bio),
                 country_of_origin = COALESCE($5, country_of_origin),
                 date_of_birth = COALESCE($6, date_of_birth),
                 address = COALESCE($7, address),
                 city = COALESCE($8, city),
                 province = COALESCE($9, province),
                 postal_code = COALESCE($10, postal_code)
             WHERE id = $11
             RETURNING id, uuid, username, email, first_name, last_name, phone, bio, 
                      country_of_origin, city, province, avatar_url`,
            [first_name, last_name, phone, bio, country_of_origin, 
             date_of_birth, address, city, province, postal_code, req.user.id]
        );

        res.json({
            success: true,
            message: 'Profilo aggiornato con successo',
            data: {
                user: result.rows[0]
            }
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
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({
                success: false,
                message: 'Password corrente e nuova richieste'
            });
        }

        // Verifica password corrente
        const userResult = await query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );

        const isValidPassword = await bcrypt.compare(
            current_password, 
            userResult.rows[0].password_hash
        );

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Password corrente non corretta'
            });
        }

        // Hash nuova password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(new_password, saltRounds);

        await query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [password_hash, req.user.id]
        );

        res.json({
            success: true,
            message: 'Password cambiata con successo'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel cambio password'
        });
    }
});

// GET /api/users/:id - Ottieni profilo di un utente specifico
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT id, uuid, username, email, first_name, last_name, phone, 
                    country_of_origin, role, status, created_at
             FROM users WHERE id = $1 AND status = 'active'`,
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
            data: {
                user: result.rows[0]
            }
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero del profilo utente'
        });
    }
});

// GET /api/users - Lista utenti (per tutti gli utenti autenticati)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', role = '', status = '' } = req.query;
        const offset = (page - 1) * limit;

        let queryText = `
            SELECT id, uuid, username, email, first_name, last_name, role, status, 
                   created_at, last_login
            FROM users
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (search) {
            queryText += ` AND (username ILIKE $${paramCount} OR email ILIKE $${paramCount} OR first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        if (role) {
            queryText += ` AND role = $${paramCount}`;
            params.push(role);
            paramCount++;
        }

        if (status) {
            queryText += ` AND status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        queryText += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await query(queryText, params);

        // Conta totale
        const countResult = await query(
            'SELECT COUNT(*) FROM users WHERE 1=1' + 
            (search ? ` AND (username ILIKE '%${search}%' OR email ILIKE '%${search}%')` : '') +
            (role ? ` AND role = '${role}'` : '') +
            (status ? ` AND status = '${status}'` : '')
        );

        res.json({
            success: true,
            data: {
                users: result.rows,
                pagination: {
                    total: parseInt(countResult.rows[0].count),
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(countResult.rows[0].count / limit)
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

// PUT /api/users/:id/status - Cambia stato utente (solo admin)
router.put('/:id/status', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['active', 'inactive', 'suspended', 'pending'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Stato non valido'
            });
        }

        const result = await query(
            'UPDATE users SET status = $1 WHERE id = $2 RETURNING id, username, email, status',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utente non trovato'
            });
        }

        res.json({
            success: true,
            message: 'Stato utente aggiornato',
            data: {
                user: result.rows[0]
            }
        });
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento dello stato'
        });
    }
});

// PUT /api/users/:id/role - Cambia ruolo utente (solo admin)
router.put('/:id/role', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['user', 'admin', 'moderator'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Ruolo non valido'
            });
        }

        const result = await query(
            'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, email, role',
            [role, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utente non trovato'
            });
        }

        res.json({
            success: true,
            message: 'Ruolo utente aggiornato',
            data: {
                user: result.rows[0]
            }
        });
    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento del ruolo'
        });
    }
});

// DELETE /api/users/:id - Elimina utente (solo admin)
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        // Non permettere di eliminare se stesso
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Non puoi eliminare il tuo account da qui'
            });
        }

        const result = await query(
            'DELETE FROM users WHERE id = $1 RETURNING id, username',
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
