# 🔧 Fix Admin Status - Login 401 Unauthorized

## ❌ **Problema Identificato**

Il login fallisce con 401 Unauthorized perché l'utente admin potrebbe avere:
1. **Status "pending"** - in attesa di approvazione
2. **Status "blocked"** - account bloccato
3. **Status "deleted"** - account eliminato
4. **Role non corretto** - non è admin

## ✅ **Soluzione: Verifica e Fix Status**

### **Opzione 1: Railway Console (Raccomandato)**
```bash
# Nel Railway console
npm run railway:status-debug
```

Questo script:
1. ✅ Verifica lo status dell'utente admin
2. ✅ Controlla il ruolo
3. ✅ Testa la password
4. ✅ Aggiorna status a "active" se necessario
5. ✅ Aggiorna ruolo a "admin" se necessario

### **Opzione 2: DBeaver - Fix Manuale**

**Esegui UNA query alla volta:**

```sql
-- 1. Verifica status utente admin
SELECT username, email, role, status FROM users WHERE email = 'admin@africaunita.it';
```

```sql
-- 2. Aggiorna status a active
UPDATE users SET status = 'active' WHERE email = 'admin@africaunita.it';
```

```sql
-- 3. Aggiorna ruolo a admin
UPDATE users SET role = 'admin' WHERE email = 'admin@africaunita.it';
```

```sql
-- 4. Verifica aggiornamento
SELECT username, email, role, status FROM users WHERE email = 'admin@africaunita.it';
```

## 🔍 **Analisi Codice**

### **Backend (auth.js):**
```javascript
// Verifica se l'utente è attivo
if (user.status === 'blocked' || user.status === 'deleted') {
    return res.status(401).json({
        success: false,
        message: 'Account non attivo'
    });
}

// Verifica se l'utente è in attesa di approvazione
if (user.status === 'pending') {
    return res.status(401).json({
        success: false,
        message: 'Il tuo account è in attesa di approvazione da parte di un amministratore. Riceverai una notifica una volta approvato.'
    });
}
```

### **Frontend (Login.js):**
```javascript
// Gestisce la risposta 401
if (response.ok) {
    // Login successo
} else {
    // Mostra errore
    this.showError('general', data.message || 'Credenziali non valide');
}
```

## 🎯 **Test Login**

Dopo il fix, prova il login:
- **URL**: https://africaunita.up.railway.app
- **Email**: admin@africaunita.it
- **Password**: password123

## 📋 **Possibili Messaggi di Errore:**

- **"Credenziali non valide"** - Email o password sbagliati
- **"Account non attivo"** - Status blocked/deleted
- **"Il tuo account è in attesa di approvazione"** - Status pending

## 🎉 **Risultato**

Dopo aver aggiornato lo status a "active" e il ruolo a "admin", il login dovrebbe funzionare correttamente! 🚀
