# 🗄️ Database Africa Unita - MySQL

## Schema Consolidato

Tutto lo schema del database MySQL è ora contenuto in un **unico file**:
- 📄 **`schema.sql`** - Schema completo e aggiornato per MySQL

## Struttura Database

### 📊 Tabelle Principali

#### Gestione Utenti
- **users** - Utenti della piattaforma
- **activity_logs** - Log attività per admin

#### Contenuti e Comunicazione
- **posts** - Annunci (lavoro, alloggi, servizi, etc.)
- **post_files** - File allegati agli annunci
- **site_content** - Contenuti gestiti dai moderatori
- **content_files** - File allegati ai contenuti
- **comments** - Commenti su posts e contenuti
- **messages** - Sistema di messaggistica privata
- **notifications** - Notifiche utenti
- **favorites** - Posts salvati dagli utenti

#### Gestione Finanziaria
- **membership_fees** - Quote associative mensili
- **fund_transactions** - Transazioni del fondo comune
- **loans** - Prestiti ai membri
- **loan_installments** - Rate mensili dei prestiti

#### Gestione Riunioni
- **meetings** - Riunioni mensili dell'associazione
- **meeting_attendance** - Presenze alle riunioni
- **meeting_penalties** - Multe per assenze consecutive

### 🎯 Enum Types

#### user_role
- `user` - Membro standard
- `admin` - Amministratore completo
- `president` - Presidente dell'associazione
- `moderator` - Moderatore contenuti
- `treasurer` - Tesoriere

#### user_status
- `active` - Utente attivo
- `inactive` - Utente inattivo
- `blocked` - Utente bloccato dall'admin
- `suspended` - Utente sospeso
- `pending` - In attesa di verifica
- `deleted` - Utente eliminato (soft delete)

#### Altri Enum
- `message_status`: sent, delivered, read
- `post_category`: alloggio, lavoro, formazione, servizi, eventi, altro
- `fee_status`: pending, paid, overdue, cancelled
- `transaction_type`: income, expense
- `content_type`: post, photo, video, document, announcement
- `content_status`: draft, published, archived
- `loan_status`: pending, approved, active, completed, cancelled, rejected
- `installment_status`: pending, paid, overdue

### 🔧 Funzioni Principali

#### Gestione Quote
- `generate_monthly_fees(target_month)` - Genera quote mensili
- `confirm_fee_payment(fee_id, treasurer_id, notes)` - Conferma pagamento quota
- `check_member_payment_status(member_id)` - Verifica stato pagamenti

#### Gestione Prestiti
- `create_loan_installments(...)` - Crea rate mensili
- `approve_loan(loan_id, treasurer_id, start_date)` - Approva prestito
- `reject_loan(loan_id, treasurer_id, notes)` - Rifiuta prestito
- `confirm_installment_payment(...)` - Conferma pagamento rata
- `update_overdue_installments()` - Aggiorna rate scadute
- `get_user_loan_stats(user_id)` - Statistiche prestiti utente

#### Gestione Riunioni
- `check_consecutive_absences()` - Trigger per multe automatiche

#### Utility
- `count_unread_messages(user_id)` - Conta messaggi non letti
- `increment_post_views(post_id)` - Incrementa visualizzazioni post

### 📈 Views

- **messages_with_users** - Messaggi con info sender/recipient
- **posts_with_author** - Posts con info autore
- **loans_with_user** - Prestiti con info utente
- **user_meeting_stats** - Statistiche presenze utente

## 🚀 Setup Database

### Nuovo Database
Per creare un nuovo database MySQL da zero:

```bash
mysql -u root -p < schema.sql
```

O manualmente:
1. Accedi a MySQL: `mysql -u root -p`
2. Crea il database: `CREATE DATABASE africa_unita_db;`
3. Usa il database: `USE africa_unita_db;`
4. Esegui lo schema: `SOURCE schema.sql;`

### Migrazione Esistente

Se hai un database esistente, esegui lo schema `schema.sql` che contiene già le istruzioni `CREATE TABLE IF NOT EXISTS` e ricrea tutte le tabelle in modo sicuro.

## 🔑 Scripts Disponibili

### Utility
- `setupDatabase.js` - Setup iniziale database
- `seedDatabase.js` - Popola database con dati di test
- `resetPasswords.js` - Reset password utenti di test
- `generateFees.js` - Genera quote mensili
- `checkPostFiles.js` - Verifica integrità file posts

### Migrazione (se necessario)
- Vedi `README_MIGRATION.md` per istruzioni migrazione ruolo "president"

## 📝 Note Importanti

### Sicurezza
- ✅ Tutti i trigger `updated_at` sono automatici
- ✅ Constraint CHECK per integrità dati
- ✅ Foreign keys con ON DELETE appropriati
- ✅ Indici su tutte le colonne frequentemente usate
- ✅ UUID per identificatori pubblici

### Performance
- ✅ Indici ottimizzati su tutte le colonne chiave
- ✅ Foreign keys con CASCADE appropriati
- ✅ AUTO_INCREMENT per ID primari

### Backup
Consigliato backup regolare:
```bash
mysqldump -u root -p africa_unita_db > backup_$(date +%Y%m%d).sql
```

## 🔄 Changelog

### Ottobre 2025
- ✅ Consolidato tutti gli schemi in `schema.sql`
- ✅ Aggiunto ruolo `president` a `user_role`
- ✅ Aggiunto stati `blocked` e `deleted` a `user_status`
- ✅ Eliminati file schema frammentati
- ✅ Aggiunti controlli `IF NOT EXISTS` per sicurezza
- ✅ Documentazione completa

## 📧 Supporto

Per problemi con il database MySQL, controlla:
1. Connessione: `mysql -u root -p -e "SELECT VERSION();"`
2. Tabelle: `mysql -u root -p africa_unita_db -e "SHOW TABLES;"`
3. Struttura tabella: `mysql -u root -p africa_unita_db -e "DESCRIBE users;"`

---

**Ultima revisione**: Ottobre 2025
**Versione Schema**: 2.0 (Consolidato)

