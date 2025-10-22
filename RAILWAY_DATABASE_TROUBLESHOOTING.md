# 🔧 Railway Database Troubleshooting

## 📋 **Analisi Logs Railway**

### ✅ **Messaggi Normali (Non Errori):**
- `MySQL Server - start` - Server avviato
- `InnoDB initialization` - Database inizializzato
- `ready for connections` - Database pronto per connessioni
- `X Plugin ready` - Plugin MySQL attivo

### ⚠️ **Warning (Non Critici):**
- `CA certificate ca.pem is self signed` - Certificato self-signed (normale per Railway)
- `Insecure configuration for --pid-file` - Configurazione PID (non critico)

## 🔍 **Verifica Database Status**

### 1. **Controlla se il Database è Attivo**
Nel Railway console, esegui:
```bash
# Test connessione database
npm run test-connection
```

### 2. **Verifica Tabelle**
Se la connessione funziona, controlla le tabelle:
```bash
# Setup database se non esiste
npm run db:setup

# Seed database con dati di test
npm run db:seed
```

### 3. **Controlla Logs Applicazione**
Nel Railway dashboard, vai su **"Logs"** e cerca:
- ✅ `Database connection successful`
- ❌ `Database connection failed`

## 🛠️ **Soluzioni**

### **Se il Database non è Inizializzato:**
```bash
# Nel Railway console
npm run railway:setup
```

### **Se le Tabelle non Esistono:**
```bash
# Setup completo
npm run db:setup
npm run db:seed
```

### **Se il Login non Funziona:**
```bash
# Reset password utenti
npm run db:reset-passwords
```

## 🔐 **Verifica Credenziali**

Dopo il setup, controlla che gli utenti esistano:
```sql
SELECT username, email, role FROM users;
```

Dovresti vedere:
- admin@africaunita.it
- president@africaunita.it
- moderator@africaunita.it
- treasurer@africaunita.it

## 🎯 **Test Finale**

1. **Health Check**: `https://africaunita.up.railway.app/health`
2. **Login Test**: admin@africaunita.it / password123
3. **Database Status**: Verifica nei logs Railway

## 📞 **Se il Problema Persiste**

1. **Redeploy**: Nel Railway dashboard, vai su Settings → Redeploy
2. **Logs**: Controlla i logs per errori specifici
3. **Database**: Verifica che DATABASE_URL sia configurato correttamente
