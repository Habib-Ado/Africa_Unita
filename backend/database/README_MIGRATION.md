# 🔧 Migrazione Database - Aggiunta Ruolo "President"

## Problema
Il database esistente potrebbe non avere il valore `'president'` nell'enum `role`, causando errori quando si tenta di assegnare questo ruolo agli utenti.

## Soluzione Rapida

### Opzione 1: SQL Diretto (Consigliato)
Connettiti al database MySQL e esegui:

```sql
-- MySQL usa ENUM nella definizione della tabella
-- Per modificare, usa ALTER TABLE
ALTER TABLE users MODIFY COLUMN role 
  ENUM('user', 'admin', 'president', 'moderator', 'treasurer') 
  DEFAULT 'user' NOT NULL;
```

### Opzione 2: MySQL Workbench
1. Apri MySQL Workbench
2. Connettiti al database `africa_unita_db`
3. Apri una nuova Query Tab
4. Esegui il comando sopra

### Opzione 3: mysql Command Line
```bash
mysql -u root -p africa_unita_db -e "ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'president', 'moderator', 'treasurer') DEFAULT 'user' NOT NULL;"
```

## Verifica
Dopo l'esecuzione, verifica che il ruolo sia stato aggiunto:

```sql
SHOW COLUMNS FROM users LIKE 'role';
```

Dovrebbe mostrare:
```
Field: role
Type: enum('user','admin','president','moderator','treasurer')
```

## Ruoli Disponibili
Dopo la migrazione, i ruoli disponibili saranno:

| Ruolo | Descrizione |
|-------|-------------|
| `user` | Membro standard |
| `admin` | Amministratore completo |
| **`president`** | **Presidente dell'associazione** ← NUOVO |
| `moderator` | Moderatore contenuti |
| `treasurer` | Tesoriere |

## File Consolidati
Tutti gli schemi SQL sono stati consolidati nel file:
- `backend/database/schema.sql`

### File Eliminati (contenuti integrati in schema.sql):
- ❌ `loans-schema.sql`
- ❌ `meetings-schema.sql`
- ❌ `add-post-files-table.sql`

## Note
- La migrazione è **sicura** e **non distruttiva**
- Non elimina né modifica dati esistenti
- Se il ruolo esiste già, il comando viene ignorato (IF NOT EXISTS)
- Il database continuerà a funzionare normalmente durante e dopo la migrazione

