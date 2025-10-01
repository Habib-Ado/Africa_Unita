-- ============================================
-- Africa Unita Database Schema
-- PostgreSQL Database Structure
-- ============================================

-- Rimuovi database esistente se necessario (ATTENZIONE: solo per sviluppo)
-- DROP DATABASE IF EXISTS africa_unita_db;
-- CREATE DATABASE africa_unita_db;

-- Connettiti al database
-- \c africa_unita_db;

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUM TYPES
-- ============================================

-- Ruoli utente
CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator', 'treasurer');

-- Stato utente
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending');

-- Tipo di messaggio
CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read');

-- Categoria post/novità
CREATE TYPE post_category AS ENUM ('alloggio', 'lavoro', 'formazione', 'servizi', 'eventi', 'altro');

-- Tipo di stato pagamento quota
CREATE TYPE fee_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');

-- Tipo di transazione del fondo
CREATE TYPE transaction_type AS ENUM ('income', 'expense');

-- ============================================
-- TABLES
-- ============================================

-- Tabella Utenti
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    role user_role DEFAULT 'user' NOT NULL,
    status user_status DEFAULT 'active' NOT NULL,
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
    password_reset_expires TIMESTAMP,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Posts/Novità (opportunità di lavoro, alloggi, formazioni, etc.)
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category post_category NOT NULL,
    location VARCHAR(255),
    contact_info TEXT,
    image_url VARCHAR(500),
    is_published BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    views_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Messaggi
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    status message_status DEFAULT 'sent',
    parent_message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Preferiti (salvare posts)
CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id)
);

-- Tabella Commenti
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Notifiche
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Log di Attività (per admin)
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Quote Associative Mensili
CREATE TABLE membership_fees (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL DEFAULT 10.00,
    due_date DATE NOT NULL,
    status fee_status NOT NULL DEFAULT 'pending',
    paid_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, due_date)
);

-- Tabella Transazioni del Fondo
CREATE TABLE fund_transactions (
    id SERIAL PRIMARY KEY,
    transaction_type transaction_type NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    reference_id INTEGER,
    treasurer_id INTEGER NOT NULL REFERENCES users(id),
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES per performance
-- ============================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);

-- Posts indexes
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_is_published ON posts(is_published);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_featured ON posts(is_featured) WHERE is_featured = TRUE;

-- Messages indexes
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Favorites indexes
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_post_id ON favorites(post_id);

-- Comments indexes
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Activity logs indexes
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Membership fees indexes
CREATE INDEX idx_membership_fees_user_id ON membership_fees(user_id);
CREATE INDEX idx_membership_fees_due_date ON membership_fees(due_date);
CREATE INDEX idx_membership_fees_status ON membership_fees(status);

-- Fund transactions indexes
CREATE INDEX idx_fund_transactions_type ON fund_transactions(transaction_type);
CREATE INDEX idx_fund_transactions_date ON fund_transactions(transaction_date);
CREATE INDEX idx_fund_transactions_treasurer ON fund_transactions(treasurer_id);

-- ============================================
-- TRIGGERS per updated_at automatico
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_membership_fees_updated_at BEFORE UPDATE ON membership_fees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS UTILI
-- ============================================

-- Vista per messaggi con info sender e recipient
CREATE VIEW messages_with_users AS
SELECT 
    m.id,
    m.uuid,
    m.subject,
    m.content,
    m.status,
    m.read_at,
    m.created_at,
    s.id as sender_id,
    s.username as sender_username,
    s.first_name as sender_first_name,
    s.last_name as sender_last_name,
    s.avatar_url as sender_avatar,
    r.id as recipient_id,
    r.username as recipient_username,
    r.first_name as recipient_first_name,
    r.last_name as recipient_last_name,
    r.avatar_url as recipient_avatar
FROM messages m
JOIN users s ON m.sender_id = s.id
JOIN users r ON m.recipient_id = r.id;

-- Vista per posts con info autore
CREATE VIEW posts_with_author AS
SELECT 
    p.id,
    p.uuid,
    p.title,
    p.description,
    p.category,
    p.location,
    p.contact_info,
    p.image_url,
    p.is_published,
    p.is_featured,
    p.views_count,
    p.created_at,
    p.updated_at,
    u.id as author_id,
    u.username as author_username,
    u.first_name as author_first_name,
    u.last_name as author_last_name,
    u.avatar_url as author_avatar
