import { query } from '../database/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const updateDatabaseFunctions = async () => {
    try {
        console.log('🔄 Updating database functions...');
        
        // Read the schema file
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schemaContent = fs.readFileSync(schemaPath, 'utf8');
        
        // Split the schema into individual statements
        const statements = schemaContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        // Execute each statement
        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await query(statement);
                    console.log('✅ Executed:', statement.substring(0, 50) + '...');
                } catch (error) {
                    console.log('⚠️  Warning:', error.message);
                    // Continue with other statements
                }
            }
        }
        
        console.log('✅ Database functions updated successfully!');
        
    } catch (error) {
        console.error('❌ Error updating database functions:', error);
        throw error;
    }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    updateDatabaseFunctions()
        .then(() => {
            console.log('Database update completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Database update failed:', error);
            process.exit(1);
        });
}

export default updateDatabaseFunctions;
