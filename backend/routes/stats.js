import express from 'express';
import { query } from '../database/db.js';

const router = express.Router();

// GET /api/stats - Statistiche pubbliche per la home (senza auth)
router.get('/', async (req, res) => {
    try {
        const [membersResult, eventsResult] = await Promise.all([
            query('SELECT COUNT(*) as count FROM users WHERE status = ?', ['active']),
            query('SELECT COUNT(*) as count FROM site_content WHERE status = ?', ['published'])
        ]);

        res.status(200).json({
            success: true,
            data: {
                members: parseInt(membersResult.rows[0]?.count ?? 0),
                events: parseInt(eventsResult.rows[0]?.count ?? 0)
            }
        });
    } catch (error) {
        console.error('Get public stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle statistiche'
        });
    }
});

export default router;
