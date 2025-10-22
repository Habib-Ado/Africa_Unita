# 🗄️ Guida Completa DBeaver + Railway

## 📋 **Passo 1: Ottenere DATABASE_URL da Railway**

### Nel Dashboard Railway:
1. Vai su [railway.app](https://railway.app)
2. Seleziona il progetto `africaunita`
3. Vai su **"Variables"** o **"Environment"**
4. Trova `DATABASE_URL` - copia questo valore

**Esempio DATABASE_URL:**
```
mysql://root:password123@containers-us-west-123.railway.app:6543/railway
```

## 📋 **Passo 2: Configurare DBeaver**

### 1. **Nuova Connessione**
- Apri DBeaver
- Clicca **"New Database Connection"** (icona +)
- Seleziona **"MySQL"**
- Clicca **"Next"**

### 2. **Configurazione Connessione**
Dal DATABASE_URL, estrai:
- **Server Host**: `containers-us-west-123.railway.app`
- **Port**: `6543`
- **Database**: `railway`
- **Username**: `root`
- **Password**: `password123`

### 3. **Impostazioni Avanzate**
- **SSL Mode**: `DISABLED` (Railway non richiede SSL)
- **Connection Timeout**: `30`
- **Keep Alive**: `true`

### 4. **Test Connessione**
- Clicca **"Test Connection"**
- Se funziona, clicca **"OK"**

## 📋 **Passo 3: Setup Database**

### 1. **Esegui Schema SQL**
- Apri il file `backend/database/schema.sql`
- Copia tutto il contenuto
- In DBeaver, esegui lo script SQL

### 2. **Inserisci Dati di Test**
- Usa il file `RAILWAY_DATABASE_SETUP.sql`
- Esegui le query INSERT

### 3. **Verifica Setup**
```sql
-- Controlla tabelle
SHOW TABLES;

-- Controlla utenti
SELECT username, email, role FROM users;

-- Dovresti vedere 17 tabelle e 7 utenti
```

## 🔐 **Credenziali di Test:**
- **Admin**: admin@africaunita.it / password123
- **President**: president@africaunita.it / password123
- **Moderatore**: moderator@africaunita.it / password123
- **Tesoriere**: treasurer@africaunita.it / password123

## 🎯 **Risultato:**
Dopo il setup, il login funzionerà su `https://africaunita.up.railway.app`!

## 🛠️ **Troubleshooting:**

### Se la connessione fallisce:
1. Verifica che `DATABASE_URL` sia corretto
2. Controlla che il progetto Railway sia attivo
3. Prova a disabilitare SSL

### Se le query falliscono:
1. Verifica che le tabelle esistano
2. Controlla i permessi dell'utente
3. Esegui le query una alla volta
