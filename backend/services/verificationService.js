// Verification Service - Gestione token di verifica email
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/db.js';

class VerificationService {
    constructor() {
        this.tokenExpiryHours = 24; // Token scade dopo 24 ore
    }

    async generateVerificationToken(userId) {
        const token = uuidv4();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + this.tokenExpiryHours);

        try {
            // Rimuovi token esistenti per questo utente
            await query(
                'DELETE FROM email_verifications WHERE user_id = ?',
                [userId]
            );

            // Inserisci nuovo token
            await query(
                'INSERT INTO email_verifications (user_id, token, expires_at, created_at) VALUES (?, ?, ?, NOW())',
                [userId, token, expiresAt]
            );

            return token;
        } catch (error) {
            console.error('❌ Errore generazione token di verifica:', error);
            throw error;
        }
    }

    async verifyToken(token) {
        try {
            const result = await query(
                `SELECT ev.*, u.email, u.first_name, u.last_name, u.username, u.phone, 
                        u.country_of_origin, u.created_at 
                 FROM email_verifications ev 
                 JOIN users u ON ev.user_id = u.id 
                 WHERE ev.token = ? AND ev.expires_at > NOW()`,
                [token]
            );

            if (result.rows.length === 0) {
                return { valid: false, message: 'Token non valido o scaduto' };
            }

            const verification = result.rows[0];

            // Aggiorna status utente a 'email_verified'
            // Se 'email_verified' non esiste nell'ENUM, usa 'pending' come fallback
            try {
                await query(
                    'UPDATE users SET status = ? WHERE id = ?',
                    ['email_verified', verification.user_id]
                );
            } catch (error) {
                if (error.code === 'WARN_DATA_TRUNCATED' || error.errno === 1265) {
                    console.warn('⚠️ ENUM status non include "email_verified", uso "pending" come fallback');
                    await query(
                        'UPDATE users SET status = ? WHERE id = ?',
                        ['pending', verification.user_id]
                    );
                } else {
                    throw error;
                }
            }

            // Rimuovi token usato
            await query(
                'DELETE FROM email_verifications WHERE token = ?',
                [token]
            );

            return {
                valid: true,
                message: 'Email verificata con successo',
                user: {
                    id: verification.user_id,
                    email: verification.email,
                    first_name: verification.first_name,
                    last_name: verification.last_name,
                    username: verification.username,
                    phone: verification.phone,
                    country_of_origin: verification.country_of_origin,
                    created_at: verification.created_at
                }
            };
        } catch (error) {
            console.error('❌ Errore verifica token:', error);
            return { valid: false, message: 'Errore durante la verifica' };
        }
    }

    async isEmailVerified(userId) {
        try {
            const result = await query(
                'SELECT status FROM users WHERE id = ?',
                [userId]
            );

            if (result.rows.length === 0) {
                return false;
            }

            return result.rows[0].status === 'email_verified' || result.rows[0].status === 'active';
        } catch (error) {
            console.error('❌ Errore verifica email:', error);
            return false;
        }
    }

    async cleanupExpiredTokens() {
        try {
            const result = await query(
                'DELETE FROM email_verifications WHERE expires_at < NOW()'
            );
            
            console.log(`🧹 Pulizia token scaduti: ${result.affectedRows} token rimossi`);
            return result.affectedRows;
        } catch (error) {
            console.error('❌ Errore pulizia token scaduti:', error);
            return 0;
        }
    }

    async getUserByToken(token) {
        try {
            const result = await query(
                'SELECT u.* FROM users u JOIN email_verifications ev ON u.id = ev.user_id WHERE ev.token = ? AND ev.expires_at > NOW()',
                [token]
            );

            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            console.error('❌ Errore recupero utente da token:', error);
            return null;
        }
    }
}

export default new VerificationService();
