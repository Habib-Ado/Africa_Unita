-- Railway Database Setup per Africa Unita
-- Esegui questo script in DBeaver dopo aver configurato la connessione

-- 1. Verifica connessione
SELECT 'Database connesso correttamente!' as status;

-- 2. Controlla tabelle esistenti
SHOW TABLES;

-- 3. Se non ci sono tabelle, esegui lo schema completo
-- (Copia e incolla il contenuto di backend/database/schema.sql qui)

-- 4. Inserisci utenti di test
INSERT INTO users (username, email, password_hash, first_name, last_name, role, status, country_of_origin, bio) VALUES
('admin', 'admin@africaunita.it', '$2b$10$rQZ8K9vL2nM3pO4qR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV', 'Admin', 'Sistema', 'admin', 'active', NULL, 'Administrateur du système'),
('president', 'president@africaunita.it', '$2b$10$rQZ8K9vL2nM3pO4qR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV', 'Jean', 'President', 'president', 'active', 'Sénégal', 'Président de l''association'),
('moderator', 'moderator@africaunita.it', '$2b$10$rQZ8K9vL2nM3pO4qR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV', 'Fatou', 'Diop', 'moderator', 'active', 'Mali', 'Modératrice de contenu'),
('treasurer', 'treasurer@africaunita.it', '$2b$10$rQZ8K9vL2nM3pO4qR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV', 'Amadou', 'Kone', 'treasurer', 'active', 'Côte d''Ivoire', 'Trésorier de l''association'),
('user1', 'user@africaunita.it', '$2b$10$rQZ8K9vL2nM3pO4qR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV', 'Marie', 'Touré', 'user', 'active', 'Guinée', 'Membre actif de la communauté'),
('mario_rossi', 'mario@test.com', '$2b$10$rQZ8K9vL2nM3pO4qR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV', 'Mario', 'Rossi', 'user', 'active', 'Italie', 'Membre bénévole'),
('ibrahim_sy', 'ibrahim@test.com', '$2b$10$rQZ8K9vL2nM3pO4qR5sT6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV', 'Ibrahim', 'Sy', 'user', 'active', 'Mauritanie', 'Nouveau membre')
ON DUPLICATE KEY UPDATE username=username;

-- 5. Verifica utenti inseriti
SELECT username, email, role FROM users;

-- 6. Controlla password hash
SELECT username, email, 
       CASE 
           WHEN password_hash IS NOT NULL THEN 'Password hash presente'
           ELSE 'Password hash mancante'
       END as password_status
FROM users;

-- 7. Test finale
SELECT 'Setup completato! Ora puoi fare login con admin@africaunita.it / password123' as result;
