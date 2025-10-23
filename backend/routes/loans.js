import express from 'express';
import { query } from '../database/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/loans - Ottieni tutti i prestiti (solo tesorieri)
router.get('/', authenticateToken, requireRole('treasurer', 'admin'), async (req, res) => {
    try {
        const { status, user_id, limit = 100, offset = 0 } = req.query;

        let whereClause = 'WHERE 1=1';
        let queryParams = [];
        let paramCount = 0;

        // Filtro per stato
        if (status) {
            whereClause += ` AND status = ?`;
            queryParams.push(status);
        }

        // Filtro per utente
        if (user_id) {
            whereClause += ` AND user_id = ?`;
            queryParams.push(user_id);
        }

        const result = await query(
            `SELECT * FROM loans_with_user
             ${whereClause}
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [...queryParams, parseInt(limit), parseInt(offset)]
        );

        res.status(200).json({
            success: true,
            data: { loans: result.rows }
        });

    } catch (error) {
        console.error('Get loans error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei prestiti'
        });
    }
});

// GET /api/loans/my - Ottieni i prestiti dell'utente corrente
router.get('/my', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await query(
            `SELECT 
                l.*,
                (SELECT COUNT(*) FROM loan_installments WHERE loan_id = l.id AND status = 'paid') as paid_count,
                (SELECT COUNT(*) FROM loan_installments WHERE loan_id = l.id AND status = 'overdue') as overdue_count
             FROM loans l
             WHERE l.user_id = ?
             ORDER BY l.created_at DESC`,
            [userId]
        );

        // Ottieni anche le rate per ogni prestito
        const loansWithInstallments = await Promise.all(
            result.rows.map(async (loan) => {
                const installments = await query(
                    'SELECT * FROM loan_installments WHERE loan_id = ? ORDER BY installment_number',
                    [loan.id]
                );
                return {
                    ...loan,
                    installments: installments.rows
                };
            })
        );

        res.status(200).json({
            success: true,
            data: { loans: loansWithInstallments }
        });

    } catch (error) {
        console.error('Get my loans error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei tuoi prestiti'
        });
    }
});

// GET /api/loans/my/stats - Statistiche prestiti utente
router.get('/my/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await query(
            'SELECT * FROM get_user_loan_stats(?)',
            [userId]
        );

        res.status(200).json({
            success: true,
            data: { stats: result.rows[0] }
        });

    } catch (error) {
        console.error('Get loan stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle statistiche'
        });
    }
});

// GET /api/loans/:id - Ottieni dettagli prestito
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const isAuthorized = req.user.role === 'treasurer' || req.user.role === 'admin';

        // Recupera il prestito
        const loanResult = await query(
            'SELECT * FROM loans_with_user WHERE id = ?',
            [id]
        );

        if (loanResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Prestito non trovato'
            });
        }

        const loan = loanResult.rows[0];

        // Verifica autorizzazione (proprietario o tesoriere)
        if (loan.user_id !== userId && !isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'Non autorizzato a visualizzare questo prestito'
            });
        }

        // Recupera le rate
        const installmentsResult = await query(
            'SELECT * FROM loan_installments WHERE loan_id = ? ORDER BY installment_number',
            [id]
        );

        res.status(200).json({
            success: true,
            data: {
                loan,
                installments: installmentsResult.rows
            }
        });

    } catch (error) {
        console.error('Get loan details error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dei dettagli del prestito'
        });
    }
});

// POST /api/loans - Richiedi un nuovo prestito
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, reason, total_installments = 10 } = req.body;

        // Validazione
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Importo non valido'
            });
        }

        if (!reason || reason.trim().length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Inserisci una motivazione valida (almeno 10 caratteri)'
            });
        }

        if (total_installments < 1 || total_installments > 12) {
            return res.status(400).json({
                success: false,
                message: 'Il numero di rate deve essere tra 1 e 12'
            });
        }

        // Verifica che l'utente non abbia prestiti attivi
        const activeLoansResult = await query(
            'SELECT COUNT(*) as count FROM loans WHERE user_id = ? AND status IN (?, ?)',
            [userId, 'pending', 'active']
        );

        if (parseInt(activeLoansResult.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                message: 'Hai già un prestito attivo o in attesa di approvazione'
            });
        }

        // Calcola l'importo della rata
        const installmentAmount = amount / total_installments;

        // Crea il prestito
        const result = await query(
            `INSERT INTO loans (
                user_id, amount, reason, total_installments, 
                installment_amount, remaining_amount, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [userId, amount, reason, total_installments, installmentAmount, amount, 'pending']
        );

        res.status(201).json({
            success: true,
            message: 'Richiesta di prestito inviata con successo',
            data: { loan: result.rows[0] }
        });

    } catch (error) {
        console.error('Create loan error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella creazione della richiesta di prestito'
        });
    }
});

