-- Schéma correct pour Africa Unita
-- Ce fichier correspond aux colonnes utilisées dans le code

DROP TABLE IF EXISTS meeting_penalties;
DROP TABLE IF EXISTS meeting_attendance;
DROP TABLE IF EXISTS meetings;
DROP TABLE IF EXISTS loan_installments;
DROP TABLE IF EXISTS loans;
DROP TABLE IF EXISTS fund_transactions;
DROP TABLE IF EXISTS membership_fees;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS content_files;
DROP TABLE IF EXISTS site_content;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS post_files;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS email_verifications;
DROP TABLE IF EXISTS users;

-- Table users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) DEFAULT (UUID()) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    role ENUM('user', 'admin', 'president', 'moderator', 'treasurer') DEFAULT 'user' NOT NULL,
    status ENUM('active', 'inactive', 'blocked', 'unblocked', 'suspended', 'pending', 'email_verified', 'deleted') DEFAULT 'pending' NOT NULL,
    avatar_url VARCHAR(500),
    bio TEXT,
    country_of_origin VARCHAR(100),
    date_of_birth DATE,
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(50),
    postal_code VARCHAR(10),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP NULL,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table email_verifications
CREATE TABLE IF NOT EXISTS email_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table posts
CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) DEFAULT (UUID()) UNIQUE NOT NULL,
    user_id INT,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category ENUM('alloggio', 'lavoro', 'formazione', 'servizi', 'eventi', 'altro') NOT NULL,
    location VARCHAR(255),
    contact_info TEXT,
    image_url VARCHAR(500),
    is_published BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    views_count INT DEFAULT 0,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table post_files
CREATE TABLE post_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Table messages
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) DEFAULT (UUID()) UNIQUE NOT NULL,
    sender_id INT,
    recipient_id INT,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    status ENUM('sent', 'delivered', 'read') DEFAULT 'sent',
    parent_message_id INT,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table favorites
CREATE TABLE favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    post_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_post (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Table site_content
CREATE TABLE site_content (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) DEFAULT (UUID()) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    content_type ENUM('post', 'photo', 'video', 'document', 'announcement') NOT NULL,
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    author_id INT NOT NULL,
    featured_image_url VARCHAR(500),
    tags JSON,
    view_count INT DEFAULT 0,
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table content_files
CREATE TABLE content_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (content_id) REFERENCES site_content(id) ON DELETE CASCADE
);

-- Table comments
CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) DEFAULT (UUID()) UNIQUE NOT NULL,
    post_id INT,
    content_id INT,
    user_id INT,
    content TEXT NOT NULL,
    parent_comment_id INT,
    is_approved TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES site_content(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table notifications
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) DEFAULT (UUID()) UNIQUE NOT NULL,
    user_id INT,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500),
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table activity_logs
CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Table membership_fees
CREATE TABLE membership_fees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 10.00,
    due_date DATE NOT NULL,
    status ENUM('pending', 'paid', 'overdue', 'cancelled') NOT NULL DEFAULT 'pending',
    paid_date TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_due_date (user_id, due_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table fund_transactions
CREATE TABLE fund_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_type ENUM('income', 'expense') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    reference_id INT,
    treasurer_id INT NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (treasurer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table loans
CREATE TABLE loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) DEFAULT (UUID()) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    status ENUM('pending', 'approved', 'active', 'completed', 'cancelled', 'rejected') DEFAULT 'pending' NOT NULL,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    start_date DATE,
    end_date DATE,
    total_installments INT DEFAULT 10 NOT NULL,
    installment_amount DECIMAL(10,2) NOT NULL,
    paid_installments INT DEFAULT 0,
    remaining_amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT check_installments CHECK (total_installments > 0 AND total_installments <= 12),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Table loan_installments
CREATE TABLE loan_installments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    installment_number INT NOT NULL CHECK (installment_number > 0),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    paid_date TIMESTAMP NULL,
    status ENUM('pending', 'paid', 'overdue') DEFAULT 'pending' NOT NULL,
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_loan_installment (loan_id, installment_number),
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
);

-- Table meetings
CREATE TABLE meetings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) DEFAULT (UUID()) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    meeting_date DATE NOT NULL,
    meeting_time TIME,
    location VARCHAR(255),
    created_by INT,
    status VARCHAR(50) DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Table meeting_attendance
