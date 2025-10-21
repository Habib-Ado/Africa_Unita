import AbstractView from "./AbstractView.js";
import { API_BASE } from "../index.js";

export default class extends AbstractView {
    constructor() {
        super();
        this.setTitle("Gestione Utenti - Admin Dashboard");
        this.users = [];
        this.currentUser = null;
        this.eventListenersInitialized = false;
        this.stats = {
            totalUsers: 0,
            verifiedUsers: 0,
            activeUsers: 0,
            blockedUsers: 0,
            pendingUsers: 0,
            adminCount: 0,
            moderatorCount: 0,
            treasurerCount: 0,
            memberCount: 0
        };
        this.pendingUsers = [];
    }

    async init() {
        try {
            // Verifica l'autenticazione e il ruolo admin
            const token = localStorage.getItem('auth_token');
            if (!token) {
                console.log("No token found");
                window.location.href = '/login';
                return;
            }

            const authResponse = await fetch('/api/auth/me', {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!authResponse.ok) {
                console.log("Auth check failed:", authResponse.status);
                localStorage.removeItem('auth_token');
                window.location.href = '/login';
                return;
            }

            const authData = await authResponse.json();
            console.log("Auth data:", authData);
            
            if (!authData.data?.user || authData.data.user.role !== 'admin') {
                console.log("Not authenticated or not admin");
                window.location.href = '/login';
                return;
            }

            // Salva l'utente corrente
            this.currentUser = authData.data.user;

            await this.loadUsers();
            console.log("🔍 [init] Current user role:", this.currentUser?.role);
            console.log("🔍 [init] Current user ID:", this.currentUser?.id);
            await this.loadPendingUsers();
            this.calculateStats();
            this.updateUI();
            this.initializeEventListeners();
        } catch (error) {
            console.error("Errore durante l'inizializzazione:", error);
            this.showNotification("Errore durante il caricamento dei dati", "error");
        }
    }

    async loadUsers() {
        try {
            const token = localStorage.getItem('auth_token');
            // Includi gli utenti bloccati per gli admin ma escludi quelli in attesa
            const response = await fetch('/api/users?showBlocked=true', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('auth_token');
                    window.location.href = '/login';
                    return;
                }
                if (response.status === 403) {
                    window.location.href = '/';
                    return;
                }
                throw new Error(`Errore nel recupero degli utenti: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || "Errore nel recupero degli utenti");
            }

            if (!data.data || !data.data.users || !Array.isArray(data.data.users)) {
                console.error("Invalid data format received:", data);
                throw new Error("Formato dati non valido");
            }

            // Includi tutti gli utenti (anche quelli in attesa)
            this.users = data.data.users;
            this.calculateStats();
            this.updateUI();
           
        } catch (error) {
            console.error("Errore nel recupero degli utenti:", error);
            this.showNotification("Errore nel caricamento degli utenti", "error");
        }
    }

    async loadPendingUsers() {
        try {
            console.log("🔄 [loadPendingUsers] INIZIO - Caricamento utenti in attesa...");
            const token = localStorage.getItem('auth_token');
            
            const response = await fetch('/api/users/pending', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log("📡 [loadPendingUsers] Response status:", response.status);

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('auth_token');
                    window.location.href = '/login';
                    return;
                }
                if (response.status === 403) {
                    window.location.href = '/';
                    return;
                }
                throw new Error(`Errore nel recupero degli utenti in attesa: ${response.status}`);
            }

            const data = await response.json();
            console.log("📊 [loadPendingUsers] Response data:", data);

            if (!data.success) {
                throw new Error(data.message || "Errore nel recupero degli utenti in attesa");
            }

            this.pendingUsers = data.data.users || [];
            console.log("✅ [loadPendingUsers] Utenti in attesa caricati:", this.pendingUsers.length);
            console.log("📋 [loadPendingUsers] Dettagli utenti:", this.pendingUsers);
            
        } catch (error) {
            console.error("❌ [loadPendingUsers] Errore:", error);
            this.showNotification("Errore nel caricamento degli utenti in attesa", "error");
        }
    }

    calculateStats() {
        // Calcola pendingUsers da this.pendingUsers se disponibile, altrimenti da this.users
        const pendingCount = this.pendingUsers ? this.pendingUsers.length : this.users.filter(user => user.status === 'pending').length;
        
        this.stats = {
            totalUsers: this.users.length,
            activeUsers: this.users.filter(user => user.status === 'active').length,
            blockedUsers: this.users.filter(user => user.status === 'blocked').length,
            pendingUsers: pendingCount,
            adminCount: this.users.filter(user => user.role === 'admin').length,
            presidentCount: this.users.filter(user => user.role === 'president').length,
            moderatorCount: this.users.filter(user => user.role === 'moderator').length,
            treasurerCount: this.users.filter(user => user.role === 'treasurer').length,
            memberCount: this.users.filter(user => user.role === 'user').length
        };
    }

    updateUI() {
        // Aggiorna le statistiche
        const statsElements = {
            'total-users': this.stats.totalUsers,
            'active-users': this.stats.activeUsers,
            'blocked-users': this.stats.blockedUsers,
            'pending-users': this.stats.pendingUsers,
            'admin-count': this.stats.adminCount,
            'president-count': this.stats.presidentCount,
            'moderator-count': this.stats.moderatorCount,
            'treasurer-count': this.stats.treasurerCount,
            'member-count': this.stats.memberCount
        };

        Object.entries(statsElements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });
       
        // Aggiorna la tabella degli utenti
        const tbody = document.querySelector('#users-table tbody');
        if (!tbody) {
            console.error("❌ [updateUI] Table tbody not found!");
            return;
        }
        
        tbody.innerHTML = '';

        // Filtra gli utenti in base al toggle
        const showBlocked = document.getElementById('showBlockedUsers')?.checked ?? true;
        const filteredUsers = showBlocked ? this.users : this.users.filter(user => user.status === 'active');

        filteredUsers.forEach(user => {
            const tr = document.createElement('tr');
            const roleDisplay = this.getRoleDisplay(user.role);
            const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
            const isBlocked = user.status !== 'active';
            const isCurrentUser = this.currentUser && user.id === this.currentUser.id;
            
            // Aggiungi classe speciale per l'utente corrente
            if (isCurrentUser) {
                tr.classList.add('table-primary');
            }
            
            tr.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <div class="user-avatar-sm me-2">
                            ${user.avatar_url ? 
                                `<img src="${API_BASE}${user.avatar_url}" alt="${fullName}">` :
                                `<div class="avatar-initials-sm">${this.getInitials(user)}</div>`
                            }
                        </div>
                        <div>
                            <strong>${fullName}</strong>
                            ${isCurrentUser ? '<span class="badge bg-info ms-2">Tu</span>' : ''}
                            <br><small class="text-muted">@${user.username}</small>
                        </div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td><span class="badge ${this.getRoleBadgeClass(user.role)}">${roleDisplay}</span></td>
                <td>
                    ${isBlocked ? 
                        '<span class="badge bg-danger"><i class="fas fa-ban"></i> Bloccato</span>' : 
                        '<span class="badge bg-success"><i class="fas fa-check-circle"></i> Attivo</span>'
                    }
                </td>
                <td class="text-end">
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary view-user" data-user-id="${user.id}" title="Visualizza dettagli">
                        <i class="fas fa-eye"></i>
                    </button>
                        ${!isCurrentUser ? `
                            <button class="btn btn-sm btn-outline-warning change-role" data-user-id="${user.id}" data-current-role="${user.role}" title="Cambia ruolo">
                                <i class="fas fa-user-shield"></i>
                    </button>
                            ${isBlocked ? 
                                `<button class="btn btn-sm btn-outline-success unblock-user" data-user-id="${user.id}" title="Sblocca utente">
                                    <i class="fas fa-unlock"></i>
                        </button>` :
                                `<button class="btn btn-sm btn-outline-danger block-user" data-user-id="${user.id}" title="Blocca utente">
                                    <i class="fas fa-lock"></i>
                        </button>`
                    }
                            <button class="btn btn-sm btn-outline-danger delete-user" data-user-id="${user.id}" title="Elimina utente">
                        <i class="fas fa-trash"></i>
                    </button>
                        ` : `
                            <button class="btn btn-sm btn-outline-secondary" disabled title="Non puoi modificare il tuo account">
                                <i class="fas fa-shield-alt"></i>
                            </button>
                        `}
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    initializeEventListeners() {
        // Evita di aggiungere event listeners multipli
        if (this.eventListenersInitialized) {
            return;
        }
        
        // Gestione ricerca e filtri utenti
        const searchInput = document.getElementById('user-search');
        const roleFilter = document.getElementById('role-filter');
        const statusFilter = document.getElementById('status-filter');
        const showBlockedToggle = document.getElementById('showBlockedUsers');

        const filterUsers = () => {
            const searchTerm = searchInput?.value.toLowerCase() || '';
            const selectedRole = roleFilter?.value || '';
            const selectedStatus = statusFilter?.value || '';

            const filteredUsers = this.users.filter(user => {
                // Filtro ricerca testuale
                const matchesSearch = !searchTerm || 
                    (user.first_name && user.first_name.toLowerCase().includes(searchTerm)) ||
                    (user.last_name && user.last_name.toLowerCase().includes(searchTerm)) ||
                    (user.username && user.username.toLowerCase().includes(searchTerm)) ||
                    (user.email && user.email.toLowerCase().includes(searchTerm));

                // Filtro ruolo
                const matchesRole = !selectedRole || user.role === selectedRole;

                // Filtro stato
                const matchesStatus = !selectedStatus || user.status === selectedStatus;

                return matchesSearch && matchesRole && matchesStatus;
            });

            this.updateUsersTable(filteredUsers);
        };

        if (searchInput) {
            searchInput.addEventListener('input', filterUsers);
        }

        if (roleFilter) {
            roleFilter.addEventListener('change', filterUsers);
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', filterUsers);
        }

        if (showBlockedToggle) {
            showBlockedToggle.addEventListener('change', () => {
                this.updateUI();
            });
        }

        // Gestione pulsante ricarica
        const reloadBtn = document.getElementById('reload-users-btn');
        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => {
                location.reload();
            });
        }

        // Usa il contenitore della tabella invece di document per evitare conflitti
        const tableContainer = document.querySelector('#users-table');
        if (!tableContainer) {
            console.error('Tabella utenti non trovata');
            return;
        }

        // Gestione click sulla tabella con un unico handler
        tableContainer.addEventListener('click', async (e) => {
            e.stopPropagation(); // Previeni propagazione per evitare conflitti
            
            console.log('🔍 [Click] Elemento cliccato:', e.target);
            console.log('🔍 [Click] Classe dell\'elemento:', e.target.className);
            console.log('🔍 [Click] Elemento più vicino con classe:', e.target.closest('.view-user, .change-role, .block-user, .unblock-user, .delete-user'));
            
            // Gestione visualizzazione dettagli
            if (e.target.closest('.view-user')) {
                console.log('👁️ [Click] Pulsante visualizza dettagli cliccato');
                const userId = e.target.closest('.view-user').dataset.userId;
                await this.showUserDetails(userId);
                return;
            }
            
            // Gestione cambio ruolo
            if (e.target.closest('.change-role')) {
                console.log('🔄 [Click] Pulsante cambio ruolo cliccato');
                const button = e.target.closest('.change-role');
                const userId = button.dataset.userId;
                const currentRole = button.dataset.currentRole;
                
                // Verifica che non stia cercando di cambiare il proprio ruolo
                if (parseInt(userId) === this.currentUser.id) {
                    this.showNotification('Non puoi modificare il tuo ruolo', 'error');
                    return;
                }
                
                this.showChangeRoleModal(userId, currentRole);
                return;
            }
            
            // Gestione blocco utente
            if (e.target.closest('.block-user')) {
                console.log('🔒 [Click] Pulsante BLOCCA utente cliccato');
                const userId = e.target.closest('.block-user').dataset.userId;
                console.log('🔒 [Click] UserId da bloccare:', userId);
                
                // Verifica che non stia cercando di bloccare se stesso
                if (parseInt(userId) === this.currentUser.id) {
                    this.showNotification('Non puoi bloccare il tuo account', 'error');
                    return;
                }
                
                if (confirm('Sei sicuro di voler bloccare questo utente?')) {
                    console.log('🔒 [Click] Confermato: procedo con il blocco');
                    await this.toggleUserBlock(userId, true);
                }
                return;
            }
            
            // Gestione sblocco utente
            if (e.target.closest('.unblock-user')) {
                console.log('🔓 [Click] Pulsante SBLOCCA utente cliccato');
                const userId = e.target.closest('.unblock-user').dataset.userId;
                console.log('🔓 [Click] UserId da sbloccare:', userId);
                if (confirm('Sei sicuro di voler sbloccare questo utente?')) {
                    console.log('🔓 [Click] Confermato: procedo con lo sblocco');
                    await this.toggleUserBlock(userId, false);
                }
                return;
            }
            
            // Gestione eliminazione utente
            if (e.target.closest('.delete-user')) {
                console.log('🗑️ [Click] Pulsante ELIMINA utente cliccato');
                const userId = e.target.closest('.delete-user').dataset.userId;
                console.log('🗑️ [Click] UserId da eliminare:', userId);
                
                // Verifica che non stia cercando di eliminare se stesso
                if (parseInt(userId) === this.currentUser.id) {
                    this.showNotification('Non puoi eliminare il tuo account', 'error');
                    return;
                }
                
                if (confirm('Sei sicuro di voler eliminare questo utente?')) {
                    console.log('🗑️ [Click] Confermato: procedo con l\'eliminazione');
                    await this.deleteUser(userId);
                }
                return;
            }
            
            console.log('❓ [Click] Nessun pulsante riconosciuto cliccato');
        });

        // Gestione event listeners per utenti in attesa di approvazione
        document.addEventListener('click', async (e) => {
            // Approva utente
            if (e.target.closest('.approve-user-btn')) {
                console.log('✅ [Click] Pulsante approva utente cliccato');
                const userId = e.target.closest('.approve-user-btn').dataset.userId;
                
                if (confirm('Sei sicuro di voler approvare questo utente?')) {
                    await this.approveUser(userId);
                }
                return;
            }
            
            // Rifiuta utente
            if (e.target.closest('.reject-user-btn')) {
                console.log('❌ [Click] Pulsante rifiuta utente cliccato');
                const userId = e.target.closest('.reject-user-btn').dataset.userId;
                
                const reason = prompt('Motivo del rifiuto (opzionale):');
                if (reason !== null) { // L'utente ha premuto OK (anche se il campo è vuoto)
                    await this.rejectUser(userId, reason);
                }
                return;
            }
            
            // Visualizza dettagli utente in attesa
            if (e.target.closest('.view-user-btn')) {
                console.log('👁️ [Click] Pulsante visualizza dettagli utente in attesa cliccato');
                const userId = e.target.closest('.view-user-btn').dataset.userId;
                await this.showUserDetails(userId);
                return;
            }
        });
        
        this.eventListenersInitialized = true;
    }

    updateUsersTable(users) {
        const tbody = document.querySelector('#users-table tbody');
        tbody.innerHTML = '';

        users.forEach(user => {
            const tr = document.createElement('tr');
            const roleDisplay = this.getRoleDisplay(user.role);
            const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
            const isBlocked = user.status !== 'active';
            
            tr.innerHTML = `
                <td>${fullName}</td>
                <td>${user.email}</td>
                <td>${roleDisplay}</td>
                <td>${isBlocked ? '<span class="badge bg-danger">Bloccato</span>' : '<span class="badge bg-success">Attivo</span>'}</td>
                <td>
                    <button class="btn btn-info btn-sm view-user" data-user-id="${user.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-warning btn-sm change-role" data-user-id="${user.id}" data-current-role="${user.role}">
                        <i class="fas fa-user-edit"></i>
                    </button>
                    ${isBlocked ? 
                        `<button class="btn btn-success btn-sm unblock-user" data-user-id="${user.id}">
                            <i class="fas fa-unlock"></i> Sblocca
                        </button>` :
                        `<button class="btn btn-danger btn-sm block-user" data-user-id="${user.id}">
                            <i class="fas fa-lock"></i> Blocca
                        </button>`
                    }
                    <button class="btn btn-danger btn-sm delete-user" data-user-id="${user.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    async deleteUser(userId) {
        try {
            console.log(`🗑️ [deleteUser] INIZIO - userId: ${userId}`);
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log(`🗑️ [deleteUser] Response status: ${response.status}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Errore durante l\'eliminazione dell\'utente');
            }

            console.log(`🗑️ [deleteUser] SUCCESSO - Ricarico pagina`);
            // Ricarica la pagina per mostrare i cambiamenti
            window.location.reload();
        } catch (error) {
            console.error("❌ [deleteUser] Errore:", error);
            this.showNotification(error.message || "Errore durante l'eliminazione dell'utente", "error");
        }
    }

    async changeUserRole(userId, newRole) {
        try {
            console.log(`🔄 [changeUserRole] INIZIO - userId: ${userId}, newRole: ${newRole}`);
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`/api/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role: newRole })
            });

            console.log(`🔄 [changeUserRole] Response status: ${response.status}`);

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('auth_token');
                    window.location.href = '/login';
                    return;
                }
                if (response.status === 403) {
                    window.location.href = '/';
                    return;
                }
                const errorData = await response.json();
                throw new Error(errorData.message || 'Errore durante il cambio di ruolo');
            }

