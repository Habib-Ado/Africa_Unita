# Africa Unita - Sito Web

Sito web per l'associazione Africa Unita, dedicata al supporto per migranti africani.

## 🚀 Deployment su Railway

### Quick Start (5 minuti)
📖 **[Guida Rapida - QUICK_START_RAILWAY.md](./QUICK_START_RAILWAY.md)**

### Guida Completa
📚 **[Guida Completa Deployment - RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md)**

---

## 💻 Sviluppo Locale

### Prerequisiti
- Node.js (versione 18+)
- MySQL 8.0+
- npm

### Installazione

```bash
# 1. Clona il repository
git clone <repository-url>
cd Africa_Unita

# 2. Installa dipendenze backend
cd backend
npm install

# 3. Genera chiavi segrete
npm run generate-secrets

# 4. Configura variabili d'ambiente
cp env.example .env
# Modifica .env con le tue configurazioni

# 5. Testa connessione database
npm run test-connection

# 6. Inizializza database
npm run db:setup
npm run db:seed

# 7. Avvia server in modalità sviluppo
npm run dev
```

### Accesso Locale
- **URL:** http://localhost:3000
- **Health Check:** http://localhost:3000/health

### Credenziali di Test (dopo seed)
- **Admin:** admin@africaunita.it / password123
- **Moderatore:** moderator@africaunita.it / password123
- **Tesoriere:** treasurer@africaunita.it / password123

## 📋 Funzionalità

- **Autenticazione utenti** con ruoli (admin, moderator, treasurer, user)
- **Gestione contenuti** per moderatori
- **Sistema quote associative** per tesorieri
- **Messaggi privati** tra utenti
- **Profilo utente** personalizzato

## 🛠️ Struttura Progetto

```
├── backend/           # Server Node.js + Express
│   ├── database/      # Schema database MySQL
│   ├── routes/        # API endpoints
│   └── scripts/       # Script di setup
├── frontend/          # Frontend SPA
│   ├── static/        # CSS, JS, immagini
│   └── index.html     # Pagina principale
└── README.md          # Questo file
```

## 🔧 Comandi Disponibili

```bash
# Sviluppo
npm start              # Avvia server in produzione
npm run dev            # Avvia server con auto-reload

# Database
npm run db:setup       # Crea tabelle e schema
npm run db:seed        # Popola con dati di test
npm run test-connection # Testa connessione database

# Utilità
npm run generate-fees     # Genera quote mensili
npm run generate-secrets  # Genera JWT_SECRET e altre chiavi

# Deployment
# Vedi QUICK_START_RAILWAY.md per Railway deployment
```

## 📝 Note Importanti

### Sviluppo
- Il database MySQL deve essere in esecuzione
- Le configurazioni sono in `backend/config.js`
- Il frontend è una SPA (Single Page Application)
- File `.env` per variabili d'ambiente (vedi `env.example`)

### Produzione (Railway)
- Usa sempre `JWT_SECRET` forte e casuale
- Configura `CORS_ORIGIN` con l'URL corretto
- Railway fornisce automaticamente `DATABASE_URL`
- File upload: considera storage esterno (S3, Cloudinary)
- SSL/TLS: fornito automaticamente da Railway

## 🔒 Sicurezza

- ✅ Password hashate con bcrypt
- ✅ JWT per autenticazione
- ✅ Helmet.js per security headers
- ✅ CORS configurabile
- ✅ Validazione input con express-validator
- ✅ Protezione SQL injection con parametrized queries

## 📚 Documentazione

- [Quick Start Railway](./QUICK_START_RAILWAY.md) - Deploy in 5 minuti
- [Guida Completa Railway](./RAILWAY_DEPLOYMENT_GUIDE.md) - Documentazione dettagliata
- [Schema Database MySQL](./backend/database/schema.sql) - Struttura completa database
- [API Routes](./backend/routes/) - Documentazione API endpoints

## 🐛 Troubleshooting

### Database non si connette
```bash
npm run test-connection  # Testa la connessione e mostra diagnostica
```

### Reset completo database
```bash
npm run db:setup  # Ricrea tutte le tabelle
npm run db:seed   # Ripopola con dati di test
```

### Problemi con Railway
Consulta la sezione Troubleshooting in [RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md)

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
- Consulta la documentazione in `/docs`
- Controlla [Railway Docs](https://docs.railway.app) per problemi di deployment