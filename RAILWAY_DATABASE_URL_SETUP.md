# 🚀 Railway Database URL Setup - Africa Unita

## ✅ **DATABASE_URL Ricevuto**

Hai il `DATABASE_URL` di Railway:
```
mysql://root:SLBQYMBhSReyvReKHdgozPCzQrEAKqyx@hopper.proxy.rlwy.net:38226/railway
```

## 🔧 **Configurazione Railway Dashboard**

### **1. Aggiungi DATABASE_URL nel Dashboard**
1. Vai su [railway.app](https://railway.app)
2. Seleziona il progetto `africaunita`
3. Vai su **"Variables"**
4. Aggiungi variabile:
   - **Name**: `DATABASE_URL`
   - **Value**: `mysql://root:SLBQYMBhSReyvReKHdgozPCzQrEAKqyx@hopper.proxy.rlwy.net:38226/railway`

### **2. Aggiungi JWT_SECRET**
Nel Railway dashboard, aggiungi:
- **Name**: `JWT_SECRET`
- **Value**: `your_super_secret_jwt_key_change_this_in_production`

### **3. Aggiungi NODE_ENV**
Nel Railway dashboard, aggiungi:
- **Name**: `NODE_ENV`
- **Value**: `production`

## 🧪 **Test Database Connection**

### **Nel Railway Console:**
```bash
# Test connessione database
npm run railway:test
```

Questo script:
1. ✅ Testa la connessione al database Railway
2. ✅ Verifica se l'admin esiste
3. ✅ Controlla lo status dell'utente
4. ✅ Mostra informazioni dettagliate

### **Setup Completo Database:**
```bash
# Setup completo ambiente Railway
npm run railway:setup-env
```

Questo script:
1. ✅ Crea l'utente admin se non esiste
2. ✅ Aggiorna status a "active"
3. ✅ Aggiorna ruolo a "admin"
4. ✅ Reset password a "password123"

## 🔐 **Credenziali di Test**

Dopo il setup:
- **Email**: admin@africaunita.it
- **Password**: password123
- **URL**: https://africaunita.up.railway.app

## 📋 **Variabili Railway Dashboard**

### **Variabili Automatiche:**
- ✅ `DATABASE_URL` - URL del database MySQL
- ✅ `RAILWAY_PUBLIC_DOMAIN` - Dominio pubblico
- ✅ `PORT` - Porta dell'applicazione

### **Variabili da Aggiungere:**
- ❌ `JWT_SECRET` - Chiave segreta JWT
- ❌ `NODE_ENV` - Ambiente di produzione
- ❌ `CORS_ORIGIN` - Dominio CORS (opzionale)

## 🎯 **Test Finale**

1. **Configura variabili** nel Railway dashboard
2. **Esegui setup**: `npm run railway:setup-env`
3. **Test login**: admin@africaunita.it / password123
4. **Verifica**: Dovresti essere loggato come admin

## 🛠️ **Troubleshooting**

### **Se la connessione fallisce:**
1. Verifica che `DATABASE_URL` sia configurato correttamente
2. Controlla i logs Railway per errori
3. Prova a riavviare il servizio

### **Se il login non funziona:**
1. Esegui `npm run railway:setup-env`
2. Verifica che l'admin abbia status "active"
3. Controlla che il ruolo sia "admin"

## 🎉 **Risultato**

Dopo aver configurato tutto, il tuo sito Africa Unita dovrebbe funzionare completamente su Railway! 🚀
