import express from 'express';
import { query } from '../database/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/fees/my-status - Ottieni stato pagamenti del membro corrente
router.get('/my-status', authenticateToken, async (req, res) => {
    try {
        // Controlla se la tabella membership_fees esiste
        const tableExists = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'membership_fees'
            );
        `);

        if (!tableExists.rows[0].exists) {
            return res.json({
                success: true,
                data: {
                    status: {
                        total_fees: 0,
                        paid_fees: 0,
                        pending_fees: 0,
                        overdue_fees: 0,
                        last_payment_date: null,
                        payment_status: 'no_fees'
                    },
                    fees: []
                }
            });
        }

        // Stato pagamenti
        const statusResult = await query(
            'SELECT * FROM check_member_payment_status($1)',
            [req.user.id]
        );

        // Lista quote
        const feesResult = await query(
            `SELECT id, amount, due_date, status, paid_date, notes
             FROM membership_fees
             WHERE user_id = $1
             ORDER BY due_date DESC
             LIMIT 12`,
            [req.user.id]
        );

        res.json({
            success: true,
            data: {
                status: statusResult.rows[0] || {
                    total_fees: 0,
                    paid_fees: 0,
                    pending_fees: 0,
                    overdue_fees: 0,
                    last_payment_date: null,
                    payment_status: 'no_fees'
                },
                fees: feesResult.rows
            }
        });
    } catch (error) {
        console.error('Get my fees status error:', error);
        res.status(500).json({
            success: false,
            message: 'Sistema quote non ancora attivo - eseguire migration'
        });
    }
});

// GET /api/fees - Ottieni tutte le quote (solo tesoriere/admin)
router.get('/', authenticateToken, requireRole('treasurer', 'admin'), async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50, 
            status = '', 
            month = '', 
            year = '',
            user_id = ''
        } = req.query;
        const offset = (page - 1) * limit;

        let queryText = `
            SELECT mf.*, u.username, u.first_name, u.last_name, u.email
            FROM membership_fees mf
            JOIN users u ON mf.user_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (status) {
            queryText += ` AND mf.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        if (month) {
            queryText += ` AND EXTRACT(MONTH FROM mf.due_date) = $${paramCount}`;
            params.push(month);
            paramCount++;
        }

        if (year) {
            queryText += ` AND EXTRACT(YEAR FROM mf.due_date) = $${paramCount}`;
            params.push(year);
            paramCount++;
        }

        if (user_id) {
            queryText += ` AND mf.user_id = $${paramCount}`;
            params.push(user_id);
            paramCount++;
        }

        queryText += ` ORDER BY mf.due_date DESC, u.last_name ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await query(queryText, params);

        // Conta totale
        let countQuery = 'SELECT COUNT(*) FROM membership_fees WHERE 1=1';
        const countParams = [];
        let countParamCount = 1;

        if (status) {
            countQuery += ` AND status = $${countParamCount}`;
            countParams.push(status);
            countParamCount++;
        }

        if (month) {
            countQuery += ` AND EXTRACT(MONTH FROM due_date) = $${countParamCount}`;
            countParams.push(month);
            countParamCount++;
        }

        if (year) {
            countQuery += ` AND EXTRACT(YEAR FROM due_date) = $${countParamCount}`;
            countParams.push(year);
            countParamCount++;
        }

        const countResult = await query(countQuery, countParams);

        res.json({
            success: true,
            data: {
                fees: result.rows,
                pagination: {
                    total: parseInt(countResult.rows[0].count),
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(countResult.rows[0].count / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get fees error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle quote'
        });
    }
});

// PUT /api/fees/:id/confirm - Conferma pagamento quota (solo tesoriere)
router.put('/:id/confirm', authenticateToken, requireRole('treasurer', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { payment_method, receipt_number, notes } = req.body;

        const result = await query(
            `UPDATE membership_fees 
             SET status = 'paid',
                 paid_date = CURRENT_TIMESTAMP,
                 notes = $1
             WHERE id = $2
             RETURNING *`,
            [notes, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Quota non trovata'
            });
        }

        const fee = result.rows[0];

        // Registra nel fondo dell'associazione
        await query(
            `INSERT INTO fund_transactions (transaction_type, amount, description, reference_id, treasurer_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                'income',
                fee.amount,
                `Quota associativa ${fee.due_date} - ${fee.user_id}`,
                fee.id,
                req.user.id
            ]
        );

        res.json({
            success: true,
            message: 'Pagamento confermato e registrato nel fondo',
            data: { fee: result.rows[0] }
        });
    } catch (error) {
        console.error('Confirm fee error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella conferma del pagamento'
        });
    }
});

// GET /api/fees/fund/balance - Ottieni saldo fondo (solo tesoriere/admin)
router.get('/fund/balance', authenticateToken, requireRole('treasurer', 'admin'), async (req, res) => {
    try {
        const balanceResult = await query(`
            SELECT 
                COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE -amount END), 0) as balance
            FROM fund_transactions
        `);
        
        // Statistiche recenti
        const statsResult = await query(
            `SELECT 
                COUNT(*) FILTER (WHERE transaction_type = 'income') as total_incomes,
                COUNT(*) FILTER (WHERE transaction_type = 'expense') as total_expenses,
                COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'income'), 0) as total_income_amount,
                COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'expense'), 0) as total_expense_amount
             FROM fund_transactions
             WHERE transaction_date >= DATE_TRUNC('year', CURRENT_DATE)`
        );

        res.json({
            success: true,
            data: {
                balance: parseFloat(balanceResult.rows[0].balance) || 0,
                stats: statsResult.rows[0]
            }
        });
    } catch (error) {
        console.error('Get fund balance error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero del saldo'
        });
    }
});

// GET /api/fees/fund/transactions - Ottieni transazioni fondo (solo tesoriere/admin)
router.get('/fund/transactions', authenticateToken, requireRole('treasurer', 'admin'), async (req, res) => {
    try {
        const { page = 1, limit = 50, type = '', category = '' } = req.query;
        const offset = (page - 1) * limit;

        let queryText = `
            SELECT ft.*, 
                   u.username as treasurer_username,
                   u.first_name as treasurer_first_name,
                   u.last_name as treasurer_last_name
            FROM fund_transactions ft
            LEFT JOIN users u ON ft.treasurer_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (type) {
            queryText += ` AND ft.transaction_type = $${paramCount}`;
            params.push(type);
            paramCount++;
        }

        queryText += ` ORDER BY ft.transaction_date DESC, ft.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await query(queryText, params);

        res.json({
            success: true,
            data: {
                transactions: result.rows
            }
        });
    } catch (error) {
        console.error('Get fund transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle transazioni'
        });
    }
});

// POST /api/fees/fund/transaction - Aggiungi transazione al fondo (solo tesoriere/admin)
router.post('/fund/transaction', authenticateToken, requireRole('treasurer', 'admin'), async (req, res) => {
    try {
        const { type, amount, description, category, date, notes } = req.body;

        if (!type || !amount || !description) {
            return res.status(400).json({
                success: false,
                message: 'Tipo, importo e descrizione sono obbligatori'
            });
        }

        const result = await query(
            `INSERT INTO fund_transactions (transaction_type, amount, description, treasurer_id)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [type, amount, description, req.user.id]
        );

        res.status(201).json({
            success: true,
            message: 'Transazione registrata con successo',
            data: { transaction: result.rows[0] }
        });
    } catch (error) {
        console.error('Add transaction error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella registrazione della transazione'
        });
    }
});

