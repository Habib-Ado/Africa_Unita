# 🔐 Login Troubleshooting - Africa Unita

## ❌ **Problema: 401 Unauthorized**

Il login continua a fallire nonostante i dati siano nel database. Ecco come risolvere:

## 🔍 **Step 1: Verifica Database Status**

### **Opzione A: DBeaver**
1. Connetti al database Railway
2. Esegui `VERIFY_DATABASE_STATUS.sql`
3. Controlla gli username e password hash

### **Opzione B: Railway Console**
```bash
# Debug completo del login
npm run railway:debug
```

## 🔧 **Step 2: Fix Password Hash**

### **Problema Identificato:**
Il password hash nel database potrebbe non essere compatibile con bcryptjs.

### **Soluzione:**
```bash
# Nel Railway console
npm run railway:debug
```

Questo script:
1. ✅ Verifica l'utente admin
2. ✅ Testa la password attuale
3. ✅ Genera un nuovo hash compatibile
4. ✅ Aggiorna il database
5. ✅ Verifica che funzioni

## 🔐 **Step 3: Test Login**

Dopo il fix, prova il login con:
- **Email**: admin@africaunita.it
- **Password**: password123

## 🛠️ **Step 4: Se il Problema Persiste**

### **Reset Completo Database:**
```bash
# Nel Railway console
npm run railway:setup
```

### **Verifica Logs Railway:**
1. Vai su Railway dashboard
2. Clicca su "Logs"
3. Cerca errori di autenticazione

## 📋 **File di Supporto:**

- `debug-login.js` - Script di debug completo
- `VERIFY_DATABASE_STATUS.sql` - Verifica stato database
- `fix-username-mismatch.js` - Fix username mismatch

## 🎯 **Risultato Atteso:**

Dopo il fix, il login dovrebbe funzionare correttamente su `https://africaunita.up.railway.app`!

## 🔍 **Debug Avanzato:**

Se il problema persiste, controlla:
1. **JWT_SECRET** è configurato su Railway
2. **CORS_ORIGIN** è configurato correttamente
3. **Database connection** funziona
4. **Password hash** è compatibile con bcryptjs