CREATE TABLE meeting_attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) DEFAULT (UUID()) UNIQUE NOT NULL,
    meeting_id INT NOT NULL,
    user_id INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'absent',
    justification TEXT,
    marked_by INT,
    marked_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_meeting_user (meeting_id, user_id),
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Table meeting_penalties
CREATE TABLE meeting_penalties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) DEFAULT (UUID()) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    meeting1_id INT NOT NULL,
    meeting2_id INT NOT NULL,
    amount DECIMAL(10, 2) DEFAULT 10.00,
    status VARCHAR(50) DEFAULT 'pending',
    paid_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (meeting1_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (meeting2_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- Creazione tabella email_verifications (necessaria per la verifica email alla registrazione)
-- Eseguire questo script sul database Railway se la tabella non esiste

CREATE TABLE IF NOT EXISTS email_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- ============================================
-- FUNCTIONS AND PROCEDURES
-- ============================================

-- Function to generate monthly fees for all active members
DELIMITER //
CREATE FUNCTION generate_monthly_fees(target_date DATE) 
RETURNS JSON
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE user_id_var INT;
    DECLARE user_cursor CURSOR FOR 
        SELECT id FROM users 
        WHERE status = 'active' AND role != 'admin';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    DECLARE fees_generated INT DEFAULT 0;
    DECLARE total_amount DECIMAL(10,2) DEFAULT 0;
    DECLARE result JSON;
    
    OPEN user_cursor;
    
    read_loop: LOOP
        FETCH user_cursor INTO user_id_var;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Check if fee already exists for this month
        IF NOT EXISTS (
            SELECT 1 FROM membership_fees 
            WHERE user_id = user_id_var 
            AND YEAR(due_date) = YEAR(target_date) 
            AND MONTH(due_date) = MONTH(target_date)
        ) THEN
            -- Insert new monthly fee
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
END //
DELIMITER ;

-- Aggiorna l'ENUM della colonna status per includere 'email_verified'
-- Eseguire questo script sul database Railway

-- Prima verifica quali valori sono attualmente nell'ENUM
-- SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_SCHEMA = 'railway' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'status';

-- Modifica l'ENUM per includere tutti i valori necessari
ALTER TABLE users 
MODIFY COLUMN status ENUM(
    'active', 
    'inactive', 
    'blocked', 
    'unblocked', 
    'suspended', 
    'pending', 
    'email_verified', 
    'deleted'
) DEFAULT 'pending' NOT NULL;

-- Function to check member payment status
DELIMITER //
CREATE FUNCTION check_member_payment_status(user_id_param INT) 
RETURNS JSON
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE total_fees DECIMAL(10,2) DEFAULT 0;
    DECLARE paid_fees DECIMAL(10,2) DEFAULT 0;
    DECLARE pending_fees DECIMAL(10,2) DEFAULT 0;
    DECLARE overdue_fees DECIMAL(10,2) DEFAULT 0;
    DECLARE result JSON;
    
    -- Calculate total fees
    SELECT COALESCE(SUM(amount), 0) INTO total_fees
    FROM membership_fees 
    WHERE user_id = user_id_param;
    
    -- Calculate paid fees
    SELECT COALESCE(SUM(amount), 0) INTO paid_fees
    FROM membership_fees 
    WHERE user_id = user_id_param AND status = 'paid';
    
    -- Calculate pending fees
    SELECT COALESCE(SUM(amount), 0) INTO pending_fees
    FROM membership_fees 
    WHERE user_id = user_id_param AND status = 'pending';
    
    -- Calculate overdue fees
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
END //
DELIMITER ;

-- Function to confirm fee payment
DELIMITER //
CREATE FUNCTION confirm_fee_payment(fee_id INT, treasurer_id INT) 
RETURNS JSON
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE fee_exists INT DEFAULT 0;
    DECLARE fee_amount DECIMAL(10,2);
    DECLARE result JSON;
    
    -- Check if fee exists
    SELECT COUNT(*), COALESCE(amount, 0) INTO fee_exists, fee_amount
    FROM membership_fees 
    WHERE id = fee_id;
    
    IF fee_exists = 0 THEN
        SET result = JSON_OBJECT('error', 'Fee not found');
        RETURN result;
    END IF;
    
    -- Update fee status
    UPDATE membership_fees 
    SET status = 'paid', paid_date = CURDATE()
    WHERE id = fee_id;
    
    -- Add transaction to fund
    INSERT INTO fund_transactions (transaction_type, amount, description, treasurer_id)
    VALUES ('income', fee_amount, CONCAT('Fee payment confirmed for fee ID: ', fee_id), treasurer_id);
    
    SET result = JSON_OBJECT(
        'success', TRUE,
        'fee_id', fee_id,
        'amount', fee_amount,
        'paid_date', CURDATE()
    );
    
    RETURN result;
END //
DELIMITER ;

-- Function to approve loan
DELIMITER //
CREATE FUNCTION approve_loan(loan_id INT, treasurer_id INT, start_date DATE) 
RETURNS JSON
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE loan_exists INT DEFAULT 0;
    DECLARE loan_amount DECIMAL(10,2);
    DECLARE installment_amount DECIMAL(10,2);
    DECLARE total_installments INT;
    DECLARE result JSON;
    
    -- Check if loan exists and get details
    SELECT COUNT(*), COALESCE(amount, 0), COALESCE(installment_amount, 0), COALESCE(total_installments, 0)
    INTO loan_exists, loan_amount, installment_amount, total_installments
    FROM loans 
    WHERE id = loan_id AND status = 'pending';
    
    IF loan_exists = 0 THEN
        SET result = JSON_OBJECT('error', 'Loan not found or not pending');
        RETURN result;
    END IF;
    
    -- Update loan status
    UPDATE loans 
    SET status = 'active', start_date = start_date, approved_by = treasurer_id, approved_at = NOW()
    WHERE id = loan_id;
    
    -- Create installments
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
END //
DELIMITER ;

-- Function to reject loan
DELIMITER //
CREATE FUNCTION reject_loan(loan_id INT, treasurer_id INT, notes TEXT) 
RETURNS JSON
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE loan_exists INT DEFAULT 0;
    DECLARE result JSON;
    
    -- Check if loan exists
    SELECT COUNT(*) INTO loan_exists
    FROM loans 
    WHERE id = loan_id AND status = 'pending';
    
    IF loan_exists = 0 THEN
        SET result = JSON_OBJECT('error', 'Loan not found or not pending');
        RETURN result;
    END IF;
    
    -- Update loan status
    UPDATE loans 
    SET status = 'rejected', rejected_by = treasurer_id, rejected_at = NOW(), rejection_notes = notes
    WHERE id = loan_id;
    
    SET result = JSON_OBJECT(
        'success', TRUE,
        'loan_id', loan_id,
        'status', 'rejected'
    );
    
    RETURN result;
END //
DELIMITER ;

-- Function to confirm installment payment
DELIMITER //
CREATE FUNCTION confirm_installment_payment(installment_id INT, treasurer_id INT, payment_method VARCHAR(50), notes TEXT) 
RETURNS JSON
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE installment_exists INT DEFAULT 0;
    DECLARE installment_amount DECIMAL(10,2);
    DECLARE loan_id_var INT;
    DECLARE result JSON;
    
    -- Check if installment exists
    SELECT COUNT(*), COALESCE(amount, 0), COALESCE(loan_id, 0)
    INTO installment_exists, installment_amount, loan_id_var
    FROM loan_installments 
    WHERE id = installment_id AND status = 'pending';
    
    IF installment_exists = 0 THEN
        SET result = JSON_OBJECT('error', 'Installment not found or not pending');
        RETURN result;
    END IF;
    
    -- Update installment status
    UPDATE loan_installments 
    SET status = 'paid', paid_date = CURDATE(), payment_method = payment_method, notes = notes
    WHERE id = installment_id;
    
    -- Add transaction to fund
    INSERT INTO fund_transactions (transaction_type, amount, description, treasurer_id)
    VALUES ('income', installment_amount, CONCAT('Loan installment payment - Loan ID: ', loan_id_var), treasurer_id);
    
    -- Update loan remaining amount
    UPDATE loans 
    SET remaining_amount = remaining_amount - installment_amount
    WHERE id = loan_id_var;
    
    -- Check if loan is completed
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
END //
DELIMITER ;

-- Function to update overdue installments
DELIMITER //
CREATE FUNCTION update_overdue_installments() 
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
END //
DELIMITER ;

-- Function to get user loan stats
DELIMITER //
CREATE FUNCTION get_user_loan_stats(user_id_param INT) 
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
    
    -- Count total loans
    SELECT COUNT(*) INTO total_loans
    FROM loans 
    WHERE user_id = user_id_param;
    
    -- Count active loans
    SELECT COUNT(*) INTO active_loans
    FROM loans 
    WHERE user_id = user_id_param AND status = 'active';
    
    -- Count completed loans
    SELECT COUNT(*) INTO completed_loans
    FROM loans 
    WHERE user_id = user_id_param AND status = 'completed';
    
    -- Calculate total borrowed
    SELECT COALESCE(SUM(amount), 0) INTO total_borrowed
    FROM loans 
    WHERE user_id = user_id_param AND status IN ('active', 'completed');
    
    -- Calculate total paid
    SELECT COALESCE(SUM(li.amount), 0) INTO total_paid
    FROM loan_installments li
    JOIN loans l ON li.loan_id = l.id
    WHERE l.user_id = user_id_param AND li.status = 'paid';
    
    -- Calculate remaining debt
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
END //
DELIMITER ;

-- ============================================
-- VIEWS
-- ============================================

-- View to get loans with user information
CREATE VIEW loans_with_user AS
SELECT 
    l.*,
    u.username,
    u.first_name,
    u.last_name,
    u.email,
    u.phone
FROM loans l
LEFT JOIN users u ON l.user_id = u.id;

