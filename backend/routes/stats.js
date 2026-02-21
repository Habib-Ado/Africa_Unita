import express from 'express';
import { query } from '../database/db.js';

const router = express.Router();

// GET /api/stats - Statistiche pubbliche per la home (senza auth)
router.get('/', async (req, res) => {
    try {
        const [membersResult, contentResult, meetingsResult] = await Promise.all([
            query('SELECT COUNT(*) as count FROM users WHERE status = ?', ['active']),
            query('SELECT COUNT(*) as count FROM site_content WHERE status = ?', ['published']),
            query('SELECT COUNT(*) as count FROM meetings')
        ]);

        const contentCount = parseInt(Array.isArray(contentResult.rows) ? contentResult.rows[0]?.count ?? 0 : contentResult.rows?.count ?? 0);
        const meetingsCount = parseInt(Array.isArray(meetingsResult.rows) ? meetingsResult.rows[0]?.count ?? 0 : meetingsResult.rows?.count ?? 0);
        const eventsTotal = contentCount + meetingsCount;

        res.status(200).json({
            success: true,
            data: {
                members: parseInt(Array.isArray(membersResult.rows) ? membersResult.rows[0]?.count ?? 0 : membersResult.rows?.count ?? 0),
                events: eventsTotal
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
