-- Migration: Renommer colonnes users de name/surname vers first_name/last_name
-- Date: Octobre 2025

USE africa_unita_db;

-- Vérifier si les colonnes name et surname existent
SET @dbname = DATABASE();
SET @tablename = 'users';
SET @columnexists_name = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = @dbname 
    AND TABLE_NAME = @tablename 
    AND COLUMN_NAME = 'name'
);

SET @columnexists_surname = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = @dbname 
    AND TABLE_NAME = @tablename 
    AND COLUMN_NAME = 'surname'
);

-- Si name existe, renommer en first_name
SET @query1 = IF(@columnexists_name > 0,
    'ALTER TABLE users CHANGE COLUMN name first_name VARCHAR(100)',
    'SELECT "Column name already renamed or does not exist" AS message'
);
PREPARE stmt1 FROM @query1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

-- Si surname existe, renommer en last_name  
SET @query2 = IF(@columnexists_surname > 0,
    'ALTER TABLE users CHANGE COLUMN surname last_name VARCHAR(100)',
    'SELECT "Column surname already renamed or does not exist" AS message'
);
PREPARE stmt2 FROM @query2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Vérifier le résultat
SELECT 'Migration completed! Checking columns...' AS status;
DESCRIBE users;

