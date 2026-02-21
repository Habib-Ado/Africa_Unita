-- ============================================
-- SEED DATA - Africa Unita
-- Database vuoto: admin + utenti/post esempi
-- Eseguire DOPO schema.sql
-- ============================================
-- Password per TUTTI gli account: password
-- Per admin con Password123! eseguire: npm run db:create-admin
-- ============================================

-- 1) ADMIN (username per login, come createAdmin)
INSERT INTO users (username, email, password_hash, first_name, last_name, role, status, email_verified) VALUES
('admin@africaunita.it', 'africaunita02@gmail.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Admin', 'Sistema', 'admin', 'active', 1);

-- 2) UTENTI ESEMPIO (password: password)
INSERT INTO users (username, email, password_hash, first_name, last_name, phone, role, status, country_of_origin, email_verified) VALUES
('mario.rossi@africaunita.it', 'mario.rossi@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Mario', 'Rossi', '+39 333 1111111', 'user', 'active', 'Senegal', 1),
('amina.diallo@africaunita.it', 'amina.diallo@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Amina', 'Diallo', '+39 333 2222222', 'user', 'active', 'Mali', 1),
('kouame.yao@africaunita.it', 'kouame.yao@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Kouame', 'Yao', '+39 333 3333333', 'user', 'active', 'Costa d''Avorio', 1);

-- 3) POST ESEMPIO (categorie: alloggio, lavoro, formazione, servizi, eventi, altro)
INSERT INTO posts (user_id, title, description, category, location, contact_info, is_published, is_featured) VALUES
(2, 'Camera singola in condivisione', 'Camera luminosa in appartamento a 10 min dalla stazione. Cucina e bagno in comune.', 'alloggio', 'Varese', 'mario.rossi@example.com - 333 1111111', 1, 1),
(2, 'Cercasi badante part-time', 'Offro lavoro come badante per anziano, 4 ore al giorno, zona Como.', 'lavoro', 'Como', 'mario.rossi@example.com', 1, 0),
(3, 'Corso di italiano A2', 'Organizzo corso di italiano livello A2 per principianti. Inizio prossimo mese.', 'formazione', 'Milano', 'amina.diallo@example.com', 1, 1),
(4, 'Servizio traduzione documenti', 'Traduco documenti italiano-francese per permessi e pratiche burocratiche.', 'servizi', 'Varese', 'kouame.yao@example.com - 333 3333333', 1, 0),
(2, 'Festa della comunità', 'Invito alla festa annuale della comunità africana. Cibo, musica e balli.', 'eventi', 'Varese - Parco', 'mario.rossi@example.com', 1, 1);

-- 4) MESSAGGIO ESEMPIO
INSERT INTO messages (sender_id, recipient_id, subject, content, status) VALUES
(1, 2, 'Benvenuto in Africa Unita', 'Ciao Mario! Benvenuto nella nostra comunità. Se hai domande, non esitare a contattarci.', 'read');

-- 5) QUOTA ASSOCIATIVA ESEMPIO (per utente 2)
INSERT INTO membership_fees (user_id, amount, due_date, status, paid_date) VALUES
(2, 10.00, DATE_SUB(CURDATE(), INTERVAL 1 MONTH), 'paid', DATE_SUB(CURDATE(), INTERVAL 25 DAY)),
(2, 10.00, CURDATE(), 'pending', NULL);

-- 6) NOTIFICA ESEMPIO
INSERT INTO notifications (user_id, type, title, message, link, is_read) VALUES
(2, 'welcome', 'Benvenuto!', 'La tua registrazione è stata approvata. Accedi alla piattaforma per scoprire i servizi.', '/dashboard', 0);
