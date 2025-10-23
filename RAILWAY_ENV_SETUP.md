# 🔧 Configurazione .env per Railway Database

## 📋 **Railway Environment Variables**

Su Railway, le variabili d'ambiente sono gestite automaticamente. Non hai bisogno di un file `.env` su Railway, ma puoi crearne uno per lo sviluppo locale.

## 🚀 **Railway Dashboard - Environment Variables**

### **1. Accedi al Dashboard Railway**
1. Vai su [railway.app](https://railway.app)
2. Seleziona il progetto `africaunita`
3. Vai su **"Variables"** o **"Environment"**

### **2. Variabili Automatiche di Railway**
Railway fornisce automaticamente:
- ✅ `DATABASE_URL` - URL completo del database MySQL
- ✅ `RAILWAY_PUBLIC_DOMAIN` - Dominio pubblico dell'app
- ✅ `RAILWAY_STATIC_URL` - URL per file statici
- ✅ `PORT` - Porta dell'applicazione

### **3. Variabili da Configurare Manualmente**
Aggiungi queste variabili nel dashboard Railway:

```env
# JWT Secret (IMPORTANTE!)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Node Environment
NODE_ENV=production

# CORS (opzionale, auto-detect se non impostato)
CORS_ORIGIN=https://africaunita.up.railway.app
```

## 💻 **Sviluppo Locale - File .env**

### **1. Crea file .env nella cartella backend**
```bash
# Nel terminale
cd backend
cp .env.example .env
```

### **2. Configura .env per sviluppo locale**
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration (per sviluppo locale)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=africa_unita_db
DB_USER=root
DB_PASSWORD=your_local_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

## 🔍 **Verifica Configurazione Railway**

### **1. Controlla Variabili nel Dashboard**
Nel Railway dashboard, dovresti vedere:
- `DATABASE_URL` ✅
- `JWT_SECRET` ✅
- `NODE_ENV` ✅
- `RAILWAY_PUBLIC_DOMAIN` ✅

### **2. Test Connessione Database**
Nel Railway console:
```bash
# Test connessione
npm run railway:check
```

### **3. Verifica Logs**
Nel Railway dashboard, vai su **"Logs"** e cerca:
- ✅ `Database connection successful`
- ❌ `Database connection failed`

## 🛠️ **Troubleshooting**

### **Se DATABASE_URL non è presente:**
1. Vai su Railway dashboard
2. Clicca su **"Variables"**
3. Aggiungi `DATABASE_URL` manualmente
4. Il valore dovrebbe essere: `mysql://username:password@host:port/database`

### **Se JWT_SECRET non è configurato:**
1. Nel Railway dashboard
2. Aggiungi variabile `JWT_SECRET`
3. Usa un valore sicuro e casuale

### **Se CORS non funziona:**
1. Aggiungi `CORS_ORIGIN` nel Railway dashboard
2. Imposta il valore: `https://africaunita.up.railway.app`

## 📋 **File di Supporto**

- `backend/.env.example` - Template per sviluppo locale
- `RAILWAY_ENV_SETUP.md` - Questa guida
- `RAILWAY_DATABASE_SETUP.sql` - Script SQL per DBeaver

## 🎯 **Risultato**

Dopo aver configurato le variabili d'ambiente, il database dovrebbe funzionare correttamente su Railway! 🚀