FROM posts p
JOIN users u ON p.user_id = u.id;

-- ============================================
-- FUNZIONI UTILI
-- ============================================

-- Funzione per contare messaggi non letti
CREATE OR REPLACE FUNCTION count_unread_messages(user_id_param INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM messages
        WHERE recipient_id = user_id_param AND status != 'read'
    );
END;
$$ LANGUAGE plpgsql;

-- Funzione per incrementare views su post
CREATE OR REPLACE FUNCTION increment_post_views(post_id_param INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE posts 
    SET views_count = views_count + 1 
    WHERE id = post_id_param;
END;
$$ LANGUAGE plpgsql;

-- Funzione per controllare lo stato pagamenti di un membro
CREATE OR REPLACE FUNCTION check_member_payment_status(member_id INTEGER)
RETURNS TABLE(
    total_fees DECIMAL(10,2),
    paid_fees DECIMAL(10,2),
    pending_fees DECIMAL(10,2),
    overdue_fees DECIMAL(10,2),
    last_payment_date TIMESTAMP,
    payment_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(amount), 0) as total_fees,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_fees,
        COALESCE(SUM(CASE WHEN status = 'pending' AND due_date >= CURRENT_DATE THEN amount ELSE 0 END), 0) as pending_fees,
        COALESCE(SUM(CASE WHEN status = 'pending' AND due_date < CURRENT_DATE THEN amount ELSE 0 END), 0) as overdue_fees,
        MAX(CASE WHEN status = 'paid' THEN paid_date END) as last_payment_date,
        CASE 
            WHEN COUNT(*) = 0 THEN 'no_fees'
            WHEN SUM(CASE WHEN status = 'pending' AND due_date < CURRENT_DATE THEN 1 ELSE 0 END) > 0 THEN 'overdue'
            WHEN SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) > 0 THEN 'pending'
            ELSE 'up_to_date'
        END as payment_status
    FROM membership_fees 
    WHERE user_id = member_id;
END;
$$ LANGUAGE plpgsql;

-- Funzione per generare quote mensili per tutti i membri attivi
CREATE OR REPLACE FUNCTION generate_monthly_fees(target_month DATE)
RETURNS INTEGER AS $$
DECLARE
    fee_count INTEGER;
BEGIN
    INSERT INTO membership_fees (user_id, amount, due_date, status)
    SELECT 
        u.id,
        10.00,
        target_month,
        'pending'
    FROM users u
    WHERE u.status = 'active' 
    AND u.role IN ('user', 'treasurer')
    AND NOT EXISTS (
        SELECT 1 FROM membership_fees mf 
        WHERE mf.user_id = u.id 
        AND DATE_TRUNC('month', mf.due_date) = DATE_TRUNC('month', target_month)
    );
    
    GET DIAGNOSTICS fee_count = ROW_COUNT;
    RETURN fee_count;
END;
$$ LANGUAGE plpgsql;

-- Funzione per confermare pagamento quota
CREATE OR REPLACE FUNCTION confirm_fee_payment(
    fee_id INTEGER,
    treasurer_id INTEGER,
    payment_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    fee_record RECORD;
    is_treasurer BOOLEAN;
BEGIN
    -- Verifica che l'utente sia un tesoriere
    SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE id = treasurer_id AND role = 'treasurer'
    ) INTO is_treasurer;
    
    IF NOT is_treasurer THEN
        RAISE EXCEPTION 'Solo i tesorieri possono confermare i pagamenti';
    END IF;
    
    -- Recupera la quota
    SELECT * INTO fee_record FROM membership_fees WHERE id = fee_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quota non trovata';
    END IF;
    
    -- Aggiorna la quota
    UPDATE membership_fees 
    SET 
        status = 'paid',
        paid_date = CURRENT_TIMESTAMP,
        notes = COALESCE(payment_notes, notes),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = fee_id;
    
    -- Aggiungi transazione al fondo
    INSERT INTO fund_transactions (
        transaction_type, 
        amount, 
        description, 
        reference_id, 
        treasurer_id
    ) VALUES (
        'income',
        fee_record.amount,
        'Pagamento quota associativa - ' || fee_record.user_id,
        fee_id,
        treasurer_id
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
