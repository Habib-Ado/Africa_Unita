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
        // Supporta sia EMAIL_PASS che EMAIL_PASSWORD per compatibilità
        const emailPass = process.env.EMAIL_PASSWORD;
        // Rimuovi eventuali spazi dalla password (le App Password di Gmail non devono avere spazi)
        const cleanPassword = emailPass.replace(/\s+/g, '');
        
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: cleanPassword
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
        const adminEmail = 'africaunita02@gmail.com';
        const adminUrl = `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/admin/users`;
        
        const mailOptions = {
            from: `${newUser.first_name} ${newUser.last_name} via Africa Unita <${process.env.EMAIL_USER || 'noreply@africaunita.it'}>`,
            replyTo: newUser.email,
            to: adminEmail,
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

    async sendApprovalEmail(userEmail, userName, approved, loginUsername = null, loginPassword = null) {
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
                        .credentials { 
                            background: #fff; 
                            padding: 20px; 
                            border-left: 4px solid #2c5530; 
                            margin: 20px 0;
                            border-radius: 5px;
                        }
                        .credential-item { 
                            margin: 15px 0; 
                            padding: 10px; 
                            background: #f5f5f5; 
                            border-radius: 3px;
                        }
                        .credential-label { font-weight: bold; color: #2c5530; }
                        .credential-value { 
                            font-family: monospace; 
                            font-size: 16px; 
                            color: #333; 
                            padding: 5px;
                            background: #fff;
                            border: 1px solid #ddd;
                            border-radius: 3px;
                            display: inline-block;
                            min-width: 200px;
                        }
                        .button { 
                            display: inline-block; 
                            background: ${approved ? '#2c5530' : '#d32f2f'}; 
                            color: white; 
                            padding: 12px 30px; 
                            text-decoration: none; 
                            border-radius: 5px; 
                            margin: 20px 0;
                        }
                        .warning { 
                            background: #fff3cd; 
                            border-left: 4px solid #ffc107; 
                            padding: 15px; 
                            margin: 20px 0;
                            border-radius: 3px;
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
                            
                            ${approved && loginUsername && loginPassword ? `
                                <div class="credentials">
                                    <h3>🔐 Le tue credenziali di accesso:</h3>
                                    <div class="credential-item">
                                        <span class="credential-label">Username (Email di accesso):</span><br>
                                        <span class="credential-value">${loginUsername}</span>
                                    </div>
                                    <div class="credential-item">
                                        <span class="credential-label">Password:</span><br>
                                        <span class="credential-value">${loginPassword}</span>
                                    </div>
                                    <p><small><strong>Nota:</strong> Usa questo username per accedere al sito. L'email ${userEmail} viene utilizzata solo per ricevere notifiche.</small></p>
                                </div>
                                <div class="warning">
                                    <strong>⚠️ Importante:</strong> Questa è la password temporanea per il tuo primo accesso. <strong>Dovrai cambiarla obbligatoriamente al primo login</strong> per motivi di sicurezza. Dopo aver cambiato la password, potrai utilizzare tutte le funzionalità della piattaforma.
                                </div>
                                <p>Puoi ora accedere alla piattaforma:</p>
                                <a href="${process.env.CORS_ORIGIN || 'http://localhost:3000'}/login" class="button">🌍 Accedi a Africa Unita</a>
                            ` : approved ? `
                                <p>Puoi ora accedere alla piattaforma:</p>
                                <a href="${process.env.CORS_ORIGIN || 'http://localhost:3000'}/login" class="button">🌍 Accedi a Africa Unita</a>
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

    // Metodo generico per inviare email
    async sendEmail(to, subject, html) {
        // Supporta sia EMAIL_PASS che EMAIL_PASSWORD per compatibilità
        const emailPass = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;
        
        if (!process.env.EMAIL_USER || !emailPass) {
            console.error('❌ Credenziali email non configurate (EMAIL_USER o EMAIL_PASSWORD/EMAIL_PASS mancanti)');
            console.error('   Configura EMAIL_USER e EMAIL_PASSWORD nel file .env del backend');
            console.error('   EMAIL_USER presente:', !!process.env.EMAIL_USER);
            console.error('   EMAIL_PASSWORD presente:', !!process.env.EMAIL_PASSWORD);
            console.error('   EMAIL_PASS presente:', !!process.env.EMAIL_PASS);
            return false;
        }

        // Verifica che le credenziali non siano i valori di default
        if (process.env.EMAIL_USER === 'your-email@gmail.com' || emailPass === 'your-app-password') {
            console.error('❌ Credenziali email non configurate correttamente');
            console.error('   Sostituisci i valori di default con le tue credenziali reali nel file .env');
            return false;
        }

        if (!this.transporter) {
            console.error('❌ Transporter email non inizializzato');
            return false;
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: to,
            subject: subject,
            html: html
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email inviata a: ${to}`);
            return true;
        } catch (error) {
            console.error(`❌ Errore invio email a ${to}:`, error.message);
            if (error.code === 'EAUTH') {
                console.error('⚠️ Errore autenticazione email - verifica EMAIL_USER e EMAIL_PASS nel .env');
                console.error('   Per Gmail, usa una "App Password" invece della password normale');
                console.error('   Vai su: https://myaccount.google.com/apppasswords');
            } else if (error.code === 'ECONNECTION') {
                console.error('⚠️ Errore di connessione al server email');
            } else {
                console.error('   Codice errore:', error.code);
                console.error('   Dettagli:', error);
            }
            return false;
        }
    }
}

export default new EmailService();
