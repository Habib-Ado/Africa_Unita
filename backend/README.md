# Africa Unita - Backend API

Backend Node.js + Express + PostgreSQL per il progetto Africa Unita, un'associazione non-profit che aiuta i migranti africani con servizi di alloggio, formazione e lavoro.

## 📋 Indice

- [Requisiti](#requisiti)
- [Installazione](#installazione)
- [Configurazione](#configurazione)
- [Setup Database](#setup-database)
- [Avvio Server](#avvio-server)
- [Architettura](#architettura)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)

## 🔧 Requisiti

- **Node.js** >= 16.x
- **PostgreSQL** >= 13.x
- **npm** o **yarn**

## 📦 Installazione

1. Clone il repository e naviga nella cartella backend:
```bash
cd backend
```

2. Installa le dipendenze:
```bash
npm install
```

## ⚙️ Configurazione

1. Crea un file `.env` nella root del backend:
```bash
cp .env.example .env
```

2. Modifica il file `.env` con le tue configurazioni:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=africa_unita_db
DB_USER=postgres
DB_PASSWORD=your_password_here

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:8080
```

> ⚠️ **IMPORTANTE**: Cambia `JWT_SECRET` con una chiave segreta sicura in produzione!

## 🗄️ Setup Database

### 1. Crea il database e le tabelle

```bash
npm run db:setup
```

Questo script:
- Crea il database PostgreSQL
- Esegue tutte le migrations
- Crea tabelle, indici, views e funzioni

### 2. (Opzionale) Popola con dati di test

```bash
npm run db:seed
```

Questo crea:
- 3 utenti di test (admin, mario_rossi, fatou_diop)
- 5 posts di esempio
- 2 messaggi di test

**Account di test creati:**
- **Admin**: admin@africaunita.org / Password123!
- **User 1**: mario@test.com / Password123!
- **User 2**: fatou@test.com / Password123!

## 🚀 Avvio Server

### Modalità Development (con auto-reload)
```bash
npm run dev
```

### Modalità Production
```bash
npm start
```

Il server sarà disponibile su: `http://localhost:3000`

Health check: `http://localhost:3000/health`

## 🏗️ Architettura

```
backend/
├── database/
│   ├── db.js              # Pool connessioni PostgreSQL
│   └── schema.sql         # Schema database completo
├── middleware/
│   ├── auth.js            # Autenticazione JWT
│   └── validation.js      # Validazione input
├── routes/
│   ├── auth.js            # Routes autenticazione
│   ├── users.js           # Routes utenti
│   ├── messages.js        # Routes messaggi
│   └── posts.js           # Routes posts/annunci
├── scripts/
│   ├── setupDatabase.js   # Setup automatico database
│   └── seedDatabase.js    # Seed dati di test
├── server.js              # Entry point applicazione
├── package.json
└── .env.example

```

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Autenticazione

Tutte le routes protette richiedono un token JWT nell'header:
```
Authorization: Bearer <token>
```

---

### 🔐 Auth Routes

#### POST /api/auth/register
Registra un nuovo utente.

**Body:**
```json
{
  "username": "mario_rossi",
  "email": "mario@example.com",
  "password": "Password123!",
  "first_name": "Mario",
  "last_name": "Rossi",
  "phone": "+39 123 456 7890",
  "country_of_origin": "Senegal"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registrazione completata con successo",
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": 1,
      "uuid": "...",
      "username": "mario_rossi",
      "email": "mario@example.com",
      "role": "user",
      "status": "active"
    }
  }
}
```

#### POST /api/auth/login
Login utente.

**Body:**
```json
{
  "email": "mario@example.com",
  "password": "Password123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login effettuato con successo",
  "data": {
    "token": "eyJhbGc...",
    "user": { ... }
  }
}
```

#### GET /api/auth/me
Ottieni info utente corrente (protetta).

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "uuid": "...",
      "username": "mario_rossi",
      "email": "mario@example.com",
      "first_name": "Mario",
      "last_name": "Rossi",
      "role": "user",
      "status": "active",
      ...
    }
  }
}
```

#### POST /api/auth/forgot-password
Richiedi reset password.

**Body:**
```json
{
  "email": "mario@example.com"
}
```

#### POST /api/auth/reset-password
Reset password con token.

**Body:**
```json
{
  "token": "reset_token_here",
  "password": "NewPassword123!"
}
```

---

### 👥 User Routes

#### GET /api/users/profile/:id
Ottieni profilo pubblico di un utente.

#### PUT /api/users/profile
Aggiorna proprio profilo (protetta).

**Body:**
```json
{
  "first_name": "Mario",
  "last_name": "Rossi",
  "phone": "+39 123 456 7890",
  "bio": "Ciao, sono Mario...",
  "city": "Varese"
}
```

#### PUT /api/users/change-password
Cambia password (protetta).

**Body:**
```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewPassword123!"
}
```

#### GET /api/users (Admin)
Lista utenti con filtri.

**Query params:**
- `page`: numero pagina (default: 1)
- `limit`: risultati per pagina (default: 20)
- `search`: cerca in username/email
- `role`: filtra per ruolo (user/admin/moderator)
- `status`: filtra per stato (active/inactive/suspended)

#### PUT /api/users/:id/status (Admin)
Cambia stato utente.

#### PUT /api/users/:id/role (Admin)
Cambia ruolo utente.

#### DELETE /api/users/:id (Admin)
Elimina utente.

---

### 💬 Message Routes

#### GET /api/messages
Ottieni messaggi (protetta).

**Query params:**
- `type`: 'received' o 'sent' (default: received)
- `page`: numero pagina
- `limit`: risultati per pagina

#### GET /api/messages/unread-count
Conta messaggi non letti (protetta).

#### GET /api/messages/:id
Ottieni messaggio specifico (protetta, marca come letto).

#### POST /api/messages
Invia nuovo messaggio (protetta).

**Body:**
```json
{
  "recipient_id": 2,
  "subject": "Informazioni stanza",
  "content": "Ciao, sono interessato alla stanza...",
  "parent_message_id": null
}
```

#### DELETE /api/messages/:id
Elimina messaggio (protetta).

#### GET /api/messages/conversations/list
Ottieni lista conversazioni (protetta).

---

### 📝 Post Routes

#### GET /api/posts
Ottieni lista posts (pubblico, opzionalmente autenticato).

**Query params:**
- `page`: numero pagina
- `limit`: risultati per pagina
- `category`: alloggio|lavoro|formazione|servizi|eventi|altro
- `search`: cerca in titolo/descrizione
- `featured`: true per posts in evidenza
- `user_id`: filtra per autore

#### GET /api/posts/:id
Ottieni post specifico (pubblico, incrementa views).

#### POST /api/posts
Crea nuovo post (protetta).

**Body:**
```json
{
  "title": "Stanza disponibile a Varese",
  "description": "Stanza singola in centro...",
  "category": "alloggio",
  "location": "Varese, Italia",
  "contact_info": "Contattare via messaggio",
  "image_url": "https://..."
}
```

#### PUT /api/posts/:id
Aggiorna post (protetta, solo proprietario o admin).

#### DELETE /api/posts/:id
Elimina post (protetta, solo proprietario o admin).

#### POST /api/posts/:id/favorite
Aggiungi/rimuovi dai preferiti (protetta).

#### GET /api/posts/my/favorites
Ottieni posts preferiti (protetta).

#### PUT /api/posts/:id/feature (Admin)
Metti/rimuovi post in evidenza.

**Body:**
```json
{
  "is_featured": true
}
```

---

## 🗃️ Database Schema

### Tabelle Principali

#### users
- Gestione utenti con ruoli (user/admin/moderator)
- Stati account (active/inactive/suspended/pending)
- Informazioni personali e di contatto

#### posts
- Annunci/posts categorizzati
- Categorie: alloggio, lavoro, formazione, servizi, eventi, altro
- Sistema di visualizzazioni e posts in evidenza

#### messages
- Sistema di messaggistica privata
- Stati: sent/delivered/read
- Supporto conversazioni e risposte

#### favorites
- Salvataggio posts preferiti

#### comments
- Sistema commenti sui posts

#### notifications
- Notifiche per gli utenti

#### activity_logs
- Log delle attività (per admin)

### ENUM Types

```sql
user_role: 'user' | 'admin' | 'moderator'
user_status: 'active' | 'inactive' | 'suspended' | 'pending'
message_status: 'sent' | 'delivered' | 'read'
post_category: 'alloggio' | 'lavoro' | 'formazione' | 'servizi' | 'eventi' | 'altro'
```

### Views Utili

- `messages_with_users`: Messaggi con info sender e recipient
- `posts_with_author`: Posts con info autore

### Funzioni Custom

- `count_unread_messages(user_id)`: Conta messaggi non letti
- `increment_post_views(post_id)`: Incrementa visualizzazioni post

## 🔒 Sicurezza

- **Password hashing**: bcrypt con 10 salt rounds
- **JWT**: Token per autenticazione stateless
- **Helmet**: Security headers
- **CORS**: Configurabile per origin specifici
- **Input validation**: express-validator su tutti gli endpoints
- **SQL injection protection**: Query parametrizzate

## 🚀 Deploy in Produzione

1. Imposta `NODE_ENV=production` nel file `.env`
2. Genera un `JWT_SECRET` sicuro
3. Configura il database PostgreSQL remoto
4. Usa un process manager come PM2:

```bash
npm install -g pm2
pm2 start server.js --name africa-unita
```

## 📝 Note di Sviluppo

- Logs dettagliati in modalità development
- Reset password genera token (da implementare invio email)
- Upload immagini da implementare (attualmente solo URL)
- Sistema notifiche creato ma da integrare con frontend

## 🤝 Contribuire

Per contribuire al progetto:
1. Fork il repository
2. Crea un branch per la tua feature
3. Commit le modifiche
4. Push al branch
5. Apri una Pull Request

## 📄 Licenza

Questo progetto è per uso interno dell'associazione Africa Unita.

---

**Developed with ❤️ for Africa Unita**
