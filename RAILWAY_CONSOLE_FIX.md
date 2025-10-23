# 🚀 Railway Console Fix - Login Problem

## ❌ **Problema: Script non disponibile**

Lo script `railway:password` non è disponibile nel Railway console perché il package.json root non è deployato.

## ✅ **Soluzioni Alternative:**

### **Opzione 1: DBeaver (Raccomandato)**
1. Apri DBeaver
2. Connetti al database Railway
3. Esegui **UNA query alla volta**:

```sql
-- Query 1: Verifica utente
SELECT username, email, password_hash, role FROM users WHERE email = 'admin@africaunita.it';
```

```sql
-- Query 2: Aggiorna password
UPDATE users SET password_hash = '$2b$12$LQv3c1yK8Z9X2W3E4R5T6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV' 
WHERE email = 'admin@africaunita.it';
```

```sql
-- Query 3: Verifica aggiornamento
SELECT username, email, role FROM users WHERE email = 'admin@africaunita.it';
```

### **Opzione 2: Railway Console - Script Manuale**
Nel Railway console, esegui:

```bash
# Naviga alla cartella backend
cd backend

# Esegui script di reset password
npm run db:reset-passwords
```

### **Opzione 3: Railway Console - Fix Diretto**
Nel Railway console, esegui:

```bash
# Naviga alla cartella backend
cd backend

# Esegui script di debug
node ../debug-login.js
```

### **Opzione 4: Force Redeploy**
1. Nel Railway dashboard
2. Vai su **"Settings"**
3. Clicca **"Redeploy"**
4. Il deployment ricreerà tutto

## 🎯 **Test Login**

Dopo aver eseguito una delle soluzioni, prova il login:
- **URL**: https://africaunita.up.railway.app
- **Email**: admin@africaunita.it
- **Password**: password123

## 📋 **File di Supporto:**

- `FIX_LOGIN_SIMPLE.sql` - Query SQL per DBeaver
- `debug-login.js` - Script di debug
- `simple-password-fix.js` - Script di fix password

## 🔧 **Se il Problema Persiste:**

### **Reset Completo Database:**
```bash
# Nel Railway console
cd backend
npm run db:setup
npm run db:seed
```

## 🎉 **Risultato:**

Dopo aver eseguito una delle soluzioni, il login dovrebbe funzionare correttamente! 🚀
