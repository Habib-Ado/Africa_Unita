# 🗄️ Railway Database Setup - Africa Unita

## ❌ **Problema Identificato:**
Il sito è deployato su Railway ma il database non è stato inizializzato con i dati di test.

## ✅ **Soluzione:**

### 1. **Accedi al Railway Console**
1. Vai su [railway.app](https://railway.app)
2. Seleziona il progetto `africaunita`
3. Clicca su **"Console"** o **"Deployments"**
4. Trova il deployment attivo e clicca su **"View Logs"** o **"Console"**

### 2. **Esegui Database Setup**
Nel Railway console, esegui questi comandi:

```bash
# 1. Crea database e tabelle
npm run db:setup

# 2. Popola con dati di test
npm run db:seed
```

### 3. **Verifica Setup**
Dopo l'esecuzione, dovresti vedere:
- ✅ Database creato
- ✅ 17 tabelle create
- ✅ Utenti di test inseriti
- ✅ Credenziali di test mostrate

### 4. **Test Login**
Ora prova il login con:
- **Email**: admin@africaunita.it
- **Password**: password123

## 🔐 **Credenziali di Test (dopo db:seed):**

- **Admin**: admin@africaunita.it / password123
- **President**: president@africaunita.it / password123
- **Moderatore**: moderator@africaunita.it / password123
- **Tesoriere**: treasurer@africaunita.it / password123
- **Utenti**: user@africaunita.it, mario@test.com, ibrahim@test.com / password123

## 🛠️ **Se il Console non è disponibile:**

### Alternativa 1: Railway CLI
```bash
# Installa Railway CLI
npm install -g @railway/cli

# Login
railway login

# Connetti al progetto
railway link

# Esegui comandi
railway run npm run db:setup
railway run npm run db:seed
```

### Alternativa 2: Force Redeploy
1. Nel dashboard Railway
2. Vai su **"Settings"**
3. Clicca **"Redeploy"**
4. Il deployment ricreerà tutto

## 🎯 **Risultato Atteso:**
Dopo il setup del database, il login dovrebbe funzionare correttamente su `https://africaunita.up.railway.app`!
