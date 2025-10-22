# 🗄️ DBeaver + Railway Database Setup

## 📋 **Passo 1: Ottenere le Credenziali Database da Railway**

### Nel Dashboard Railway:
1. Vai su [railway.app](https://railway.app)
2. Seleziona il progetto `africaunita`
3. Vai su **"Variables"** o **"Environment"**
4. Trova `DATABASE_URL` - copia questo valore

### Formato DATABASE_URL:
```
mysql://username:password@host:port/database
```

## 📋 **Passo 2: Configurare DBeaver**

### 1. **Nuova Connessione**
- Apri DBeaver
- Clicca **"New Database Connection"** (icona +)
- Seleziona **"MySQL"**

### 2. **Configurazione Connessione**
- **Server Host**: `host` dal DATABASE_URL
- **Port**: `port` dal DATABASE_URL (solitamente 3306)
- **Database**: `database` dal DATABASE_URL
- **Username**: `username` dal DATABASE_URL
- **Password**: `password` dal DATABASE_URL

### 3. **Test Connessione**
- Clicca **"Test Connection"**
- Se funziona, clicca **"OK"**

## 📋 **Passo 3: Setup Database tramite DBeaver**

### 1. **Esegui Schema SQL**
- Apri il file `backend/database/schema.sql`
- Copia tutto il contenuto
- In DBeaver, esegui lo script SQL

### 2. **Inserisci Dati di Test**
- Apri il file `backend/scripts/seedDatabaseMySQL.js`
- Copia le query INSERT
- Esegui le query in DBeaver

## 📋 **Passo 4: Verifica**

### Controlla Tabelle:
```sql
SHOW TABLES;
```

### Controlla Utenti:
```sql
SELECT username, email, role FROM users;
```

### Dovresti vedere:
- 17 tabelle create
- 7 utenti di test inseriti
- Credenziali: admin@africaunita.it / password123

## 🔐 **Credenziali di Test:**
- **Admin**: admin@africaunita.it / password123
- **President**: president@africaunita.it / password123
- **Moderatore**: moderator@africaunita.it / password123
- **Tesoriere**: treasurer@africaunita.it / password123

## 🎯 **Risultato:**
Dopo il setup, il login funzionerà su `https://africaunita.up.railway.app`!
