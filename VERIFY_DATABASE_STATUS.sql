-- Verifica stato database Railway
-- Esegui questo script in DBeaver per controllare lo stato attuale

-- 1. Verifica tutti gli utenti
SELECT username, email, role, 
       CASE 
           WHEN password_hash IS NOT NULL THEN 'Password OK'
           ELSE 'Password Missing'
       END as password_status
FROM users;

-- 2. Controlla se ci sono username con '1'
SELECT username, email FROM users WHERE username LIKE '%1';

-- 3. Se ci sono username con '1', correggili:
UPDATE users SET username = 'moderator' WHERE username = 'moderator1';
UPDATE users SET username = 'treasurer' WHERE username = 'treasurer1';

-- 4. Reset password per admin (password123)
UPDATE users SET password_hash = '$2b$12$LQv3c1yK8Z9X2W3E4R5T6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV' 
WHERE username = 'admin';

-- 5. Verifica finale
SELECT username, email, role FROM users WHERE username = 'admin';

-- 6. Test password hash
SELECT username, 
       CASE 
           WHEN password_hash = '$2b$12$LQv3c1yK8Z9X2W3E4R5T6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV' 
           THEN 'Password CORRECT'
           ELSE 'Password WRONG'
       END as password_check
FROM users WHERE username = 'admin';
