import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { config } from '../config.js';

async function seedDatabase() {
    let connection;
    
    try {
        console.log('🔌 Connexion à la base de données MySQL...');
        
        // Utilise la configuration depuis config.js
        const connectionConfig = config.database.url 
            ? {
                uri: config.database.url,
                ssl: false
            }
            : {
                host: config.database.host,
                port: config.database.port,
                database: config.database.name,
                user: config.database.user,
                password: config.database.password,
                ssl: false
            };

        connection = await mysql.createConnection(connectionConfig);
        console.log('✅ Connecté à la base de données');

        console.log('🌱 Insertion de données de test...');

        // Hash du mot de passe pour les utilisateurs de test
        const passwordHash = await bcrypt.hash('password123', 10);
        console.log('🔐 Mot de passe hashé pour les utilisateurs de test');

        // Insertion des utilisateurs de test
        console.log('👥 Création des utilisateurs de test...');
        await connection.execute(`
            INSERT INTO users (username, email, password_hash, first_name, last_name, role, status, country_of_origin, bio) VALUES
            ('admin', 'admin@africaunita.it', ?, 'Admin', 'Sistema', 'admin', 'active', NULL, 'Administrateur du système'),
            ('president', 'president@africaunita.it', ?, 'Jean', 'President', 'president', 'active', 'Sénégal', 'Président de l''association'),
            ('moderator', 'moderator@africaunita.it', ?, 'Fatou', 'Diop', 'moderator', 'active', 'Mali', 'Modératrice de contenu'),
            ('treasurer', 'treasurer@africaunita.it', ?, 'Amadou', 'Kone', 'treasurer', 'active', 'Côte d''Ivoire', 'Trésorier de l''association'),
            ('user1', 'user@africaunita.it', ?, 'Marie', 'Touré', 'user', 'active', 'Guinée', 'Membre actif de la communauté'),
            ('mario_rossi', 'mario@test.com', ?, 'Mario', 'Rossi', 'user', 'active', 'Italie', 'Membre bénévole'),
            ('ibrahim_sy', 'ibrahim@test.com', ?, 'Ibrahim', 'Sy', 'user', 'active', 'Mauritanie', 'Nouveau membre')
            ON DUPLICATE KEY UPDATE username=username
        `, [passwordHash, passwordHash, passwordHash, passwordHash, passwordHash, passwordHash, passwordHash]);

        // Récupération des IDs utilisateurs
        const [users] = await connection.execute('SELECT id, username FROM users');
        const adminUser = users.find(u => u.username === 'admin');
        const moderatorUser = users.find(u => u.username === 'moderator');
        const user1 = users.find(u => u.username === 'user1');
        const marioUser = users.find(u => u.username === 'mario_rossi');
        const ibrahimUser = users.find(u => u.username === 'ibrahim_sy');

        // Insertion de posts de test
        console.log('📝 Création de posts d\'exemple...');
        await connection.execute(`
            INSERT INTO posts (title, description, category, location, contact_info, user_id, is_published) VALUES
            ('Chambre disponible à Varese', 'Je propose une chambre simple dans un appartement partagé au centre de Varese. Quartier calme, proche des transports publics. Disponible immédiatement. Loyer mensuel 350€ + charges.', 'alloggio', 'Varese, Italie', 'Contactez-moi par message privé', ?, true),
            ('Recherche magasinier temps partiel', 'Entreprise de logistique recherche magasinier pour travail à temps partiel (20h/semaine). Expérience minimale requise. Horaires flexibles. CDD avec possibilité de prolongation.', 'lavoro', 'Côme, Italie', 'Envoyer CV à info@example.com', ?, true),
            ('Cours d''italien gratuit', 'L''association organise un cours d''italien pour débutants. Cours 2 fois par semaine (lundi et mercredi 18h-20h). Matériel pédagogique fourni. Places limitées !', 'formazione', 'Varese, Italie', 'Inscrivez-vous à notre siège', ?, true),
            ('Service de traduction disponible', 'Je propose un service de traduction italien-français-anglais. Expérience de plusieurs années. Tarifs compétitifs. Disponible aussi pour interprétation événements.', 'servizi', 'En ligne', 'WhatsApp: +39 333 1234567', ?, true),
            ('Fête communautaire - Samedi 15', 'Grande fête de la communauté samedi 15 à partir de 15h. Musique, cuisine traditionnelle africaine, activités pour enfants. Entrée libre, tous bienvenus !', 'eventi', 'Centre Social Varese', 'Pour info: eventi@africaunita.it', ?, true),
            ('Offre emploi serveur', 'Restaurant du centre de Milan recherche serveur avec expérience. Contrat temps plein, salaire compétitif. Connaissance de base de l''italien requise.', 'lavoro', 'Milan, Italie', 'Appeler: 02 1234567', ?, true),
            ('Recherche colocataire', 'Je cherche un colocataire pour partager un appartement 2 pièces à Como. Loyer 400€/mois tout compris. Personnes calmes et respectueuses uniquement.', 'alloggio', 'Como, Italie', 'Email: casa@test.com', ?, true)
            ON DUPLICATE KEY UPDATE title=title
        `, [adminUser?.id || 1, user1?.id || 1, adminUser?.id || 1, marioUser?.id || 1, adminUser?.id || 1, user1?.id || 1, ibrahimUser?.id || 1]);

        // Insertion de contenu site
        console.log('📰 Création de contenu du site...');
        await connection.execute(`
            INSERT INTO site_content (title, content, content_type, status, author_id, published_at) VALUES
            ('Bienvenue à Africa Unita', 'Africa Unita est une association dédiée au soutien des migrants africains en Italie. Nous offrons aide, formation et services communautaires.', 'post', 'published', ?, NOW()),
            ('Nos services', 'Nous proposons : aide au logement, recherche d''emploi, cours de langue, assistance administrative, événements culturels et bien plus encore.', 'post', 'published', ?, NOW()),
            ('Réunion mensuelle', 'La prochaine réunion de l''association aura lieu le premier samedi du mois. Tous les membres sont invités à participer.', 'announcement', 'published', ?, NOW())
            ON DUPLICATE KEY UPDATE title=title
        `, [adminUser?.id || 1, moderatorUser?.id || 1, adminUser?.id || 1]);

        // Insertion de messages d'exemple
        console.log('💬 Création de messages de test...');
        await connection.execute(`
            INSERT INTO messages (sender_id, recipient_id, subject, content, status) VALUES
            (?, ?, 'Bienvenue !', 'Bienvenue dans notre communauté ! N''hésitez pas à nous contacter si vous avez des questions.', 'sent'),
            (?, ?, 'Information sur le cours', 'Bonjour, je souhaite avoir plus d''informations sur le cours d''italien. Merci !', 'sent')
            ON DUPLICATE KEY UPDATE subject=subject
        `, [adminUser?.id || 1, user1?.id || 1, user1?.id || 1, adminUser?.id || 1]);

        // Insertion de quotes associatives
        console.log('💰 Création des quotes associatives...');
        const today = new Date();
        const currentMonth = today.toISOString().slice(0, 7) + '-01';
        
        for (const user of users) {
            if (user.id) {
                await connection.execute(`
                    INSERT INTO membership_fees (user_id, amount, due_date, status) VALUES (?, 10.00, ?, 'pending')
                    ON DUPLICATE KEY UPDATE amount=amount
                `, [user.id, currentMonth]);
            }
        }

        // Insertion d'une réunion
        console.log('📅 Création d\'une réunion d\'exemple...');
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const meetingDate = nextMonth.toISOString().slice(0, 10);
        
        await connection.execute(`
            INSERT INTO meetings (title, description, meeting_date, meeting_time, location, created_by, status) VALUES
            ('Réunion mensuelle', 'Réunion mensuelle de l''association pour discuter des activités et projets en cours.', ?, '18:00:00', 'Siège de l''association', ?, 'scheduled')
            ON DUPLICATE KEY UPDATE title=title
        `, [meetingDate, adminUser?.id || 1]);

        console.log('✅ Données de test insérées avec succès !');
        console.log('');
        console.log('👤 Comptes de test créés :');
        console.log('   - Admin      : admin@africaunita.it / password123');
        console.log('   - Président  : president@africaunita.it / password123');
        console.log('   - Modérateur : moderator@africaunita.it / password123');
        console.log('   - Trésorier  : treasurer@africaunita.it / password123');
        console.log('   - Utilisateur: user@africaunita.it / password123');
        console.log('');
        console.log('🎉 Seeding terminé !');
        
    } catch (error) {
        console.error('❌ Erreur lors du seeding:', error.message);
        console.error('Détails:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

seedDatabase();