// PUT /api/loans/:id/approve - Approva un prestito (solo tesorieri)
router.put('/:id/approve', authenticateToken, requireRole('treasurer', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const treasurerId = req.user.id;
        const { start_date } = req.body;

        const startDate = start_date || new Date().toISOString().split('T')[0];

        await query(
            'SELECT approve_loan(?, ?, ?)',
            [id, treasurerId, startDate]
        );

        res.status(200).json({
            success: true,
            message: 'Prestito approvato con successo'
        });

    } catch (error) {
        console.error('Approve loan error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Errore nell\'approvazione del prestito'
        });
    }
});

// PUT /api/loans/:id/reject - Rifiuta un prestito (solo tesorieri)
router.put('/:id/reject', authenticateToken, requireRole('treasurer', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const treasurerId = req.user.id;
        const { notes } = req.body;

        await query(
            'SELECT reject_loan(?, ?, ?)',
            [id, treasurerId, notes || null]
        );

        res.status(200).json({
            success: true,
            message: 'Prestito rifiutato'
        });

    } catch (error) {
        console.error('Reject loan error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Errore nel rifiuto del prestito'
        });
    }
});

// PUT /api/loans/installments/:id/confirm - Conferma pagamento rata (solo tesorieri)
router.put('/installments/:id/confirm', authenticateToken, requireRole('treasurer', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const treasurerId = req.user.id;
        const { payment_method = 'cash', notes } = req.body;

        await query(
            'SELECT confirm_installment_payment(?, ?, ?, ?)',
            [id, treasurerId, payment_method, notes || null]
        );

        res.status(200).json({
            success: true,
            message: 'Pagamento rata confermato con successo'
        });

    } catch (error) {
        console.error('Confirm installment error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Errore nella conferma del pagamento'
        });
    }
});

// GET /api/loans/installments/overdue - Ottieni rate scadute
router.get('/installments/overdue', authenticateToken, requireRole('treasurer', 'admin'), async (req, res) => {
    try {
        // Prima aggiorna lo stato delle rate scadute
        await query('SELECT update_overdue_installments()');

        // Poi recupera le rate scadute
        const result = await query(
            `SELECT 
                li.*,
                l.user_id,
                u.username,
                u.first_name,
                u.last_name,
                u.email,
                u.phone
             FROM loan_installments li
             JOIN loans l ON li.loan_id = l.id
             JOIN users u ON l.user_id = u.id
             WHERE li.status = 'overdue'
             ORDER BY li.due_date ASC`
        );

        res.status(200).json({
            success: true,
            data: { overdueInstallments: result.rows }
        });

    } catch (error) {
        console.error('Get overdue installments error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle rate scadute'
        });
    }
});

// GET /api/loans/stats/summary - Statistiche generali prestiti (solo tesorieri)
router.get('/stats/summary', authenticateToken, requireRole('treasurer', 'admin'), async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'pending') as pending_loans,
                COUNT(*) FILTER (WHERE status = 'active') as active_loans,
                COUNT(*) FILTER (WHERE status = 'completed') as completed_loans,
                COALESCE(SUM(amount) FILTER (WHERE status = 'active'), 0) as total_active_amount,
                COALESCE(SUM(remaining_amount) FILTER (WHERE status = 'active'), 0) as total_remaining,
                (
                    SELECT COUNT(*)
                    FROM loan_installments
                    WHERE status = 'overdue'
                ) as overdue_installments
            FROM loans
        `);

        res.status(200).json({
            success: true,
            data: { summary: result.rows[0] }
        });

    } catch (error) {
        console.error('Get loans summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle statistiche'
        });
    }
});

export default router;

