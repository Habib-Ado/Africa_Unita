import express from 'express';
import { query } from '../database/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/loans - Ottieni tutti i prestiti (solo tesorieri)
router.get('/', authenticateToken, requireRole('treasurer', 'admin'), async (req, res) => {
    try {
        const { status, user_id, limit = 100, offset = 0 } = req.query;
        const limitNum = Math.max(0, parseInt(limit, 10) || 100);
        const offsetNum = Math.max(0, parseInt(offset, 10) || 0);

        let whereClause = 'WHERE 1=1';
        let queryParams = [];

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
             LIMIT ${limitNum} OFFSET ${offsetNum}`,
            queryParams
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

// PUT /api/loans/:id/approve - Approva un prestito (solo tesorieri, logica in JS)
router.put('/:id/approve', authenticateToken, requireRole('treasurer', 'admin'), async (req, res) => {
    try {
        const loanId = parseInt(req.params.id, 10);
        const treasurerId = req.user.id;
        const { start_date } = req.body;
        const startDate = start_date || new Date().toISOString().split('T')[0];

        if (isNaN(loanId)) {
            return res.status(400).json({ success: false, message: 'ID prestito non valido' });
        }

        const loanResult = await query(
            'SELECT id, amount, total_installments, status FROM loans WHERE id = ?',
            [loanId]
        );
        if (!loanResult.rows || loanResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Prestito non trovato' });
        }

        const loan = loanResult.rows[0];
        if (loan.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Il prestito è già ${loan.status === 'active' ? 'approvato' : loan.status === 'rejected' ? 'rifiutato' : 'completato'}`
            });
        }

        const loanAmount = parseFloat(loan.amount) || 0;
        const totalInstallments = parseInt(loan.total_installments) || 10;
        const installmentAmount = loanAmount / totalInstallments;

        const balanceResult = await query(`
            SELECT COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE -amount END), 0) as balance
            FROM fund_transactions
        `);
        const availableBalance = parseFloat(balanceResult.rows?.[0]?.balance || 0);

        if (availableBalance < loanAmount) {
            return res.status(400).json({
                success: false,
                message: `Fondi insufficienti. Saldo disponibile: €${availableBalance.toFixed(2)}, importo richiesto: €${loanAmount.toFixed(2)}`
            });
        }

        await query(
            `UPDATE loans SET status = 'active', start_date = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'`,
            [startDate, treasurerId, loanId]
        );

        for (let i = 1; i <= totalInstallments; i++) {
            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            await query(
                `INSERT INTO loan_installments (loan_id, installment_number, amount, due_date, status) VALUES (?, ?, ?, ?, 'pending')`,
                [loanId, i, installmentAmount, dueDate.toISOString().split('T')[0]]
            );
        }

        await query(
            `INSERT INTO fund_transactions (transaction_type, amount, description, treasurer_id, reference_id) VALUES ('expense', ?, ?, ?, ?)`,
            [loanAmount, `Prestito approvato - ID: ${loanId}`, treasurerId, loanId]
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

// PUT /api/loans/:id/reject - Rifiuta un prestito (solo tesorieri, logica in JS)
router.put('/:id/reject', authenticateToken, requireRole('treasurer', 'admin'), async (req, res) => {
    try {
        const loanId = parseInt(req.params.id, 10);
        const treasurerId = req.user.id;
        const { notes } = req.body;

        if (isNaN(loanId)) {
            return res.status(400).json({ success: false, message: 'ID prestito non valido' });
        }

        const loanResult = await query(
            'SELECT id, status FROM loans WHERE id = ?',
            [loanId]
        );
        if (!loanResult.rows || loanResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Prestito non trovato' });
        }

        const loan = loanResult.rows[0];
        if (loan.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Il prestito è già ${loan.status === 'active' ? 'approvato' : loan.status === 'rejected' ? 'rifiutato' : 'completato'}`
            });
        }

        const updateResult = await query(
            `UPDATE loans SET status = 'rejected', rejected_by = ?, rejected_at = CURRENT_TIMESTAMP, rejection_notes = ? WHERE id = ? AND status = 'pending'`,
            [treasurerId, notes || null, loanId]
        );
        const affected = updateResult.rows && (updateResult.rows.affectedRows != null ? updateResult.rows.affectedRows : 0);
        if (Number(affected) === 0) {
            return res.status(400).json({
                success: false,
                message: 'Impossibile rifiutare il prestito (stato modificato)'
            });
        }

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
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_loans,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_loans,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_loans,
                COALESCE(SUM(CASE WHEN status = 'active' THEN amount ELSE 0 END), 0) as total_active_amount,
                COALESCE(SUM(CASE WHEN status = 'active' THEN remaining_amount ELSE 0 END), 0) as total_remaining,
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

