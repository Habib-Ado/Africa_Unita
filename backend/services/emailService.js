// Email Service - Gestione invio email
import nodemailer from 'nodemailer';
import { config } from '../config.js';

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    initializeTransporter() {
        // Configurazione per Gmail (può essere cambiata per altri provider)
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER || 'your-email@gmail.com',
                pass: process.env.EMAIL_PASS || 'your-app-password'
            }
        });
    }

    async sendVerificationEmail(userEmail, verificationToken, userName) {
        const verificationUrl = `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
        
        const mailOptions = {
            from: process.env.EMAIL_USER || 'noreply@africaunita.it',
            to: userEmail,
            subject: '🌍 Africa Unita - Verifica la tua email',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Verifica Email - Africa Unita</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #2c5530; color: white; padding: 20px; text-align: center; }
                        .content { padding: 30px; background: #f9f9f9; }
                        .button { 
                            display: inline-block; 
                            background: #2c5530; 
                            color: white; 
                            padding: 12px 30px; 
                            text-decoration: none; 
                            border-radius: 5px; 
                            margin: 20px 0;
                        }
                        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🌍 Africa Unita</h1>
                            <p>Associazione di supporto per migranti africani</p>
                        </div>
                        <div class="content">
                            <h2>Ciao ${userName}!</h2>
                            <p>Benvenuto/a in Africa Unita! Per completare la tua registrazione, devi verificare il tuo indirizzo email.</p>
                            
                            <p>Fai clic sul pulsante qui sotto per verificare la tua email:</p>
                            
                            <a href="${verificationUrl}" class="button">✅ Verifica Email</a>
                            
                            <p>Se il pulsante non funziona, copia e incolla questo link nel tuo browser:</p>
                            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 3px;">
                                ${verificationUrl}
                            </p>
                            
                            <p><strong>Nota:</strong> Il link scadrà tra 24 ore per motivi di sicurezza.</p>
                            
                            <p>Una volta verificata la tua email, un amministratore esaminerà la tua richiesta e ti invierà una notifica quando il tuo account sarà approvato.</p>
                            
                            <p>Grazie per aver scelto Africa Unita!</p>
                        </div>
                        <div class="footer">
                            <p>Africa Unita - Uniti per un futuro migliore</p>
                            <p>Se non hai richiesto questa registrazione, ignora questa email.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email di verifica inviata a: ${userEmail}`);
            return true;
        } catch (error) {
            console.error('❌ Errore invio email di verifica:', error);
            return false;
        }
    }

    async sendAdminNotificationEmail(newUser) {
        const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : ['admin@africaunita.it'];
        const adminUrl = `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/admin/users`;
        
        const mailOptions = {
            from: process.env.EMAIL_USER || 'noreply@africaunita.it',
            to: adminEmails.join(','),
            subject: '🔔 Africa Unita - Nuova registrazione da approvare',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Nuova Registrazione - Africa Unita</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #d32f2f; color: white; padding: 20px; text-align: center; }
                        .content { padding: 30px; background: #f9f9f9; }
                        .user-info { background: #fff; padding: 20px; border-left: 4px solid #2c5530; margin: 20px 0; }
                        .button { 
                            display: inline-block; 
                            background: #2c5530; 
                            color: white; 
                            padding: 12px 30px; 
                            text-decoration: none; 
                            border-radius: 5px; 
                            margin: 20px 0;
                        }
                        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔔 Nuova Registrazione</h1>
                            <p>Africa Unita - Richiede approvazione</p>
                        </div>
                        <div class="content">
                            <h2>Nuovo utente registrato</h2>
                            <p>Un nuovo utente si è registrato e richiede la tua approvazione:</p>
                            
                            <div class="user-info">
                                <h3>👤 Informazioni Utente:</h3>
                                <p><strong>Nome:</strong> ${newUser.first_name} ${newUser.last_name}</p>
                                <p><strong>Email:</strong> ${newUser.email}</p>
                                <p><strong>Username:</strong> ${newUser.username}</p>
                                <p><strong>Telefono:</strong> ${newUser.phone || 'Non fornito'}</p>
                                <p><strong>Paese di origine:</strong> ${newUser.country_of_origin || 'Non specificato'}</p>
                                <p><strong>Data registrazione:</strong> ${new Date(newUser.created_at).toLocaleString('it-IT')}</p>
                            </div>
                            
                            <p>Per approvare o rifiutare questa registrazione, accedi al pannello amministrativo:</p>
                            
                            <a href="${adminUrl}" class="button">🔧 Pannello Admin</a>
                            
                            <p><strong>Nota:</strong> L'utente ha già verificato la sua email e sta aspettando l'approvazione.</p>
                        </div>
                        <div class="footer">
                            <p>Africa Unita - Sistema di notifiche</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`✅ Notifica admin inviata per nuovo utente: ${newUser.email}`);
            return true;
        } catch (error) {
            console.error('❌ Errore invio notifica admin:', error);
            return false;
        }
    }

    async sendApprovalEmail(userEmail, userName, approved) {
        const subject = approved ? '✅ Africa Unita - Account approvato!' : '❌ Africa Unita - Account non approvato';
        const message = approved 
            ? 'Il tuo account è stato approvato! Puoi ora accedere alla piattaforma Africa Unita.'
            : 'Siamo spiacenti, ma il tuo account non è stato approvato. Contatta l\'amministrazione per maggiori informazioni.';
        
        const mailOptions = {
            from: process.env.EMAIL_USER || 'noreply@africaunita.it',
            to: userEmail,
            subject: subject,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>${approved ? 'Account Approvato' : 'Account Non Approvato'} - Africa Unita</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { 
                            background: ${approved ? '#2c5530' : '#d32f2f'}; 
                            color: white; 
                            padding: 20px; 
                            text-align: center; 
                        }
                        .content { padding: 30px; background: #f9f9f9; }
                        .button { 
                            display: inline-block; 
                            background: ${approved ? '#2c5530' : '#d32f2f'}; 
                            color: white; 
                            padding: 12px 30px; 
                            text-decoration: none; 
                            border-radius: 5px; 
                            margin: 20px 0;
                        }
                        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>${approved ? '✅ Account Approvato' : '❌ Account Non Approvato'}</h1>
                            <p>Africa Unita</p>
                        </div>
                        <div class="content">
                            <h2>Ciao ${userName}!</h2>
                            <p>${message}</p>
                            
                            ${approved ? `
                                <p>Puoi ora accedere alla piattaforma:</p>
                                <a href="${process.env.CORS_ORIGIN || 'http://localhost:3000'}" class="button">🌍 Accedi a Africa Unita</a>
                            ` : `
                                <p>Se hai domande, contatta l'amministrazione.</p>
                            `}
                        </div>
                        <div class="footer">
                            <p>Africa Unita - Uniti per un futuro migliore</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email di ${approved ? 'approvazione' : 'rifiuto'} inviata a: ${userEmail}`);
            return true;
        } catch (error) {
            console.error(`❌ Errore invio email di ${approved ? 'approvazione' : 'rifiuto'}:`, error);
            return false;
        }
    }
}

export default new EmailService();
