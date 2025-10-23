# 🌍 Africa Unita - Sito Web

Sito web per l'associazione Africa Unita, dedicata al supporto per migranti africani in Italia.

## 🚀 Deployment su Railway

### Quick Start (5 minuti)

1. **Fork del repository** su GitHub
2. **Connetti a Railway**:
   - Vai su [railway.app](https://railway.app)
   - Clicca "New Project" → "Deploy from GitHub repo"
   - Seleziona il repository `Africa_Unita`

3. **Configura Environment Variables** nel Railway dashboard:
   ```env
   DATABASE_URL=mysql://root:SLBQYMBhSReyvReKHdgozPCzQrEAKqyx@hopper.proxy.rlwy.net:38226/railway
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   NODE_ENV=production
   ```

4. **Setup Database** (dopo il primo deploy):
   - Nel Railway console: `cd backend && npm run db:setup && npm run db:seed`

5. **Test Login**:
   - **URL**: `https://your-app-name.railway.app`
   - **Email**: admin@africaunita.it
   - **Password**: password123

## 💻 Sviluppo Locale

### Prerequisiti
- Node.js (versione 18+)
- MySQL 8.0+ (per sviluppo locale)
- npm

### Installazione

```bash
# 1. Clona il repository
git clone <repository-url>
cd Africa_Unita

# 2. Installa dipendenze backend
cd backend
npm install

# 3. Configura variabili d'ambiente
# Crea file .env nella cartella backend con:
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=africa_unita_db
DB_USER=root
DB_PASSWORD=your_password_here
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
CORS_ORIGIN=http://localhost:3000

# 4. Setup database locale
npm run db:setup
npm run db:seed

# 5. Avvia server
npm run dev
```

### Accesso Locale
- **URL**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

### Credenziali di Test
- **Admin**: admin@africaunita.it / password123
- **Moderatore**: moderator@africaunita.it / password123
- **Tesoriere**: treasurer@africaunita.it / password123

## 📋 Funzionalità

- **Autenticazione utenti** con ruoli (admin, moderator, treasurer, user)
- **Gestione contenuti** per moderatori
- **Sistema quote associative** per tesorieri
- **Messaggi privati** tra utenti
- **Profilo utente** personalizzato
- **Gestione prestiti** e rate
- **Incontri associativi** e partecipazione

## 🛠️ Struttura Progetto

```
├── backend/           # Server Node.js + Express
│   ├── database/      # Schema database MySQL
│   ├── routes/        # API endpoints
│   ├── middleware/    # Autenticazione e validazione
│   └── scripts/       # Script di setup
├── frontend/          # Frontend SPA
│   ├── static/        # CSS, JS, immagini
│   └── index.html     # Pagina principale
├── start.sh           # Script di avvio Railway
├── railway.json       # Configurazione Railway
├── Procfile           # Processo web Railway
└── package.json       # Configurazione root
```

## 🔧 Comandi Disponibili

```bash
# Sviluppo
npm start              # Avvia server in produzione
npm run dev            # Avvia server con auto-reload

# Database (solo sviluppo locale)
npm run db:setup       # Crea tabelle e schema
npm run db:seed        # Popola con dati di test
npm run test-connection # Testa connessione database
```

## 🔒 Sicurezza

- ✅ Password hashate con bcryptjs
- ✅ JWT per autenticazione
- ✅ Helmet.js per security headers
- ✅ CORS configurabile
- ✅ Validazione input con express-validator
- ✅ Protezione SQL injection con parametrized queries

## 🚀 Railway Deployment

### Configurazione Automatica
Railway rileva automaticamente:
- ✅ `start.sh` - Script di avvio
- ✅ `railway.json` - Configurazione deployment
- ✅ `Procfile` - Processo web
- ✅ `package.json` - Dipendenze Node.js

### Environment Variables Railway
```env
# Obbligatorie
DATABASE_URL=mysql://user:pass@host:port/database
JWT_SECRET=your_super_secret_jwt_key
NODE_ENV=production

# Opzionali
CORS_ORIGIN=https://your-app.railway.app
```

### Database Setup su Railway
Dopo il deploy, nel Railway console:
```bash
cd backend
npm run db:setup    # Crea database e tabelle
npm run db:seed     # Popola con dati di test
```

## 🐛 Troubleshooting

### Database non si connette
```bash
# Testa connessione
npm run test-connection
```

### Reset completo database
```bash
npm run db:setup  # Ricrea tutte le tabelle
npm run db:seed   # Ripopola con dati di test
```

### Problemi con Railway
1. Verifica che `DATABASE_URL` sia configurato nel dashboard
2. Controlla i logs Railway per errori
3. Riavvia il servizio se necessario

## 📚 API Endpoints

### Autenticazione
- `POST /api/auth/login` - Login utente
- `POST /api/auth/register` - Registrazione utente
- `GET /api/auth/me` - Informazioni utente corrente

### Utenti
- `GET /api/users` - Lista utenti
- `GET /api/users/:id` - Dettagli utente
- `PUT /api/users/:id` - Aggiorna utente

### Contenuti
- `GET /api/posts` - Lista post
- `POST /api/posts` - Crea post
- `GET /api/posts/:id` - Dettagli post

### Messaggi
- `GET /api/messages` - Lista messaggi
- `POST /api/messages` - Invia messaggio

## 🤝 Contribuire

1. Fork del progetto
2. Crea un branch per la tua feature (`git checkout -b feature/AmazingFeature`)
3. Commit delle modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📄 Licenza

Questo progetto è sviluppato per l'associazione Africa Unita.

## 📞 Supporto

Per problemi o domande:
- Apri un issue su GitHub
- Consulta la documentazione Railway: [docs.railway.app](https://docs.railway.app)
- Controlla i logs Railway per errori specifici

---

**Africa Unita** - Uniti per un futuro migliore 🌍