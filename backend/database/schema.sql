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
    status ENUM('active', 'inactive', 'blocked', 'unblocked', 'suspended', 'pending', 'deleted') DEFAULT 'active' NOT NULL,
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

