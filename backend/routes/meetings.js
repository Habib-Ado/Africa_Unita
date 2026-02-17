import express from 'express';
import { query } from '../database/db.js';
import pool from '../database/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import emailService from '../services/emailService.js';

const router = express.Router();

// Helper function per inviare notifiche via email a tutti i membri attivi
async function notifyAllMembers(type, title, message, link) {
    try {
        console.log(`📧 Invio notifiche email: tipo=${type}, titolo="${title}"`);
        
        // Verifica che le credenziali email siano configurate
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.error('❌ Credenziali email non configurate! Imposta EMAIL_USER e EMAIL_PASS nel file .env');
            console.error('   EMAIL_USER presente:', !!process.env.EMAIL_USER);
            console.error('   EMAIL_PASS presente:', !!process.env.EMAIL_PASS);
            return;
        }
        
        // Ottieni tutti i membri attivi con email
        const activeMembersResult = await query(`
            SELECT id, email, first_name, last_name, username 
            FROM users 
            WHERE status = 'active' AND email IS NOT NULL AND email != ''
        `, []);

        const activeMembers = activeMembersResult.rows || [];
        console.log(`Trovati ${activeMembers.length} membri attivi con email`);
        
        if (activeMembers.length === 0) {
            console.log('⚠️ Nessun membro attivo con email trovato per le notifiche');
            return;
        }

        // Prepara il link completo
        const baseUrl = process.env.CORS_ORIGIN || process.env.RAILWAY_PUBLIC_DOMAIN 
            ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
            : 'http://localhost:8080';
        const fullLink = link ? `${baseUrl}${link}` : `${baseUrl}/meetings`;

        // Invia email a ogni membro
        const emailPromises = activeMembers.map(async (member) => {
            const userId = member.id || member.ID || member.user_id;
            const userEmail = member.email;
            const userName = member.first_name || member.username || 'Membro';
            
            if (!userId || !userEmail) {
                console.warn(`⚠️ Membro senza ID o email valido:`, { userId, email: userEmail });
                return { skipped: true };
            }
            
            try {
                // Crea il template HTML per l'email
                const emailHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <title>${title} - Africa Unita</title>
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                            .header { background: #2c5530; color: white; padding: 20px; text-align: center; }
                            .content { padding: 30px; background: #f9f9f9; }
                            .message-box { background: #fff; padding: 20px; border-left: 4px solid #2c5530; margin: 20px 0; }
                            .button { 
                                display: inline-block; 
                                background: #2c5530; 
                                color: white; 
                                padding: 12px 30px; 
                                text-decoration: none; 
                                border-radius: 5px; 
                                margin: 20px 0;
                            }
                            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>🌍 Africa Unita</h1>
                                <p>Associazione di supporto per migranti africani</p>
                            </div>
                            <div class="content">
                                <h2>Ciao ${userName}!</h2>
                                <div class="message-box">
                                    <h3>${title}</h3>
                                    <p style="white-space: pre-line;">${message}</p>
                                </div>
                                <p>Per maggiori informazioni, visita la piattaforma:</p>
                                <a href="${fullLink}" class="button">📅 Vedi Riunioni</a>
                            </div>
                            <div class="footer">
                                <p>Africa Unita - Uniti per un futuro migliore</p>
                                <p>Questa è una notifica automatica. Non rispondere a questa email.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `;

                // Invia l'email usando il servizio email
                const emailSent = await emailService.sendEmail(userEmail, title, emailHtml);
                
                if (!emailSent) {
                    throw new Error('Invio email fallito');
                }
                
                console.log(`✅ Email inviata a: ${userEmail} (${userName})`);
                
                // Salva anche nel database per riferimento
                await query(`
                    INSERT INTO notifications (user_id, type, title, message, link)
                    VALUES (?, ?, ?, ?, ?)
                `, [userId, type, title, message, link || null]).catch(err => {
                    console.warn(`⚠️ Errore salvataggio notifica DB per ${userId}:`, err.message);
                });
                
                return { success: true, userId, email: userEmail };
            } catch (err) {
                console.error(`❌ Errore invio email a ${userEmail}:`, err.message);
                return { success: false, userId, email: userEmail, error: err.message };
            }
        });

        const results = await Promise.all(emailPromises);
        const successCount = results.filter(r => r && r.success).length;
        const failedCount = results.filter(r => r && !r.success && !r.skipped).length;
        const skippedCount = results.filter(r => r && r.skipped).length;
        
        console.log(`✅ Email inviate: ${successCount}/${activeMembers.length} membri attivi`);
        if (failedCount > 0) {
            console.log(`❌ Email fallite: ${failedCount}`);
        }
        if (skippedCount > 0) {
            console.log(`⚠️ Email saltate (dati mancanti): ${skippedCount}`);
        }
    } catch (error) {
        console.error('❌ Errore nell\'invio delle notifiche email:', error);
        console.error('Stack trace:', error.stack);
        // Non bloccare il processo principale se le notifiche falliscono
    }
}

// GET /api/meetings - Ottieni tutte le riunioni (pubblico per scheduled, autenticato per altro)
router.get('/', async (req, res) => {
    try {
        const { status, year, month } = req.query;
        
        // Verifica autenticazione opzionale
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        let isAuthenticated = false;
        
        if (token) {
            try {
                const jwt = (await import('jsonwebtoken')).default;
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'africa-unita-secret-key-2024');
                isAuthenticated = true;
            } catch (err) {
                // Token invalido, continua come non autenticato
            }
        }
        
        // Se non autenticato, permetti solo visualizzazione riunioni "scheduled"
        if (!isAuthenticated && status !== 'scheduled') {
            return res.status(401).json({
                success: false,
                message: 'Autenticazione richiesta'
            });
        }
        
        let sql = `
            SELECT m.*, 
                   CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
                   COUNT(DISTINCT CASE WHEN ma.status = 'present' THEN ma.id END) as present_count,
                   COUNT(DISTINCT CASE WHEN ma.status = 'absent' THEN ma.id END) as absent_count,
                   COUNT(DISTINCT CASE WHEN ma.status = 'justified' THEN ma.id END) as justified_count
            FROM meetings m
            LEFT JOIN users u ON m.created_by = u.id
            LEFT JOIN meeting_attendance ma ON m.id = ma.meeting_id
        `;
        
        const conditions = [];
        const values = [];
        
        if (status) {
            conditions.push(`m.status = ?`);
            values.push(status);
        } else if (!isAuthenticated) {
            // Se non autenticato e nessuno status specificato, mostra solo scheduled
            conditions.push(`m.status = ?`);
            values.push('scheduled');
        }
        
        if (year) {
            conditions.push(`YEAR(m.meeting_date) = ?`);
            values.push(year);
        }
        
        if (month) {
            conditions.push(`MONTH(m.meeting_date) = ?`);
            values.push(month);
        }
        
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        
        sql += ' GROUP BY m.id, u.first_name, u.last_name ORDER BY m.meeting_date DESC';
        
        const result = await query(sql, values);
        
        res.json({
            success: true,
            data: {
                meetings: result.rows,
                count: result.rows.length
            }
        });
    } catch (error) {
        console.error('Error fetching meetings:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle riunioni'
        });
    }
});

// GET /api/meetings/:id - Ottieni dettagli riunione specifica
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const meetingResult = await query(`
            SELECT m.*, 
                   CONCAT(u.first_name, ' ', u.last_name) as created_by_name
            FROM meetings m
            LEFT JOIN users u ON m.created_by = u.id
            WHERE m.id = ?
        `, [id]);
        
        if (meetingResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Riunione non trovata'
            });
        }
        
        // Ottieni anche le presenze
        const attendanceResult = await query(`
            SELECT ma.*, 
                   u.id as user_id,
                   u.username,
                   u.first_name,
                   u.last_name,
                   u.email,
                   CONCAT(marker.first_name, ' ', marker.last_name) as marked_by_name
            FROM meeting_attendance ma
            JOIN users u ON ma.user_id = u.id
            LEFT JOIN users marker ON ma.marked_by = marker.id
            WHERE ma.meeting_id = ?
            ORDER BY u.last_name, u.first_name
        `, [id]);
        
        res.json({
            success: true,
            data: {
                meeting: meetingResult.rows[0],
                attendance: attendanceResult.rows
            }
        });
    } catch (error) {
        console.error('Error fetching meeting:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero della riunione'
        });
    }
});

// POST /api/meetings - Crea nuova riunione (richiede ruolo moderatore o admin)
router.post('/', authenticateToken, requireRole(['moderator', 'admin']), async (req, res) => {
    try {
        const { title, description, meeting_date, meeting_time, location } = req.body;
        const userId = req.user.id;
        
        if (!title || !meeting_date) {
            return res.status(400).json({
                success: false,
                message: 'Titolo e data sono obbligatori'
            });
        }
        
        const result = await query(`
            INSERT INTO meetings (title, description, meeting_date, meeting_time, location, created_by, status)
            VALUES (?, ?, ?, ?, ?, ?, 'scheduled')
        `, [title, description, meeting_date, meeting_time, location, userId]);
        
        let newMeetingId = result.rows?.insertId;
        if (newMeetingId == null && result.rows && !Array.isArray(result.rows)) {
            newMeetingId = result.rows.insertId;
        }
        if (newMeetingId == null) {
            const idResult = await query('SELECT LAST_INSERT_ID() as id', []);
            const row = Array.isArray(idResult.rows) ? idResult.rows[0] : idResult.rows;
            if (row && typeof row.id !== 'undefined') newMeetingId = row.id;
            else if (row && typeof row.ID !== 'undefined') newMeetingId = row.ID;
        }
        
        // Crea automaticamente le presenze per tutti gli utenti attivi
        await query(`
            INSERT INTO meeting_attendance (meeting_id, user_id, status)
            SELECT ?, id, 'absent'
            FROM users
            WHERE status = 'active'
            AND id IS NOT NULL
        `, [newMeetingId]);
        
        // Formatta la data per il messaggio
        const meetingDate = new Date(meeting_date).toLocaleDateString('it-IT', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const timeStr = meeting_time ? ` alle ${meeting_time}` : '';
        const locationStr = location ? ` presso ${location}` : '';
        
        // Recupera la riunione appena creata
        const createdMeeting = await query(`
            SELECT m.*, 
                   CONCAT(u.first_name, ' ', u.last_name) as created_by_name
            FROM meetings m
            LEFT JOIN users u ON m.created_by = u.id
            WHERE m.id = ?
        `, [newMeetingId]);
        
        // Invia notifiche a tutti i membri attivi (non bloccare la risposta se fallisce)
        notifyAllMembers(
            'meeting_created',
            '📅 Nuova Riunione Programmata',
            `È stata programmata una nuova riunione: "${title}" il ${meetingDate}${timeStr}${locationStr}.${description ? `\n\n${description}` : ''}`,
            `/meetings`
        ).catch(err => {
            console.error('❌ Errore nell\'invio delle notifiche email:', err);
            console.error('Stack:', err.stack);
        });
        
        res.status(201).json({
            success: true,
            message: 'Riunione creata con successo',
            data: { meeting: createdMeeting.rows[0] }
        });
    } catch (error) {
        console.error('Error creating meeting:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella creazione della riunione'
        });
    }
});

// PUT /api/meetings/:id - Aggiorna riunione (richiede ruolo moderatore o admin)
router.put('/:id', authenticateToken, requireRole(['moderator', 'admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, meeting_date, meeting_time, location, status } = req.body;
        
        // Verifica che la riunione esista
        const existingMeeting = await query('SELECT id FROM meetings WHERE id = ?', [id]);
        if (existingMeeting.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Riunione non trovata'
            });
        }
        
        // Costruisci la query UPDATE solo con i campi forniti (non null/undefined)
        const updateFields = [];
        const values = [];
        
        if (title !== undefined && title !== null) {
            updateFields.push('title = ?');
            values.push(title);
        }
        if (description !== undefined && description !== null) {
            updateFields.push('description = ?');
            values.push(description);
        }
        if (meeting_date !== undefined && meeting_date !== null && meeting_date !== '') {
            updateFields.push('meeting_date = ?');
            values.push(meeting_date);
        }
        if (meeting_time !== undefined && meeting_time !== null) {
            updateFields.push('meeting_time = ?');
            values.push(meeting_time);
        }
        if (location !== undefined && location !== null) {
            updateFields.push('location = ?');
            values.push(location);
        }
        if (status !== undefined && status !== null) {
            updateFields.push('status = ?');
            values.push(status);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nessun campo da aggiornare'
            });
        }
        
        // Aggiungi sempre updated_at
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        
        await query(`
            UPDATE meetings
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `, values);
        
        // Recupera la riunione aggiornata
        const updatedMeeting = await query(`
            SELECT m.*, 
                   CONCAT(u.first_name, ' ', u.last_name) as created_by_name
            FROM meetings m
            LEFT JOIN users u ON m.created_by = u.id
            WHERE m.id = ?
        `, [id]);
        
        const meeting = updatedMeeting.rows[0];
        
        // Formatta la data per il messaggio
        const meetingDate = meeting.meeting_date ? new Date(meeting.meeting_date).toLocaleDateString('it-IT', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : '';
        const timeStr = meeting.meeting_time ? ` alle ${meeting.meeting_time}` : '';
        const locationStr = meeting.location ? ` presso ${meeting.location}` : '';
        
        // Invia notifiche a tutti i membri attivi (non bloccare la risposta se fallisce)
        notifyAllMembers(
            'meeting_updated',
            '✏️ Riunione Aggiornata',
            `La riunione "${meeting.title}" è stata aggiornata.${meetingDate ? `\n\nNuova data: ${meetingDate}${timeStr}${locationStr}` : ''}${meeting.description ? `\n\n${meeting.description}` : ''}`,
            `/meetings`
        ).catch(err => {
            console.error('❌ Errore nell\'invio delle notifiche email:', err);
            console.error('Stack:', err.stack);
        });
        
        res.json({
            success: true,
            message: 'Riunione aggiornata con successo',
            data: { meeting: meeting }
        });
    } catch (error) {
        console.error('Error updating meeting:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Errore nell\'aggiornamento della riunione'
        });
    }
});

// DELETE /api/meetings/:id - Elimina riunione (richiede ruolo moderatore o admin)
router.delete('/:id', authenticateToken, requireRole(['moderator', 'admin']), async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query('DELETE FROM meetings WHERE id = ?', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Riunione non trovata'
            });
        }
        
        res.json({
            success: true,
            message: 'Riunione eliminata con successo'
        });
    } catch (error) {
        console.error('Error deleting meeting:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'eliminazione della riunione'
        });
    }
});

// POST /api/meetings/:id/attendance - Aggiorna presenze riunione (richiede ruolo moderatore o admin)
router.post('/:id/attendance', authenticateToken, requireRole(['moderator', 'admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { attendance } = req.body; // Array di { user_id, status, justification }
        const markedBy = req.user.id;
        
        if (!Array.isArray(attendance)) {
            return res.status(400).json({
                success: false,
                message: 'Formato dati non valido'
            });
        }
        
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            for (const record of attendance) {
                await connection.execute(`
                    UPDATE meeting_attendance
                    SET status = ?,
                        justification = ?,
                        marked_by = ?,
                        marked_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE meeting_id = ? AND user_id = ?
                `, [record.status, record.justification || null, markedBy, id, record.user_id]);
            }
            
            await connection.commit();
            
            res.json({
                success: true,
                message: 'Presenze aggiornate con successo'
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error updating attendance:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento delle presenze'
        });
    }
});

// GET /api/meetings/user/:userId/stats - Ottieni statistiche presenze utente
router.get('/user/:userId/stats', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Verifica che l'utente possa vedere solo le proprie statistiche (a meno che non sia moderatore/admin)
        if (req.user.id !== parseInt(userId) && !['moderator', 'admin', 'treasurer'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Non autorizzato'
            });
        }
        
        const statsResult = await query(`
            SELECT * FROM user_meeting_stats WHERE user_id = ?
        `, [userId]);
        
        // Ottieni le multe pendenti
        const penaltiesResult = await query(`
            SELECT mp.*,
                   m1.meeting_date as meeting1_date,
                   m1.title as meeting1_title,
                   m2.meeting_date as meeting2_date,
                   m2.title as meeting2_title
            FROM meeting_penalties mp
            JOIN meetings m1 ON mp.meeting1_id = m1.id
            JOIN meetings m2 ON mp.meeting2_id = m2.id
            WHERE mp.user_id = ?
            ORDER BY mp.created_at DESC
        `, [userId]);
        
        // Ottieni le ultime presenze
        const recentAttendanceResult = await query(`
            SELECT ma.*, m.title, m.meeting_date
            FROM meeting_attendance ma
            JOIN meetings m ON ma.meeting_id = m.id
            WHERE ma.user_id = ?
            ORDER BY m.meeting_date DESC
            LIMIT 10
        `, [userId]);
        
        res.json({
            success: true,
            data: {
                stats: statsResult.rows[0] || {
                    total_present: 0,
                    total_absent: 0,
                    total_justified: 0,
                    pending_penalties: 0,
                    total_penalty_amount: 0
                },
                penalties: penaltiesResult.rows,
                recent_attendance: recentAttendanceResult.rows
            }
        });
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle statistiche'
        });
    }
});

// PUT /api/meetings/penalties/:id - Aggiorna stato multa (solo admin/treasurer)
router.put('/penalties/:id', authenticateToken, requireRole(['admin', 'treasurer']), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, paid_date, notes } = req.body;
        
        const result = await query(`
            UPDATE meeting_penalties
            SET status = COALESCE(?, status),
                paid_date = COALESCE(?, paid_date),
                notes = COALESCE(?, notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [status, paid_date, notes, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Multa non trovata'
            });
        }
        
        res.json({
            success: true,
            message: 'Multa aggiornata con successo',
            data: { penalty: result.rows[0] }
        });
    } catch (error) {
        console.error('Error updating penalty:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento della multa'
        });
    }
});

export default router;

