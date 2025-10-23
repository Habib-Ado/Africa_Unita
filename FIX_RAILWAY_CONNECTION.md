# 🔧 Fix Railway Database Connection - ENOTFOUND railway

## ❌ **Problema Identificato**

L'errore `getaddrinfo ENOTFOUND railway` indica che:
1. Il `DATABASE_URL` non è configurato nel Railway dashboard
2. L'applicazione sta usando i valori di fallback invece del `DATABASE_URL`
3. Il server sta cercando di connettersi a "railway" invece dell'host corretto

## ✅ **Soluzione: Configura DATABASE_URL nel Railway Dashboard**

### **1. Accedi al Railway Dashboard**
1. Vai su [railway.app](https://railway.app)
2. Seleziona il progetto `africaunita`
3. Vai su **"Variables"** o **"Environment"**

### **2. Aggiungi DATABASE_URL**
Aggiungi questa variabile:
- **Name**: `DATABASE_URL`
- **Value**: `mysql://root:SLBQYMBhSReyvReKHdgozPCzQrEAKqyx@hopper.proxy.rlwy.net:38226/railway`

### **3. Aggiungi JWT_SECRET**
Aggiungi questa variabile:
- **Name**: `JWT_SECRET`
- **Value**: `your_super_secret_jwt_key_change_this_in_production`

### **4. Aggiungi NODE_ENV**
Aggiungi questa variabile:
- **Name**: `NODE_ENV`
- **Value**: `production`

## 🧪 **Test Configurazione**

### **Nel Railway Console:**
```bash
# Debug configurazione database
npm run railway:config
```

Questo script mostra:
- ✅ Se `DATABASE_URL` è presente
- ✅ Se le variabili d'ambiente sono configurate
- ✅ Se la configurazione è corretta

### **Test Connessione Diretta:**
```bash
# Test connessione con DATABASE_URL specifico
npm run railway:connection
```

Questo script:
1. ✅ Testa la connessione diretta al database
2. ✅ Verifica che il database sia accessibile
3. ✅ Controlla le tabelle esistenti
4. ✅ Mostra informazioni dettagliate

## 🔍 **Analisi del Problema**

### **Configurazione Attuale:**
```javascript
// backend/config.js
database: {
    url: process.env.DATABASE_URL, // Se non presente, usa fallback
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    name: process.env.DB_NAME || 'railway', // ← Questo causa l'errore
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
}
```

### **Problema:**
- Se `DATABASE_URL` non è presente, usa `DB_NAME = 'railway'`
- Il server cerca di connettersi a host "railway" invece di "hopper.proxy.rlwy.net"

### **Soluzione:**
- Aggiungi `DATABASE_URL` nel Railway dashboard
- L'applicazione userà automaticamente il `DATABASE_URL` completo

## 🎯 **Test Finale**

Dopo aver configurato le variabili:

1. **Riavvia il servizio** Railway (opzionale)
2. **Testa connessione**: `npm run railway:connection`
3. **Avvia server**: Il server dovrebbe connettersi correttamente
4. **Test login**: admin@africaunita.it / password123

## 📋 **Variabili Railway Dashboard**

### **Variabili Obbligatorie:**
- ✅ `DATABASE_URL` - URL completo del database
- ✅ `JWT_SECRET` - Chiave segreta JWT
- ✅ `NODE_ENV` - Ambiente di produzione

### **Variabili Opzionali:**
- ❌ `CORS_ORIGIN` - Dominio CORS
- ❌ `PORT` - Porta (automatica)

## 🎉 **Risultato**

Dopo aver configurato `DATABASE_URL` nel Railway dashboard, il server dovrebbe connettersi correttamente al database! 🚀
