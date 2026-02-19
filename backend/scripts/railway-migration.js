import { query, queryRaw } from '../database/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runRailwayMigration = async () => {
    try {
        console.log('🚀 Starting Railway migration...');
        
        // Test database connection first
        console.log('🔍 Testing database connection...');
        await query('SELECT 1');
        console.log('✅ Database connection successful');
        
        // Create functions one by one to avoid conflicts
        const functions = [
            // Drop existing functions if they exist
            'DROP FUNCTION IF EXISTS generate_monthly_fees',
            'DROP FUNCTION IF EXISTS check_member_payment_status', 
            'DROP FUNCTION IF EXISTS confirm_fee_payment',
            'DROP FUNCTION IF EXISTS approve_loan',
            'DROP FUNCTION IF EXISTS reject_loan',
            'DROP FUNCTION IF EXISTS confirm_installment_payment',
            'DROP FUNCTION IF EXISTS update_overdue_installments',
            'DROP FUNCTION IF EXISTS get_user_loan_stats',
            'DROP VIEW IF EXISTS loans_with_user',
            
            // Create generate_monthly_fees function
            `CREATE FUNCTION generate_monthly_fees(target_date DATE) 
             RETURNS JSON
             READS SQL DATA
             DETERMINISTIC
             BEGIN
                 -- Tutte le variabili devono essere dichiarate PRIMA dei cursori e handler
                 DECLARE done INT DEFAULT FALSE;
                 DECLARE user_id_var INT;
                 DECLARE fees_generated INT DEFAULT 0;
                 DECLARE total_amount DECIMAL(10,2) DEFAULT 0;
                 DECLARE result JSON;
                 
                 -- Poi i cursori
                 DECLARE user_cursor CURSOR FOR 
                     SELECT id FROM users 
                     WHERE status = 'active' AND role != 'admin';
                 
                 -- Infine gli handler
                 DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
                 
                 OPEN user_cursor;
                 
                 read_loop: LOOP
                     FETCH user_cursor INTO user_id_var;
                     IF done THEN
                         LEAVE read_loop;
                     END IF;
                     
                     IF NOT EXISTS (
                         SELECT 1 FROM membership_fees 
                         WHERE user_id = user_id_var 
                         AND YEAR(due_date) = YEAR(target_date) 
                         AND MONTH(due_date) = MONTH(target_date)
                     ) THEN
                         INSERT INTO membership_fees (user_id, amount, due_date, status)
                         VALUES (user_id_var, 10.00, target_date, 'pending');
                         
                         SET fees_generated = fees_generated + 1;
                         SET total_amount = total_amount + 10.00;
                     END IF;
                 END LOOP;
                 
                 CLOSE user_cursor;
                 
                 SET result = JSON_OBJECT(
                     'fees_generated', fees_generated,
                     'total_amount', total_amount,
                     'target_date', target_date
                 );
                 
                 RETURN result;
             END`,
             
            // Create check_member_payment_status function
            `CREATE FUNCTION check_member_payment_status(user_id_param INT) 
             RETURNS JSON
             READS SQL DATA
             DETERMINISTIC
             BEGIN
                 DECLARE total_fees DECIMAL(10,2) DEFAULT 0;
                 DECLARE paid_fees DECIMAL(10,2) DEFAULT 0;
                 DECLARE pending_fees DECIMAL(10,2) DEFAULT 0;
                 DECLARE overdue_fees DECIMAL(10,2) DEFAULT 0;
                 DECLARE result JSON;
                 
                 SELECT COALESCE(SUM(amount), 0) INTO total_fees
                 FROM membership_fees 
                 WHERE user_id = user_id_param;
                 
                 SELECT COALESCE(SUM(amount), 0) INTO paid_fees
                 FROM membership_fees 
                 WHERE user_id = user_id_param AND status = 'paid';
                 
                 SELECT COALESCE(SUM(amount), 0) INTO pending_fees
                 FROM membership_fees 
                 WHERE user_id = user_id_param AND status = 'pending';
                 
                 SELECT COALESCE(SUM(amount), 0) INTO overdue_fees
                 FROM membership_fees 
                 WHERE user_id = user_id_param AND status = 'overdue';
                 
                 SET result = JSON_OBJECT(
                     'user_id', user_id_param,
                     'total_fees', total_fees,
                     'paid_fees', paid_fees,
                     'pending_fees', pending_fees,
                     'overdue_fees', overdue_fees,
                     'balance', total_fees - paid_fees
                 );
                 
                 RETURN result;
             END`,
             
            // Create confirm_fee_payment function
            `CREATE FUNCTION confirm_fee_payment(fee_id INT, treasurer_id INT) 
             RETURNS JSON
             READS SQL DATA
             DETERMINISTIC
             BEGIN
                 DECLARE fee_exists INT DEFAULT 0;
                 DECLARE fee_amount DECIMAL(10,2);
                 DECLARE result JSON;
                 
                 SELECT COUNT(*), COALESCE(amount, 0) INTO fee_exists, fee_amount
                 FROM membership_fees 
                 WHERE id = fee_id;
                 
                 IF fee_exists = 0 THEN
                     SET result = JSON_OBJECT('error', 'Fee not found');
                     RETURN result;
                 END IF;
                 
                 UPDATE membership_fees 
                 SET status = 'paid', paid_date = CURDATE()
                 WHERE id = fee_id;
                 
                 INSERT INTO fund_transactions (transaction_type, amount, description, treasurer_id)
                 VALUES ('income', fee_amount, CONCAT('Fee payment confirmed for fee ID: ', fee_id), treasurer_id);
                 
                 SET result = JSON_OBJECT(
                     'success', TRUE,
                     'fee_id', fee_id,
                     'amount', fee_amount,
                     'paid_date', CURDATE()
                 );
                 
                 RETURN result;
             END`,
             
            // Create approve_loan function
            `CREATE FUNCTION approve_loan(loan_id INT, treasurer_id INT, start_date DATE) 
             RETURNS JSON
             READS SQL DATA
             DETERMINISTIC
             BEGIN
                 DECLARE loan_exists INT DEFAULT 0;
                 DECLARE loan_amount DECIMAL(10,2);
                 DECLARE installment_amount DECIMAL(10,2);
                 DECLARE total_installments INT;
                 DECLARE result JSON;
                 
                 SELECT COUNT(*), COALESCE(amount, 0), COALESCE(installment_amount, 0), COALESCE(total_installments, 0)
                 INTO loan_exists, loan_amount, installment_amount, total_installments
                 FROM loans 
                 WHERE id = loan_id AND status = 'pending';
                 
                 IF loan_exists = 0 THEN
                     SET result = JSON_OBJECT('error', 'Loan not found or not pending');
                     RETURN result;
                 END IF;
                 
                 UPDATE loans 
                 SET status = 'active', start_date = start_date, approved_by = treasurer_id, approved_at = NOW()
                 WHERE id = loan_id;
                 
                 SET @installment_num = 1;
                 WHILE @installment_num <= total_installments DO
                     INSERT INTO loan_installments (loan_id, installment_number, amount, due_date, status)
                     VALUES (loan_id, @installment_num, installment_amount, DATE_ADD(start_date, INTERVAL @installment_num MONTH), 'pending');
                     SET @installment_num = @installment_num + 1;
                 END WHILE;
                 
                 SET result = JSON_OBJECT(
                     'success', TRUE,
                     'loan_id', loan_id,
                     'amount', loan_amount,
                     'installments_created', total_installments
                 );
                 
                 RETURN result;
             END`,
             
            // Create reject_loan function
            `CREATE FUNCTION reject_loan(loan_id INT, treasurer_id INT, notes TEXT) 
             RETURNS JSON
             READS SQL DATA
             DETERMINISTIC
             BEGIN
                 DECLARE loan_exists INT DEFAULT 0;
                 DECLARE result JSON;
                 
                 SELECT COUNT(*) INTO loan_exists
                 FROM loans 
                 WHERE id = loan_id AND status = 'pending';
                 
                 IF loan_exists = 0 THEN
                     SET result = JSON_OBJECT('error', 'Loan not found or not pending');
                     RETURN result;
                 END IF;
                 
                 UPDATE loans 
                 SET status = 'rejected', rejected_by = treasurer_id, rejected_at = NOW(), rejection_notes = notes
                 WHERE id = loan_id;
                 
                 SET result = JSON_OBJECT(
                     'success', TRUE,
                     'loan_id', loan_id,
                     'status', 'rejected'
                 );
                 
                 RETURN result;
             END`,
             
            // Create confirm_installment_payment function
            `CREATE FUNCTION confirm_installment_payment(installment_id INT, treasurer_id INT, payment_method VARCHAR(50), notes TEXT) 
             RETURNS JSON
             READS SQL DATA
             DETERMINISTIC
             BEGIN
                 DECLARE installment_exists INT DEFAULT 0;
                 DECLARE installment_amount DECIMAL(10,2);
                 DECLARE loan_id_var INT;
                 DECLARE result JSON;
                 
                 SELECT COUNT(*), COALESCE(amount, 0), COALESCE(loan_id, 0)
                 INTO installment_exists, installment_amount, loan_id_var
                 FROM loan_installments 
                 WHERE id = installment_id AND status = 'pending';
                 
                 IF installment_exists = 0 THEN
                     SET result = JSON_OBJECT('error', 'Installment not found or not pending');
                     RETURN result;
                 END IF;
                 
                 UPDATE loan_installments 
                 SET status = 'paid', paid_date = CURDATE(), payment_method = payment_method, notes = notes
                 WHERE id = installment_id;
                 
                 INSERT INTO fund_transactions (transaction_type, amount, description, treasurer_id)
                 VALUES ('income', installment_amount, CONCAT('Loan installment payment - Loan ID: ', loan_id_var), treasurer_id);
                 
                 UPDATE loans 
                 SET remaining_amount = remaining_amount - installment_amount
                 WHERE id = loan_id_var;
                 
                 IF (SELECT remaining_amount FROM loans WHERE id = loan_id_var) <= 0 THEN
                     UPDATE loans SET status = 'completed', completed_at = NOW() WHERE id = loan_id_var;
                 END IF;
                 
                 SET result = JSON_OBJECT(
                     'success', TRUE,
                     'installment_id', installment_id,
                     'amount', installment_amount,
                     'paid_date', CURDATE()
                 );
                 
                 RETURN result;
             END`,
             
            // Create update_overdue_installments function
            `CREATE FUNCTION update_overdue_installments() 
             RETURNS INT
             READS SQL DATA
             DETERMINISTIC
             BEGIN
                 DECLARE updated_count INT DEFAULT 0;
                 
                 UPDATE loan_installments 
                 SET status = 'overdue'
                 WHERE status = 'pending' 
                 AND due_date < CURDATE();
                 
                 SET updated_count = ROW_COUNT();
                 
                 RETURN updated_count;
             END`,
             
            // Create get_user_loan_stats function
            `CREATE FUNCTION get_user_loan_stats(user_id_param INT) 
             RETURNS JSON
             READS SQL DATA
             DETERMINISTIC
             BEGIN
                 DECLARE total_loans INT DEFAULT 0;
                 DECLARE active_loans INT DEFAULT 0;
                 DECLARE completed_loans INT DEFAULT 0;
                 DECLARE total_borrowed DECIMAL(10,2) DEFAULT 0;
                 DECLARE total_paid DECIMAL(10,2) DEFAULT 0;
                 DECLARE remaining_debt DECIMAL(10,2) DEFAULT 0;
                 DECLARE result JSON;
                 
                 SELECT COUNT(*) INTO total_loans
                 FROM loans 
                 WHERE user_id = user_id_param;
                 
                 SELECT COUNT(*) INTO active_loans
                 FROM loans 
                 WHERE user_id = user_id_param AND status = 'active';
                 
                 SELECT COUNT(*) INTO completed_loans
                 FROM loans 
                 WHERE user_id = user_id_param AND status = 'completed';
                 
                 SELECT COALESCE(SUM(amount), 0) INTO total_borrowed
                 FROM loans 
                 WHERE user_id = user_id_param AND status IN ('active', 'completed');
                 
                 SELECT COALESCE(SUM(li.amount), 0) INTO total_paid
                 FROM loan_installments li
                 JOIN loans l ON li.loan_id = l.id
                 WHERE l.user_id = user_id_param AND li.status = 'paid';
                 
                 SELECT COALESCE(SUM(remaining_amount), 0) INTO remaining_debt
                 FROM loans 
                 WHERE user_id = user_id_param AND status = 'active';
                 
                 SET result = JSON_OBJECT(
                     'user_id', user_id_param,
                     'total_loans', total_loans,
                     'active_loans', active_loans,
                     'completed_loans', completed_loans,
                     'total_borrowed', total_borrowed,
                     'total_paid', total_paid,
                     'remaining_debt', remaining_debt
                 );
                 
                 RETURN result;
             END`,
             
            // Create loans_with_user view
            `CREATE VIEW loans_with_user AS
             SELECT 
                 l.*,
                 u.username,
                 u.first_name,
                 u.last_name,
                 u.email,
                 u.phone
             FROM loans l
             LEFT JOIN users u ON l.user_id = u.id`
        ];
        
        // Execute each function creation
        // Usa queryRaw per comandi che non supportano prepared statements (CREATE FUNCTION, DROP FUNCTION, CREATE VIEW, ecc.)
        for (let i = 0; i < functions.length; i++) {
            const func = functions[i];
            try {
                console.log(`📝 Executing function ${i + 1}/${functions.length}...`);
                // Usa queryRaw per tutti i comandi DDL (CREATE, DROP, ALTER)
                await queryRaw(func);
                console.log(`✅ Function ${i + 1} executed successfully`);
            } catch (error) {
                console.log(`⚠️  Warning for function ${i + 1}:`, error.message);
                // Continue with other functions
            }
        }
        
        console.log('✅ Railway migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Railway migration failed:', error);
        throw error;
    }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runRailwayMigration()
        .then(() => {
            console.log('Railway migration completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Railway migration failed:', error);
            process.exit(1);
        });
}

export default runRailwayMigration;
