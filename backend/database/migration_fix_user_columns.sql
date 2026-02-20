-- ============================================
-- MIGRAZIONI DATABASE - Africa Unita
-- Eseguire i blocchi UNO ALLA VOLTA
-- Se un comando dà errore "already exists" o "duplicate", ignorare e passare al successivo
-- ============================================

-- 1) Rinomina colonne name/surname -> first_name/last_name (se esistono)
-- Errore "Unknown column" = le colonne non esistono, ignorare
ALTER TABLE users CHANGE COLUMN name first_name VARCHAR(100);
ALTER TABLE users CHANGE COLUMN surname last_name VARCHAR(100);

-- 2) Aggiorna ENUM status per includere email_verified
ALTER TABLE users MODIFY COLUMN status ENUM(
    'active', 'inactive', 'blocked', 'unblocked', 'suspended', 'pending', 'email_verified', 'deleted'
) DEFAULT 'pending' NOT NULL;

-- 3) Tabella email_verifications (se non esiste)
CREATE TABLE IF NOT EXISTS email_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4) Colonna last_activity per sessioni con timeout
-- Errore "Duplicate column" = già esiste, ignorare
ALTER TABLE users ADD COLUMN last_activity TIMESTAMP NULL DEFAULT NULL;

-- 5) Indice su last_activity
-- Errore "Duplicate key" = già esiste, ignorare
CREATE INDEX idx_users_last_activity ON users(last_activity);

-- 6) VIEW user_meeting_stats per statistiche riunioni
DROP VIEW IF EXISTS user_meeting_stats;
CREATE VIEW user_meeting_stats AS
SELECT 
    u.id AS user_id,
    COUNT(DISTINCT ma.meeting_id) AS meetings_attended,
    COUNT(DISTINCT m.id) AS total_meetings,
    COUNT(DISTINCT CASE WHEN ma.status = 'present' THEN ma.meeting_id END) AS meetings_present,
    COUNT(DISTINCT CASE WHEN ma.status = 'absent' THEN ma.meeting_id END) AS meetings_absent,
    COUNT(DISTINCT CASE WHEN ma.status = 'excused' THEN ma.meeting_id END) AS meetings_excused,
    COALESCE(SUM(CASE WHEN mp.status = 'pending' THEN mp.amount ELSE 0 END), 0) AS total_penalty_amount,
    COUNT(DISTINCT CASE WHEN mp.status = 'pending' THEN mp.id END) AS pending_penalties_count
FROM users u
LEFT JOIN meeting_attendance ma ON u.id = ma.user_id
LEFT JOIN meetings m ON ma.meeting_id = m.id
LEFT JOIN meeting_penalties mp ON u.id = mp.user_id
WHERE u.status != 'deleted'
GROUP BY u.id;

-- 7) Funzione check_member_payment_status (aggiornata per pagamenti in sospeso)
DROP FUNCTION IF EXISTS check_member_payment_status;
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
    
    SELECT COALESCE(SUM(amount), 0) INTO total_fees FROM membership_fees WHERE user_id = user_id_param;
    SELECT COALESCE(SUM(amount), 0) INTO paid_fees FROM membership_fees WHERE user_id = user_id_param AND status = 'paid';
    SELECT COALESCE(SUM(amount), 0) INTO pending_fees FROM membership_fees 
    WHERE user_id = user_id_param AND status = 'pending' AND (due_date >= CURDATE() OR due_date IS NULL);
    SELECT COALESCE(SUM(amount), 0) INTO overdue_fees FROM membership_fees 
    WHERE user_id = user_id_param AND (status = 'overdue' OR (status = 'pending' AND due_date < CURDATE() AND due_date IS NOT NULL));
    
    SET result = JSON_OBJECT(
        'user_id', user_id_param,
        'total_fees', total_fees,
        'paid_fees', paid_fees,
        'pending_fees', pending_fees,
        'overdue_fees', overdue_fees,
        'balance', total_fees - paid_fees,
        'payment_status', CASE 
            WHEN overdue_fees > 0 THEN 'overdue'
            WHEN pending_fees > 0 THEN 'pending'
            WHEN paid_fees >= total_fees AND total_fees > 0 THEN 'up_to_date'
            ELSE 'no_fees'
        END
    );
    RETURN result;
END //
DELIMITER ;
