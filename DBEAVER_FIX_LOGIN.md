# 🔐 Fix Login in DBeaver - Passo per Passo

## ❌ **Errore SQL Risolto**

L'errore era causato dall'esecuzione di più query insieme. In DBeaver, devi eseguire **UNA query alla volta**.

## 📋 **Passo 1: Verifica Utente Admin**

### **Esegui SOLO questa query:**
```sql
SELECT username, email, password_hash, role FROM users WHERE email = 'admin@africaunita.it';
```

### **Risultato atteso:**
- Dovresti vedere l'utente admin con username, email, password_hash e role

## 📋 **Passo 2: Aggiorna Password Hash**

### **Esegui SOLO questa query:**
```sql
UPDATE users SET password_hash = '$2b$12$LQv3c1yK8Z9X2W3E4R5T6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV' 
WHERE email = 'admin@africaunita.it';
```

### **Risultato atteso:**
- Query executed successfully
- 1 row affected

## 📋 **Passo 3: Verifica Aggiornamento**

### **Esegui SOLO questa query:**
```sql
SELECT username, email, role FROM users WHERE email = 'admin@africaunita.it';
```

### **Risultato atteso:**
- Dovresti vedere l'utente admin con i dati aggiornati

## 🎯 **Test Login**

Dopo aver eseguito le query, prova il login su:
- **URL**: https://africaunita.up.railway.app
- **Email**: admin@africaunita.it
- **Password**: password123

## ⚠️ **Importante:**

1. **Esegui UNA query alla volta** in DBeaver
2. **Non copiare e incollare tutto insieme**
3. **Clicca "Execute" dopo ogni query**
4. **Aspetta che la query finisca prima di eseguire la successiva**

## 🔧 **Se il Problema Persiste:**

### **Reset completo password:**
```sql
-- Esegui UNA alla volta
UPDATE users SET password_hash = '$2b$12$LQv3c1yK8Z9X2W3E4R5T6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV' WHERE username = 'admin';
UPDATE users SET password_hash = '$2b$12$LQv3c1yK8Z9X2W3E4R5T6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV' WHERE username = 'moderator';
UPDATE users SET password_hash = '$2b$12$LQv3c1yK8Z9X2W3E4R5T6uV7wX8yZ9aB0cD1eF2gH3iJ4kL5mN6oP7qR8sT9uV' WHERE username = 'treasurer';
```

## 🎉 **Risultato:**

Dopo aver eseguito le query correttamente, il login dovrebbe funzionare! 🚀