// POST /api/fees/generate-monthly - Genera quote per il mese corrente (solo tesoriere/admin)
router.post('/generate-monthly', authenticateToken, requireRole('treasurer', 'admin'), async (req, res) => {
    try {
        // Controlla se la tabella membership_fees esiste
        const tableExists = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'membership_fees'
            );
        `);

        if (!tableExists.rows[0].exists) {
            return res.status(400).json({
                success: false,
                message: 'Sistema quote non ancora attivo. Eseguire la migration del database.'
            });
        }

        // Controlla se la funzione generate_monthly_fees esiste
        const functionExists = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.routines 
                WHERE routine_schema = 'public' 
                AND routine_name = 'generate_monthly_fees'
            );
        `);

        if (!functionExists.rows[0].exists) {
            return res.status(400).json({
                success: false,
                message: 'Funzione generate_monthly_fees non trovata. Completare la migration.'
            });
        }

        const result = await query('SELECT generate_monthly_fees((DATE_TRUNC(\'month\', CURRENT_DATE) + INTERVAL \'1 month\')::DATE) as count');
        
        res.json({
            success: true,
            message: `Generate ${result.rows[0].count} quote per il mese corrente`,
            data: { count: result.rows[0].count }
        });
    } catch (error) {
        console.error('Generate fees error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella generazione delle quote: ' + error.message
        });
    }
});

export default router;