            console.log(`🔄 [changeUserRole] SUCCESSO - Ricarico pagina`);
            // Mostra notifica di successo
            this.showNotification('Ruolo aggiornato con successo', 'success');
            
            // Ricarica immediatamente la pagina
            window.location.reload();
            
        } catch (error) {
            console.error("❌ [changeUserRole] Errore:", error);
            this.showNotification(error.message || "Errore durante il cambio di ruolo", "error");
        }
    }

    async toggleUserBlock(userId, blocked) {
        try {
            console.log(`🔒 [toggleUserBlock] INIZIO - userId: ${userId}, blocked: ${blocked}`);
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`/api/users/${userId}/block`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ blocked: blocked })
            });

            console.log(`🔒 [toggleUserBlock] Response status: ${response.status}`);

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('auth_token');
                    window.location.href = '/login';
                    return;
                }
                if (response.status === 403) {
                    window.location.href = '/';
                    return;
                }
                const errorData = await response.json();
                throw new Error(errorData.message || 'Errore durante il cambio di stato di blocco');
            }

            console.log(`🔒 [toggleUserBlock] SUCCESSO - Ricarico pagina`);
            // Ricarica la pagina per mostrare i cambiamenti
            window.location.reload();
        } catch (error) {
            console.error("❌ [toggleUserBlock] Errore:", error);
            this.showNotification(error.message || "Errore durante il cambio di stato di blocco", "error");
        }
    }

    async approveUser(userId) {
        try {
            console.log(`✅ [approveUser] INIZIO - userId: ${userId}`);
            const token = localStorage.getItem('auth_token');
            
            const response = await fetch(`/api/users/${userId}/approve`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Errore nell'approvazione: ${response.status}`);
            }

            const data = await response.json();
            console.log(`✅ [approveUser] SUCCESSO - Response:`, data);
            
            this.showNotification(data.message || "Utente approvato con successo", "success");
            
            // Ricarica i dati
            await this.loadUsers();
            await this.loadPendingUsers();
            this.calculateStats();
            this.updateUI();
            
        } catch (error) {
            console.error("❌ [approveUser] Errore:", error);
            this.showNotification(error.message || "Errore durante l'approvazione dell'utente", "error");
        }
    }

    async rejectUser(userId, reason = '') {
        try {
            console.log(`❌ [rejectUser] INIZIO - userId: ${userId}, reason: ${reason}`);
            const token = localStorage.getItem('auth_token');
            
            const response = await fetch(`/api/users/${userId}/reject`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Errore nel rifiuto: ${response.status}`);
            }

            const data = await response.json();
            console.log(`❌ [rejectUser] SUCCESSO - Response:`, data);
            
            this.showNotification(data.message || "Utente rifiutato con successo", "success");
            
            // Ricarica i dati
            await this.loadUsers();
            await this.loadPendingUsers();
            this.calculateStats();
            this.updateUI();
            
        } catch (error) {
            console.error("❌ [rejectUser] Errore:", error);
            this.showNotification(error.message || "Errore durante il rifiuto dell'utente", "error");
        }
    }

    async showUserDetails(userId) {
        try {
            console.log('Fetching details for user:', userId);
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`/api/users/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                if (response.status === 401) {
                    console.log('Unauthorized - redirecting to login');
                    localStorage.removeItem('auth_token');
                    window.location.href = '/login';
                    return;
                }
                if (response.status === 403) {
                    console.log('Forbidden - redirecting to home');
                    window.location.href = '/';
                    return;
                }
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const userDetails = await response.json();
            console.log('Parsed user details:', userDetails);

            if (!userDetails.success) {
                throw new Error(userDetails.message || 'Errore nel recupero dei dettagli utente');
            }

            if (!userDetails.data || !userDetails.data.user) {
                throw new Error('Formato dati non valido');
            }

            // Popola il modale con i dettagli dell'utente
            const modal = document.getElementById('userDetailsModal');
            const modalContent = modal.querySelector('.modal-body');
            const user = userDetails.data.user;
            const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
            const isBlocked = user.status !== 'active';
            
            modalContent.innerHTML = `
                <div class="user-details">
                    <h4>${fullName}</h4>
                    <p><strong>Username:</strong> ${user.username}</p>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Ruolo:</strong> ${this.getRoleDisplay(user.role)}</p>
                    <p><strong>Stato:</strong> ${isBlocked ? '<span class="badge bg-danger">Bloccato</span>' : '<span class="badge bg-success">Attivo</span>'}</p>
                    <p><strong>Data registrazione:</strong> ${new Date(user.created_at).toLocaleDateString()}</p>
                    ${user.last_login ? `<p><strong>Ultimo accesso:</strong> ${new Date(user.last_login).toLocaleDateString()}</p>` : ''}
                    ${user.phone ? `<p><strong>Telefono:</strong> ${user.phone}</p>` : ''}
                    ${user.city ? `<p><strong>Città:</strong> ${user.city}</p>` : ''}
                    ${user.country_of_origin ? `<p><strong>Paese di origine:</strong> ${user.country_of_origin}</p>` : ''}
                    <hr>
                    <div class="d-flex justify-content-end">
                        <button class="btn ${isBlocked ? 'btn-success' : 'btn-danger'} btn-sm toggle-block" 
                                data-user-id="${user.id}" 
                                data-current-blocked="${isBlocked}">
                            <i class="fas ${isBlocked ? 'fa-unlock' : 'fa-lock'}"></i>
                            ${isBlocked ? 'Sblocca' : 'Blocca'} Utente
                        </button>
                    </div>
                </div>
            `;

            // Mostra il modale
            const modalInstance = new bootstrap.Modal(modal);

            // Aggiungi l'event listener per il pulsante di blocco/sblocco nel modale
            const toggleBlockButton = modalContent.querySelector('.toggle-block');
            if (toggleBlockButton) {
                toggleBlockButton.addEventListener('click', async () => {
                    const userId = toggleBlockButton.dataset.userId;
                    const currentBlocked = toggleBlockButton.dataset.currentBlocked === 'true';
                    const newBlockedState = !currentBlocked;
                    
                    if (confirm(`Sei sicuro di voler ${newBlockedState ? 'bloccare' : 'sbloccare'} questo utente?`)) {
                        await this.toggleUserBlock(userId, newBlockedState);
                        // Chiudi il modale dopo l'aggiornamento
                        modalInstance.hide();
                        // Forza il reload della pagina
                        window.location.reload();
                    }
                });
            }

            // Aggiungi l'event listener per la chiusura del modale
            modal.addEventListener('hidden.bs.modal', () => {
                // Forza il reload della pagina quando il modale viene chiuso
                window.location.reload();
            });

            modalInstance.show();
        } catch (error) {
            console.error("Errore nel recupero dei dettagli utente:", error);
            this.showNotification("Errore nel recupero dei dettagli utente: " + error.message, "error");
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show`;
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        const container = document.querySelector('.container');
        container.insertBefore(notification, container.firstChild);

        // Rimuovi la notifica dopo 5 secondi
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    getRoleDisplay(role) {
        const roleMap = {
            'admin': 'Amministratore',
            'president': 'Presidente',
            'treasurer': 'Tesoriere',
            'moderator': 'Moderatore',
            'user': 'Membro'
        };
        return roleMap[role] || 'Membro';
    }

    getRoleBadgeClass(role) {
        const badgeMap = {
            'admin': 'bg-danger',
            'president': 'bg-primary',
            'treasurer': 'bg-warning text-dark',
            'moderator': 'bg-info',
            'user': 'bg-secondary'
        };
        return badgeMap[role] || 'bg-secondary';
    }

    getInitials(user) {
        const first = user.first_name?.charAt(0) || user.username?.charAt(0) || '?';
        const last = user.last_name?.charAt(0) || '';
        return (first + last).toUpperCase();
    }

    showChangeRoleModal(userId, currentRole) {
        const modal = document.getElementById('changeRoleModal');
        if (!modal) return;

        const roleOptions = [
            { value: 'user', label: 'Membro', icon: 'fa-user', color: 'secondary' },
            { value: 'moderator', label: 'Moderatore', icon: 'fa-user-shield', color: 'info' },
            { value: 'president', label: 'Presidente', icon: 'fa-user-tie', color: 'primary' },
            { value: 'treasurer', label: 'Tesoriere', icon: 'fa-coins', color: 'warning' },
            { value: 'admin', label: 'Amministratore', icon: 'fa-crown', color: 'danger' }
        ];

        const roleOptionsHtml = roleOptions.map(option => `
            <div class="form-check role-option ${option.value === currentRole ? 'current-role' : ''}">
                <input class="form-check-input" type="radio" name="newRole" id="role-${option.value}" 
                       value="${option.value}" ${option.value === currentRole ? 'checked' : ''}>
                <label class="form-check-label w-100" for="role-${option.value}">
                    <div class="d-flex align-items-center">
                        <div class="role-icon bg-${option.color} bg-opacity-10 rounded me-3 p-2">
                            <i class="fas ${option.icon} text-${option.color}"></i>
                        </div>
                        <div class="flex-grow-1">
                            <strong>${option.label}</strong>
                            ${option.value === currentRole ? '<span class="badge bg-secondary ms-2">Attuale</span>' : ''}
                        </div>
                    </div>
                </label>
            </div>
        `).join('');

        modal.querySelector('.role-options').innerHTML = roleOptionsHtml;

        const confirmBtn = modal.querySelector('#confirmRoleChange');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🔄 [Modal] Pulsante Conferma cliccato');
            const selectedRole = modal.querySelector('input[name="newRole"]:checked')?.value;
            console.log(`🔄 [Modal] Ruolo selezionato: ${selectedRole}, ruolo attuale: ${currentRole}`);
            
            if (!selectedRole) {
                console.log('🔄 [Modal] Nessun ruolo selezionato');
                this.showNotification('Seleziona un ruolo', 'warning');
                return;
            }
            
            if (selectedRole === currentRole) {
                console.log('🔄 [Modal] Ruolo già attuale, chiudo il modal');
                const modalInstance = bootstrap.Modal.getInstance(modal) || new bootstrap.Modal(modal);
                modalInstance.hide();
                this.showNotification('Il ruolo selezionato è già quello attuale', 'info');
                return;
            }
            
            console.log('🔄 [Modal] Procedo con il cambio di ruolo');
            // Chiudi il modal immediatamente
            const modalInstance = bootstrap.Modal.getInstance(modal) || new bootstrap.Modal(modal);
            modalInstance.hide();
            
            // Cambia il ruolo (ricaricherà automaticamente la pagina)
            try {
                await this.changeUserRole(userId, selectedRole);
            } catch (error) {
                console.error('🔄 [Modal] Errore durante il cambio di ruolo:', error);
                this.showNotification('Errore durante il cambio di ruolo', 'error');
            }
        });

        // Gestione chiusura modal senza conferma
        modal.addEventListener('hidden.bs.modal', () => {
            console.log('🔄 [Modal] Modal chiuso senza conferma - comportamento normale');
        });

        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
    }

    async getHtml() {
        return `
            <div class="container-fluid py-4">
                <!-- Header -->
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h1 class="h3 mb-0"><i class="fas fa-users-cog me-2"></i>Gestione Utenti</h1>
                        <p class="text-muted mb-0">Amministra e gestisci gli utenti della piattaforma</p>
                    </div>
                    <div>
                        <button class="btn btn-outline-primary" id="reload-users-btn">
                            <i class="fas fa-sync-alt me-2"></i>Ricarica
                        </button>
                    </div>
                </div>
                
                <!-- Statistiche -->
                <div class="row g-3 mb-4">
                    <div class="col-lg-3 col-md-6">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="flex-shrink-0">
                                        <div class="bg-primary bg-opacity-10 rounded-3 p-3">
                                            <i class="fas fa-users fa-2x text-primary"></i>
                                        </div>
                                    </div>
                                    <div class="flex-grow-1 ms-3">
                                        <h6 class="text-muted mb-1">Totale Utenti</h6>
                                        <h3 class="mb-0" id="total-users">0</h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-3 col-md-6">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="flex-shrink-0">
                                        <div class="bg-success bg-opacity-10 rounded-3 p-3">
                                            <i class="fas fa-check-circle fa-2x text-success"></i>
                                        </div>
                                    </div>
                                    <div class="flex-grow-1 ms-3">
                                        <h6 class="text-muted mb-1">Utenti Attivi</h6>
                                        <h3 class="mb-0" id="active-users">0</h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-3 col-md-6">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="flex-shrink-0">
                                        <div class="bg-danger bg-opacity-10 rounded-3 p-3">
                                            <i class="fas fa-ban fa-2x text-danger"></i>
                                        </div>
                                    </div>
                                    <div class="flex-grow-1 ms-3">
                                        <h6 class="text-muted mb-1">Utenti Bloccati</h6>
                                        <h3 class="mb-0" id="blocked-users">0</h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-3 col-md-6">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="flex-shrink-0">
                                        <div class="bg-warning bg-opacity-10 rounded-3 p-3">
                                            <i class="fas fa-crown fa-2x text-warning"></i>
                                        </div>
                                    </div>
                                    <div class="flex-grow-1 ms-3">
                                        <h6 class="text-muted mb-1">Amministratori</h6>
                                        <h3 class="mb-0" id="admin-count">0</h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-3 col-md-6">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="flex-shrink-0">
                                        <div class="bg-warning bg-opacity-10 rounded-3 p-3">
                                            <i class="fas fa-clock fa-2x text-warning"></i>
                                        </div>
                                    </div>
                                    <div class="flex-grow-1 ms-3">
                                        <h6 class="text-muted mb-1">In Attesa di Approvazione</h6>
                                        <h3 class="mb-0" id="pending-users">0</h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Statistiche ruoli secondarie -->
                <div class="row g-3 mb-4">
                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm">
                            <div class="card-body py-3">
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-user-tie text-primary me-3"></i>
                                    <div>
                                        <small class="text-muted">Presidenti</small>
                                        <h5 class="mb-0" id="president-count">0</h5>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm">
                            <div class="card-body py-3">
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-user-shield text-info me-3"></i>
                                    <div>
                                        <small class="text-muted">Moderatori</small>
                                        <h5 class="mb-0" id="moderator-count">0</h5>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm">
                            <div class="card-body py-3">
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-coins text-warning me-3"></i>
                                    <div>
                                        <small class="text-muted">Tesorieri</small>
                                        <h5 class="mb-0" id="treasurer-count">0</h5>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm">
                            <div class="card-body py-3">
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-user text-secondary me-3"></i>
                                    <div>
                                        <small class="text-muted">Membri</small>
                                        <h5 class="mb-0" id="member-count">0</h5>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Sezione Utenti in Attesa di Approvazione -->
                ${(() => {
                    const pendingUsers = this.users.filter(user => user.status === 'pending');
                    return pendingUsers.length > 0;
                })() ? `
                <div class="card border-0 shadow-sm mb-4">
                    <div class="card-header bg-warning bg-opacity-10 border-0">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h5 class="mb-0 text-warning">
                                    <i class="fas fa-clock me-2"></i>Utenti in Attesa di Approvazione
                                </h5>
                                <small class="text-muted">${(() => {
                                    const pendingUsers = this.users.filter(user => user.status === 'pending');
                                    return pendingUsers.length;
                                })()} utente${(() => {
                                    const pendingUsers = this.users.filter(user => user.status === 'pending');
                                    return pendingUsers.length !== 1 ? 'i' : '';
                                })()} in attesa</small>
                            </div>
                            <span class="badge bg-warning text-dark">${(() => {
                                const pendingUsers = this.users.filter(user => user.status === 'pending');
                                return pendingUsers.length;
                            })()}</span>
                        </div>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover mb-0">
                                <thead class="table-light">
                                    <tr>
                                        <th>Nome</th>
                                        <th>Email</th>
                                        <th>Paese</th>
                                        <th>Data Registrazione</th>
                                        <th class="text-center">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.users.filter(user => user.status === 'pending').map(user => `
                                    <tr>
                                        <td>
                                            <div class="d-flex align-items-center">
                                                <div class="bg-warning bg-opacity-20 rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">
                                                    <i class="fas fa-user text-warning"></i>
                                                </div>
                                                <div>
                                                    <div class="fw-medium">${user.first_name || ''} ${user.last_name || ''}</div>
                                                    <small class="text-muted">@${user.username}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span class="text-muted">${user.email}</span>
                                        </td>
                                        <td>
                                            <span class="badge bg-light text-dark">${user.country_of_origin || 'N/A'}</span>
                                        </td>
                                        <td>
                                            <small class="text-muted">${new Date(user.created_at).toLocaleDateString('it-IT')}</small>
                                        </td>
                                        <td class="text-center">
                                            <div class="btn-group" role="group">
                                                <button type="button" class="btn btn-success btn-sm approve-user-btn" data-user-id="${user.id}" title="Approva utente">
                                                    <i class="fas fa-check"></i>
                                                </button>
                                                <button type="button" class="btn btn-danger btn-sm reject-user-btn" data-user-id="${user.id}" title="Rifiuta utente">
                                                    <i class="fas fa-times"></i>
                                                </button>
                                                <button type="button" class="btn btn-outline-info btn-sm view-user-btn" data-user-id="${user.id}" title="Visualizza dettagli">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                ` : ''}

                <!-- Filtri e ricerca -->
                <div class="card border-0 shadow-sm mb-4">
                    <div class="card-body">
                        <div class="row g-3">
                            <div class="col-md-6">
                        <div class="input-group">
                                    <span class="input-group-text bg-white border-end-0">
                                        <i class="fas fa-search text-muted"></i>
                                    </span>
                                    <input type="text" id="user-search" class="form-control border-start-0" 
                                           placeholder="Cerca per nome, username o email...">
                                </div>
                            </div>
                            <div class="col-md-3">
                                <select class="form-select" id="role-filter">
                                    <option value="">Tutti i ruoli</option>
                                    <option value="admin">Amministratori</option>
                                    <option value="president">Presidenti</option>
                                    <option value="moderator">Moderatori</option>
                                    <option value="treasurer">Tesorieri</option>
                                    <option value="user">Membri</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <select class="form-select" id="status-filter">
                                    <option value="">Tutti gli stati</option>
                                    <option value="active">Attivi</option>
                                    <option value="pending">In attesa di approvazione</option>
                                    <option value="blocked">Bloccati</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tabella utenti -->
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-white py-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="mb-0"><i class="fas fa-table me-2"></i>Lista Utenti</h5>
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="showBlockedUsers" checked>
                                <label class="form-check-label" for="showBlockedUsers">
                                    Mostra utenti bloccati
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="card-body p-0">
                <div class="table-responsive">
                            <table class="table table-hover mb-0" id="users-table">
                                <thead class="table-light">
                            <tr>
                                        <th>Utente</th>
                                <th>Email</th>
                                <th>Ruolo</th>
                                <th>Stato</th>
                                        <th class="text-end">Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                                    <tr>
                                        <td colspan="5" class="text-center py-5">
                                            <div class="spinner-border text-primary" role="status">
                                                <span class="visually-hidden">Caricamento...</span>
                                            </div>
                                            <p class="text-muted mt-2">Caricamento utenti...</p>
                                        </td>
                                    </tr>
                        </tbody>
                    </table>
                        </div>
                    </div>
                </div>

                <!-- Modale dettagli utente -->
                <div class="modal fade" id="userDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header border-0">
                                <h5 class="modal-title"><i class="fas fa-user-circle me-2"></i>Dettagli Utente</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <!-- I dettagli dell'utente verranno inseriti qui dinamicamente -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modale cambio ruolo -->
                <div class="modal fade" id="changeRoleModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header border-0">
                                <h5 class="modal-title"><i class="fas fa-user-shield me-2"></i>Cambia Ruolo Utente</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p class="text-muted mb-3">Seleziona il nuovo ruolo per l'utente:</p>
                                <div class="role-options">
                                    <!-- Le opzioni dei ruoli verranno inserite qui dinamicamente -->
                                </div>
                            </div>
                            <div class="modal-footer border-0">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>
                                <button type="button" class="btn btn-primary" id="confirmRoleChange">
                                    <i class="fas fa-check me-2"></i>Conferma Cambio
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .user-avatar-sm {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }

                .user-avatar-sm img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .avatar-initials-sm {
                    color: white;
                    font-weight: bold;
                    font-size: 14px;
                }

                .card {
                    transition: transform 0.2s, box-shadow 0.2s;
                }

                .card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
                }

                .table tbody tr {
                    transition: background-color 0.2s;
                }

                .table tbody tr:hover {
                    background-color: rgba(0, 123, 255, 0.05);
                }

                .btn-group .btn {
                    border-radius: 0;
                }

                .btn-group .btn:first-child {
                    border-top-left-radius: 0.25rem;
                    border-bottom-left-radius: 0.25rem;
                }

                .btn-group .btn:last-child {
                    border-top-right-radius: 0.25rem;
                    border-bottom-right-radius: 0.25rem;
                }

                /* Stili per il modale cambio ruolo */
                .role-option {
                    padding: 12px;
                    margin-bottom: 10px;
                    border: 2px solid #e9ecef;
                    border-radius: 8px;
                    transition: all 0.2s;
                    cursor: pointer;
                }

                .role-option:hover {
                    border-color: #0d6efd;
                    background-color: rgba(13, 110, 253, 0.05);
                }

                .role-option.current-role {
                    border-color: #6c757d;
                    background-color: rgba(108, 117, 125, 0.1);
                }

                .role-option input[type="radio"]:checked + label {
                    font-weight: bold;
                }

                .role-option .role-icon {
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .role-option label {
                    cursor: pointer;
                    margin-bottom: 0;
                }
            </style>
        `;
    }
} 