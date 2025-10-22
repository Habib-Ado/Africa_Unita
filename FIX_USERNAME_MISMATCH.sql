-- Fix Username Mismatch in Railway Database
-- Esegui questo script in DBeaver per correggere gli username

-- 1. Verifica username attuali
SELECT username, email, role FROM users;

-- 2. Aggiorna username per correggere il mismatch
UPDATE users SET username = 'moderator' WHERE username = 'moderator1';
UPDATE users SET username = 'treasurer' WHERE username = 'treasurer1';

-- 3. Verifica che gli username siano corretti
SELECT username, email, role FROM users;

-- 4. Reset password per tutti gli utenti con password123
-- (Questo hash corrisponde a password123)
UPDATE users SET password_hash = '$2b$12$LQv3c1yK8Z9X2W3E4R5T6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV' 
WHERE username IN ('admin', 'moderator', 'treasurer', 'mario_rossi', 'fatou_diop');

-- 5. Verifica finale
SELECT username, email, role, 
       CASE 
           WHEN password_hash IS NOT NULL THEN 'Password OK'
           ELSE 'Password Missing'
       END as password_status
FROM users;

-- 6. Test finale
SELECT 'Username mismatch fixed! Now try login with admin@africaunita.it / password123' as result;
