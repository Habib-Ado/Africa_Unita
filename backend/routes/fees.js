import express from 'express';
import { query } from '../database/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/fees - Ottieni quote per tesorieri
router.get('/', authenticateToken, requireRole('treasurer', 'admin'), async (req, res) => {
    try {
        const { status, year, month, limit = 100, offset = 0 } = req.query;
        const limitNum = Math.max(0, parseInt(limit, 10) || 100);
        const offsetNum = Math.max(0, parseInt(offset, 10) || 0);

        let whereClause = 'WHERE 1=1';
        let queryParams = [];

        // Filtro per stato
        if (status) {
            whereClause += ` AND mf.status = ?`;
            queryParams.push(status);
        }

        // Filtro per anno
        if (year) {
            whereClause += ` AND YEAR(mf.due_date) = ?`;
            queryParams.push(year);
        }

        // Filtro per mese
        if (month) {
            whereClause += ` AND MONTH(mf.due_date) = ?`;
            queryParams.push(month);
        }

        const result = await query(
            `SELECT 
                mf.id, mf.amount, mf.status, mf.due_date, mf.paid_date,
                u.id as user_id, u.username, u.first_name, u.last_name, u.email
             FROM membership_fees mf
             LEFT JOIN users u ON mf.user_id = u.id
             ${whereClause}
             ORDER BY mf.due_date DESC
             LIMIT ${limitNum} OFFSET ${offsetNum}`,
            queryParams
        );

        res.status(200).json({
            success: true,
            data: { fees: result.rows }
        });

    } catch (error) {
        console.error('Get fees error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle quote'
        });
    }
});

// GET /api/fees/my-status - Stato pagamenti utente corrente
router.get('/my-status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await query(
            'SELECT check_member_payment_status(?) AS result',
            [userId]
        );

        if (!result.rows || result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Stato pagamenti non disponibile'
            });
        }

        const row = result.rows[0];
        const statusData = row.result ?? row['result'];
        const paymentStatus = typeof statusData === 'string' ? JSON.parse(statusData) : statusData;

        res.status(200).json({
            success: true,
            data: { paymentStatus }
        });

    } catch (error) {
        console.error('Get payment status error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dello stato pagamenti'
        });
    }
});

// POST /api/fees/generate-monthly - Genera quote mensili
router.post('/generate-monthly', authenticateToken, requireRole('treasurer', 'admin'), async (req, res) => {
    try {
        const targetDate = new Date().toISOString().split('T')[0];
        // MySQL: SELECT funzione(?) AS alias (non SELECT * FROM funzione(?))
        const result = await query(
            'SELECT generate_monthly_fees(?) AS result',
            [targetDate]
        );

        const row = result.rows && result.rows[0];
        const resultData = row && (row.result ?? row['result']);
        const parsed = typeof resultData === 'string' ? JSON.parse(resultData) : resultData;

        res.status(200).json({
            success: true,
            message: 'Quote mensili generate con successo',
            data: { result: parsed || row }
        });

    } catch (error) {
        console.error('Generate monthly fees error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Errore nella generazione delle quote mensili'
        });
    }
});

// PUT /api/fees/:id/confirm - Conferma pagamento quota
router.put('/:id/confirm', authenticateToken, requireRole('treasurer', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const treasurerId = req.user.id;

        const result = await query(
            'SELECT confirm_fee_payment(?, ?) AS result',
            [id, treasurerId]
        );

        if (!result.rows || result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Quota non trovata'
            });
        }

        const row = result.rows[0];
        const confirmData = row.result ?? row['result'];
        const parsed = typeof confirmData === 'string' ? JSON.parse(confirmData) : confirmData;

        res.status(200).json({
            success: true,
            message: 'Pagamento confermato con successo',
            data: { result: parsed }
        });

    } catch (error) {
        console.error('Confirm payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella conferma del pagamento'
        });
    }
});

// GET /api/fees/fund/balance - Ottieni saldo del fondo cassa
router.get('/fund/balance', authenticateToken, requireRole('treasurer', 'admin'), async (req, res) => {
    try {
        // Calcola il saldo totale del fondo
        const balanceResult = await query(`
            SELECT 
                COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) as total_income,
                COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
                COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE -amount END), 0) as balance
            FROM fund_transactions
        `);

        const stats = balanceResult.rows[0];

        res.status(200).json({
            success: true,
            data: {
                balance: parseFloat(stats.balance),
                stats: {
                    total_income_amount: parseFloat(stats.total_income),
                    total_expense_amount: parseFloat(stats.total_expenses)
                }
            }
        });

    } catch (error) {
        console.error('Get fund balance error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero del saldo del fondo'
        });
    }
});

// GET /api/fees/fund/transactions - Ottieni transazioni del fondo
router.get('/fund/transactions', authenticateToken, requireRole('treasurer', 'admin'), async (req, res) => {
    try {
        const { type, limit = 50, offset = 0 } = req.query;
        const limitNum = Math.max(0, parseInt(limit, 10) || 50);
        const offsetNum = Math.max(0, parseInt(offset, 10) || 0);

        let whereClause = '';
        let queryParams = [];

        // Filtro per tipo di transazione
        if (type) {
            whereClause = `WHERE transaction_type = ?`;
            queryParams.push(type);
        }

        const result = await query(
            `SELECT 
                ft.*,
                u.username as treasurer_username,
                u.first_name as treasurer_first_name,
                u.last_name as treasurer_last_name
             FROM fund_transactions ft
             LEFT JOIN users u ON ft.treasurer_id = u.id
             ${whereClause}
             ORDER BY ft.transaction_date DESC
             LIMIT ${limitNum} OFFSET ${offsetNum}`,
            queryParams
        );

        res.status(200).json({
            success: true,
            data: { transactions: result.rows }
        });

    } catch (error) {
        console.error('Get fund transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle transazioni'
        });
    }
});

// POST /api/fees/fund/transactions - Aggiungi transazione manuale al fondo
router.post('/fund/transactions', authenticateToken, requireRole('treasurer', 'admin'), async (req, res) => {
    try {
        const treasurerId = req.user.id;
        const { transaction_type, amount, description } = req.body;

        // Validazione
        if (!transaction_type || !['income', 'expense'].includes(transaction_type)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo di transazione non valido'
            });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Importo non valido'
            });
        }

        if (!description || description.trim().length < 5) {
            return res.status(400).json({
                success: false,
                message: 'Descrizione troppo breve (minimo 5 caratteri)'
            });
        }

        const result = await query(
            `INSERT INTO fund_transactions (
                transaction_type, 
                amount, 
                description, 
                treasurer_id
            ) VALUES (?, ?, ?, ?)
            `,
            [transaction_type, amount, description.trim(), treasurerId]
        );

        res.status(201).json({
            success: true,
            message: 'Transazione registrata con successo',
            data: { transaction: result.rows[0] }
        });

    } catch (error) {
        console.error('Add fund transaction error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella registrazione della transazione'
        });
    }
});

export default router;