-- Fix Login - Esegui UNA query alla volta in DBeaver

-- 1. PRIMA: Verifica utente admin
SELECT username, email, password_hash, role FROM users WHERE email = 'admin@africaunita.it';

-- 2. SECONDA: Aggiorna password hash (esegui SOLO questa query)
UPDATE users SET password_hash = '$2b$12$LQv3c1yK8Z9X2W3E4R5T6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV' 
WHERE email = 'admin@africaunita.it';

-- 3. TERZA: Verifica aggiornamento
SELECT username, email, role FROM users WHERE email = 'admin@africaunita.it';
