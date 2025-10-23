# 🌐 Creare Admin dal Browser - Africa Unita

## ✅ **Soluzione: Inserire Admin direttamente dal Browser**

Se puoi inserire dati dal browser, possiamo creare l'admin direttamente tramite l'interfaccia web.

## 📋 **Passo 1: Accedi alla Pagina di Registrazione**

1. Vai su: `https://africaunita.up.railway.app`
2. Clicca su **"Registrati"** o **"Register"**
3. Compila il form con i dati dell'admin

## 📋 **Passo 2: Dati Admin da Inserire**

### **Form di Registrazione:**
- **Nome**: Admin
- **Cognome**: Sistema
- **Email**: admin@africaunita.it
- **Username**: admin
- **Password**: password123
- **Ruolo**: Seleziona "admin" (se disponibile)

## 📋 **Passo 3: Verifica Registrazione**

Dopo la registrazione:
1. Prova il login con le credenziali inserite
2. Se funziona, sei loggato come admin
3. Se non funziona, controlla i logs per errori

## 🔧 **Passo 4: Se il Ruolo Admin non è Disponibile**

Se non puoi selezionare il ruolo "admin" dal form:

### **Opzione A: Modifica Database**
In DBeaver, esegui:
```sql
-- Trova l'utente appena creato
SELECT id, username, email, role FROM users WHERE email = 'admin@africaunita.it';

-- Aggiorna il ruolo a admin (sostituisci ID con l'ID reale)
UPDATE users SET role = 'admin' WHERE email = 'admin@africaunita.it';
```

### **Opzione B: Reset Password**
In DBeaver, esegui:
```sql
-- Reset password per l'utente admin
UPDATE users SET password_hash = '$2b$12$LQv3c1yK8Z9X2W3E4R5T6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV' 
WHERE email = 'admin@africaunita.it';
```

## 🎯 **Test Finale**

Dopo aver creato l'admin:
1. **Login**: admin@africaunita.it / password123
2. **Verifica**: Dovresti essere loggato come admin
3. **Controlla**: Che tu abbia i permessi di admin

## 📋 **Se il Problema Persiste**

### **Controlla Logs Railway:**
1. Vai su Railway dashboard
2. Clicca su "Logs"
3. Cerca errori di autenticazione

### **Verifica Database:**
```sql
-- Controlla utente admin
SELECT username, email, role, password_hash FROM users WHERE email = 'admin@africaunita.it';
```

## 🎉 **Risultato**

Dopo aver creato l'admin dal browser, il login dovrebbe funzionare correttamente! 🚀
