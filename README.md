# Africa Unita - Piattaforma Web

> **UBUNTU** - "Io sono perché noi siamo"

Piattaforma web per l'associazione non-profit **Africa Unita**, dedicata al supporto dei migranti africani in Italia, offrendo servizi di ricerca alloggio, opportunità di lavoro, formazione e supporto comunitario.

## 📋 Descrizione Progetto

Africa Unita è un sistema completo che permette a:
- **Utenti**: Cercare alloggi, opportunità di lavoro, corsi di formazione
- **Membri**: Pubblicare annunci, comunicare tra loro, gestire il proprio profilo
- **Amministratori**: Gestire utenti, moderare contenuti, promuovere iniziative

## 🏗️ Architettura

### Stack Tecnologico

**Frontend:**
- HTML5, CSS3, JavaScript (Vanilla)
- Bootstrap 5 per UI responsiva
- Single Page Application (SPA) con routing client-side
- Font Awesome per icone

**Backend:**
- Node.js + Express.js
- PostgreSQL per database
- JWT per autenticazione
- bcrypt per sicurezza password

### Struttura Progetto

```
Africa_Unita/
├── frontend/               # Applicazione frontend
│   ├── index.html         # Entry point
│   └── static/
│       ├── css/           # Styles
│       ├── js/            # JavaScript modules
│       │   ├── index.js   # Router principale
│       │   └── views/     # Componenti view
│       └── img/           # Immagini
│
├── backend/               # API Backend
│   ├── server.js         # Entry point server
│   ├── database/         # Database config e schema
│   ├── routes/           # API routes
│   ├── middleware/       # Middleware (auth, validation)
│   └── scripts/          # Utility scripts
│
└── README.md
```

## 🚀 Quick Start

### Prerequisiti

- Node.js >= 16.x
- PostgreSQL >= 13.x
- npm o yarn

### 1. Setup Backend

```bash
# Naviga nella cartella backend
cd backend

# Installa dipendenze
npm install

# Configura environment variables
cp .env.example .env
# Modifica .env con le tue configurazioni

# Setup database
npm run db:setup

# (Opzionale) Popola con dati di test
npm run db:seed

# Avvia server
npm run dev
```

Il backend sarà disponibile su `http://localhost:3000`

### 2. Setup Frontend

Per sviluppo locale, puoi usare un server HTTP semplice:

```bash
# Dalla root del progetto
npx http-server frontend -p 8080 -c-1
```

Oppure usa Live Server in VS Code.

Il frontend sarà disponibile su `http://localhost:8080`

### 3. Test con Account Predefiniti

Dopo aver eseguito `npm run db:seed`, puoi usare:

- **Admin**: admin@africaunita.org / Password123!
- **Utente 1**: mario@test.com / Password123!
- **Utente 2**: fatou@test.com / Password123!

## 📱 Funzionalità

### Per Tutti gli Utenti
- ✅ Visualizzazione annunci (alloggi, lavoro, formazione, servizi, eventi)
- ✅ Ricerca e filtraggio annunci
- ✅ Visualizzazione profili pubblici
- ✅ Registrazione e login

### Per Utenti Registrati
- ✅ Pubblicazione annunci
- ✅ Sistema messaggistica privata
- ✅ Gestione profilo personale
- ✅ Salvataggio annunci preferiti
- ✅ Notifiche

### Per Amministratori
- ✅ Gestione utenti (attivazione, sospensione, ruoli)
- ✅ Moderazione contenuti
- ✅ Promozione annunci in evidenza
- ✅ Dashboard statistiche
- ✅ Log delle attività

## 🔌 API Endpoints

### Autenticazione
- `POST /api/auth/register` - Registrazione
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Info utente corrente
- `POST /api/auth/forgot-password` - Reset password
- `POST /api/auth/reset-password` - Conferma reset

### Utenti
- `GET /api/users/profile/:id` - Profilo pubblico
- `PUT /api/users/profile` - Aggiorna profilo
- `GET /api/users` - Lista utenti (admin)
- `PUT /api/users/:id/status` - Cambia stato (admin)
- `PUT /api/users/:id/role` - Cambia ruolo (admin)

### Posts/Annunci
- `GET /api/posts` - Lista annunci
- `GET /api/posts/:id` - Dettaglio annuncio
- `POST /api/posts` - Crea annuncio
- `PUT /api/posts/:id` - Aggiorna annuncio
- `DELETE /api/posts/:id` - Elimina annuncio
- `POST /api/posts/:id/favorite` - Aggiungi/rimuovi preferito

### Messaggi
- `GET /api/messages` - Lista messaggi
- `GET /api/messages/:id` - Dettaglio messaggio
- `POST /api/messages` - Invia messaggio
- `GET /api/messages/conversations/list` - Lista conversazioni
- `GET /api/messages/unread-count` - Conta non letti

Documentazione API completa: [backend/README.md](backend/README.md)

## 🗄️ Database

### Tabelle Principali

- **users**: Utenti della piattaforma
- **posts**: Annunci/posts categorizzati
- **messages**: Messaggistica privata
- **favorites**: Posts salvati
- **comments**: Commenti sui posts
- **notifications**: Sistema notifiche
- **activity_logs**: Log attività (audit)

Schema completo in: [backend/database/schema.sql](backend/database/schema.sql)

## 🔐 Sicurezza

- Password hashate con bcrypt
- Autenticazione JWT stateless
- Validazione input server-side
- Protezione SQL injection
- Headers di sicurezza (Helmet)
- CORS configurabile

## 📈 Prossimi Sviluppi

- [ ] Upload immagini per annunci e avatar
- [ ] Sistema notifiche real-time (WebSocket)
- [ ] Invio email (reset password, notifiche)
- [ ] Sistema di rating/recensioni
- [ ] Mappa interattiva per alloggi
- [ ] App mobile (React Native)
- [ ] Integrazione calendario eventi
- [ ] Sistema di chat real-time

## 🛠️ Sviluppo

### Comandi Utili

```bash
# Backend
npm run dev          # Sviluppo con auto-reload
npm start            # Produzione
npm run db:setup     # Setup database
npm run db:seed      # Seed dati test

# Frontend
# Usa qualsiasi server HTTP statico
```

### Environment Variables

Vedi `.env.example` per tutte le variabili configurabili.

## 📞 Contatti

**Africa Unita**
- Email: adobinesse@gmail.com
- Location: Varese, Italia

## 📄 Licenza

Progetto interno per Africa Unita - Associazione Non-Profit

---

**Sviluppato con ❤️ per la comunità africana in Italia**
