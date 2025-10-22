# 🚀 Railway Deployment Guide - Africa Unita

## ✅ Problemi Risolti

Ho corretto tutti i riferimenti al database locale per il deployment su Railway:

### 🔧 **Modifiche Apportate:**

1. **Configurazione Database Railway-Ready**
   - `backend/config.js` - Priorità a `DATABASE_URL` di Railway
   - `backend/database/db.js` - Connessione ottimizzata per Railway
   - Timeout aumentati per connessioni cloud

2. **Script Database Aggiornati**
   - `backend/scripts/createDatabase.js` - Supporto Railway
   - `backend/scripts/createTables.js` - Supporto Railway  
   - `backend/scripts/resetPasswords.js` - Supporto Railway
   - `backend/scripts/seedDatabaseMySQL.js` - Già Railway-compatible

3. **Server Configuration**
   - `backend/server.js` - URL dinamici per Railway
   - CORS automatico per dominio Railway
   - Binding su `0.0.0.0` per Railway

4. **Script NPM Aggiornati**
   - `backend/package.json` - Script per setup database
   - `package.json` root - Configurazione Railway

## 🚀 **Deployment Steps:**

### 1. **Commit e Push**
```bash
git add .
git commit -m "Fix Railway deployment - remove localhost references"
git push origin main
```

### 2. **Railway Configuration**
Railway dovrebbe ora rilevare automaticamente:
- ✅ `start.sh` script
- ✅ `railway.json` configuration  
- ✅ `Procfile` process
- ✅ `package.json` root

### 3. **Environment Variables su Railway**
Configura queste variabili nel dashboard Railway:

```env
# JWT Secret (IMPORTANTE!)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# CORS (opzionale, auto-detect se non impostato)
CORS_ORIGIN=https://your-app-name.railway.app

# Node Environment
NODE_ENV=production
```

### 4. **Database Setup**
Railway fornirà automaticamente `DATABASE_URL`. Per inizializzare il database:

```bash
# Dopo il primo deploy, esegui questi comandi nel Railway console:
npm run db:setup    # Crea database e tabelle
npm run db:seed     # Popola con dati di test
```

## 🔍 **Verifica Deployment**

1. **Health Check**: `https://your-app.railway.app/health`
2. **Database Connection**: Controlla i log Railway
3. **Frontend**: `https://your-app.railway.app/`

## 📋 **Credenziali di Test (dopo db:seed)**

- **Admin**: admin@africaunita.it / password123
- **Moderatore**: moderator@africaunita.it / password123  
- **Tesoriere**: treasurer@africaunita.it / password123
- **Utente**: user@africaunita.it / password123

## 🛠️ **Troubleshooting**

### Database Connection Issues
```bash
# Test connessione database
npm run test-connection
```

### Reset Passwords
```bash
# Reset password utenti di test
npm run db:reset-passwords
```

### Logs Railway
Controlla i log nel dashboard Railway per errori di connessione.

## ✅ **Railway-Ready Features**

- ✅ Database URL automatico
- ✅ CORS dinamico per dominio Railway
- ✅ URL logging per Railway
- ✅ SSL/HTTPS automatico
- ✅ Process binding su 0.0.0.0
- ✅ Timeout ottimizzati per cloud
- ✅ Script di setup database

Il tuo progetto è ora completamente Railway-ready! 🎉
