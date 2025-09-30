import bcrypt from 'bcrypt';
import { query } from '../database/db.js';

const seedDatabase = async () => {
    try {
        console.log('🌱 Seeding database...');

        // Hash per password di test
        const password_hash = await bcrypt.hash('Password123!', 10);

        // Inserisci utenti di test
        console.log('👥 Creating test users...');
        
        const adminUser = await query(
            `INSERT INTO users (username, email, password_hash, first_name, last_name, role, status, country_of_origin)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (email) DO NOTHING
             RETURNING id`,
            ['admin', 'admin@africaunita.org', password_hash, 'Admin', 'User', 'admin', 'active', 'Italia']
        );

        const testUser1 = await query(
            `INSERT INTO users (username, email, password_hash, first_name, last_name, role, status, country_of_origin, city, phone)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (email) DO NOTHING
             RETURNING id`,
            ['mario_rossi', 'mario@test.com', password_hash, 'Mario', 'Rossi', 'user', 'active', 'Senegal', 'Varese', '+39 123 456 7890']
        );

        const testUser2 = await query(
            `INSERT INTO users (username, email, password_hash, first_name, last_name, role, status, country_of_origin, city)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (email) DO NOTHING
             RETURNING id`,
            ['fatou_diop', 'fatou@test.com', password_hash, 'Fatou', 'Diop', 'user', 'active', 'Costa d\'Avorio', 'Milano']
        );

        console.log('✅ Test users created');

        // Inserisci posts di test
        if (testUser1.rows.length > 0 && testUser2.rows.length > 0) {
            console.log('📝 Creating test posts...');

            await query(
                `INSERT INTO posts (user_id, title, description, category, location, contact_info, is_featured)
                 VALUES 
                 ($1, 'Stanza disponibile a Varese', 'Stanza singola disponibile in appartamento condiviso nel centro di Varese. Zona tranquilla e ben servita dai mezzi pubblici. Affitto mensile 350€ tutto incluso.', 'alloggio', 'Varese, Italia', 'Contattare via messaggio privato', true),
                 ($2, 'Corso di formazione informatica gratuito', 'L''associazione organizza un corso gratuito di informatica base per migranti. Durata 3 mesi, 2 volte a settimana. Si rilascia attestato finale.', 'formazione', 'Milano, Italia', 'info@africaunita.org', true),
                 ($1, 'Cerco lavoro come muratore', 'Esperienza pluriennale come muratore. Disponibile per lavori di ristrutturazione e manutenzione. Serio e affidabile.', 'lavoro', 'Varese e provincia', '+39 123 456 7890', false),
                 ($2, 'Servizio di mediazione culturale', 'Offro servizi di mediazione culturale e traduzione (Francese, Inglese, Italiano). Disponibile per accompagnamento presso uffici pubblici.', 'servizi', 'Milano e provincia', 'Contattare via messaggio', false),
                 ($1, 'Evento culturale africano', 'Grande evento di musica e cultura africana. Sabato 15 Ottobre alle ore 18:00 presso il centro civico. Ingresso libero.', 'eventi', 'Varese', 'Maggiori info sul sito', true)`,
                [testUser1.rows[0].id, testUser2.rows[0].id]
            );

            console.log('✅ Test posts created');

            // Inserisci messaggi di test
            console.log('💬 Creating test messages...');

            await query(
                `INSERT INTO messages (sender_id, recipient_id, subject, content)
                 VALUES 
                 ($1, $2, 'Informazioni sulla stanza', 'Ciao! Sono interessato alla stanza che hai pubblicato. È ancora disponibile? Grazie!'),
                 ($2, $1, 'Re: Informazioni sulla stanza', 'Ciao! Sì, la stanza è ancora disponibile. Quando vuoi venire a vederla?')`,
                [testUser2.rows[0].id, testUser1.rows[0].id]
            );

            console.log('✅ Test messages created');
        }

        console.log('');
        console.log('═══════════════════════════════════════════════');
        console.log('🎉 Database seeded successfully!');
        console.log('═══════════════════════════════════════════════');
        console.log('');
        console.log('Test accounts created:');
        console.log('');
        console.log('Admin Account:');
        console.log('  Email: admin@africaunita.org');
        console.log('  Password: Password123!');
        console.log('');
        console.log('Test User 1:');
        console.log('  Email: mario@test.com');
        console.log('  Password: Password123!');
        console.log('');
        console.log('Test User 2:');
        console.log('  Email: fatou@test.com');
        console.log('  Password: Password123!');
        console.log('');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

seedDatabase();
