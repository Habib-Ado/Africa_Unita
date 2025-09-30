import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
    constructor() {
        super();
        this.setTitle("Gestione Utenti - Admin Dashboard");
        this.users = [];
        this.stats = {
            totalUsers: 0,
            verifiedUsers: 0
        };
    }

    async init() {
        try {
            // Verifica l'autenticazione e il ruolo admin
            const authResponse = await fetch('/api/check-session', {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!authResponse.ok) {
                console.log("Auth check failed:", authResponse.status);
                window.location.href = '/login';
                return;
            }

            const authData = await authResponse.json();
            console.log("Auth data:", authData);
            
            if (!authData.authenticated || authData.user.role !== 'admin') {
                console.log("Not authenticated or not admin");
                window.location.href = '/login';
                return;
            }

            await this.loadUsers();
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
            console.log("Fetching users...");
            const response = await fetch('/api/admin/users', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });

            console.log("Response status:", response.status);
            console.log("Response headers:", Object.fromEntries(response.headers.entries()));

            // Log the raw response for debugging
            const responseText = await response.text();
            console.log("Raw response:", responseText);

            if (!response.ok) {
                if (response.status === 401) {
                    console.log("Unauthorized - redirecting to login");
                    window.location.href = '/login';
                    return;
                }
                if (response.status === 403) {
                    console.log("Forbidden - redirecting to home");
                    window.location.href = '/';
                    return;
                }
                throw new Error(`Errore nel recupero degli utenti: ${response.status}`);
            }

            // Try to parse the response as JSON
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error("Failed to parse response as JSON:", e);
                throw new Error("Invalid JSON response from server");
            }

            console.log("Parsed response data:", data);

            if (data.error) {
                throw new Error(data.message || "Errore nel recupero degli utenti");
            }

            if (!data.data || !Array.isArray(data.data)) {
                console.error("Invalid data format received:", data);
                throw new Error("Formato dati non valido");
            }

            this.users = data.data;
            this.calculateStats();
            this.updateUI();
            
            // Force update of statistics display
            document.getElementById('total-users').textContent = this.stats.totalUsers;
            document.getElementById('verified-users').textContent = this.stats.verifiedUsers;
           
        } catch (error) {
            console.error("Errore nel recupero degli utenti:", error);
            this.showNotification("Errore nel caricamento degli utenti", "error");
        }
    }

    calculateStats() {
        this.stats = {
            totalUsers: this.users.length,
            verifiedUsers: this.users.filter(user => user.is_verified === 1).length,
            
        };
    }

    updateUI() {
        // Aggiorna le statistiche
        document.getElementById('total-users').textContent = this.stats.totalUsers;
        document.getElementById('verified-users').textContent = this.stats.verifiedUsers;
       
        // Aggiorna la tabella degli utenti
        const tbody = document.querySelector('#users-table tbody');
        tbody.innerHTML = '';

        this.users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.name} ${user.surname}</td>
                <td>${user.email}</td>
                <td>${user.is_verified ? 'Sì' : 'No'}</td>
                <td>${user.is_blocked ? '<span class="badge bg-danger">Bloccato</span>' : '<span class="badge bg-success">Attivo</span>'}</td>
                <td>
                    <button class="btn btn-info btn-sm view-user" data-user-id="${user.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                     <button class="btn btn-warning btn-sm change-role" data-user-id="${user.id}" data-current-role="${user.role}">
                        <i class="fas fa-user-edit"></i>
                    </button>
                    ${user.is_blocked ? 
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

        // Aggiungi gli event listener per i pulsanti di blocco/sblocco
        document.querySelectorAll('.block-user').forEach(button => {
            button.addEventListener('click', async (e) => {
                const userId = e.target.closest('.block-user').dataset.userId;
                if (confirm('Sei sicuro di voler bloccare questo utente?')) {
                    await this.toggleUserBlock(userId, true);
                }
            });
        });

        document.querySelectorAll('.unblock-user').forEach(button => {
            button.addEventListener('click', async (e) => {
                const userId = e.target.closest('.unblock-user').dataset.userId;
                if (confirm('Sei sicuro di voler sbloccare questo utente?')) {
                    await this.toggleUserBlock(userId, false);
                }
            });
        });

        // Aggiungi gli event listener per gli altri pulsanti
        document.querySelectorAll('.view-user').forEach(button => {
            button.addEventListener('click', async (e) => {
                const userId = e.target.closest('.view-user').dataset.userId;
                await this.showUserDetails(userId);
            });
        });

        document.querySelectorAll('.change-role').forEach(button => {
            button.addEventListener('click', async (e) => {
                const button = e.target.closest('.change-role');
                const userId = button.dataset.userId;
                const currentRole = button.dataset.currentRole;
                const newRole = currentRole === 'members' ? 'moderators' : 'members';
                
                if (confirm(`Sei sicuro di voler cambiare il ruolo dell'utente in ${newRole}?`)) {
                    await this.changeUserRole(userId, newRole);
                }
            });
        });

        document.querySelectorAll('.delete-user').forEach(button => {
            button.addEventListener('click', async (e) => {
                const userId = e.target.closest('.delete-user').dataset.userId;
                if (confirm('Sei sicuro di voler eliminare questo utente?')) {
                    await this.deleteUser(userId);
                }
            });
        });
    }

    initializeEventListeners() {
        // Gestione ricerca utenti
        const searchInput = document.getElementById('user-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                const filteredUsers = this.users.filter(user => 
                    (user.name && user.name.toLowerCase().includes(searchTerm)) ||
                    (user.surname && user.surname.toLowerCase().includes(searchTerm)) ||
                    (user.email && user.email.toLowerCase().includes(searchTerm))
                );
                this.updateUsersTable(filteredUsers);
            });
        }

        // Gestione eliminazione utente
        document.addEventListener('click', async (e) => {
            if (e.target.closest('.delete-user')) {
                const userId = e.target.closest('.delete-user').dataset.userId;
                if (confirm('Sei sicuro di voler eliminare questo utente?')) {
                    await this.deleteUser(userId);
                }
            }
        });

        // Gestione cambio ruolo
        document.addEventListener('click', async (e) => {
            if (e.target.closest('.change-role')) {
                const button = e.target.closest('.change-role');
                const userId = button.dataset.userId;
                const currentRole = button.dataset.currentRole;
                const newRole = currentRole === 'moderators' ? 'members' : 'moderators';
                
                if (confirm(`Sei sicuro di voler cambiare il ruolo dell'utente in ${newRole}?`)) {
                    await this.changeUserRole(userId, newRole);
                }
            }
        });

        // Gestione visualizzazione dettagli utente
        document.addEventListener('click', async (e) => {
            if (e.target.closest('.view-user')) {
                const userId = e.target.closest('.view-user').dataset.userId;
                await this.showUserDetails(userId);
            }
        });
    }

    updateUsersTable(users) {
        const tbody = document.querySelector('#users-table tbody');
        tbody.innerHTML = '';

        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.name} ${user.surname}</td>
                <td>${user.email}</td>
                <td>${user.role === 'moderators' ? 'moderators' : 'members'}</td>
                <td>${user.is_verified ? 'Sì' : 'No'}</td>
                <td>${user.is_blocked ? '<span class="badge bg-danger">Bloccato</span>' : '<span class="badge bg-success">Attivo</span>'}</td>
                <td>
                    <button class="btn btn-info btn-sm view-user" data-user-id="${user.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-warning btn-sm change-role" data-user-id="${user.id}" data-current-role="${user.role}">
                        <i class="fas fa-user-edit"></i>
                    </button>
                    ${user.is_blocked ? 
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
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Errore durante l\'eliminazione dell\'utente');
            }

                this.users = this.users.filter(user => user.id !== userId);
            this.calculateStats();
            this.updateUI();
            this.showNotification("Utente eliminato con successo", "success");
        } catch (error) {
            console.error("Errore durante l'eliminazione dell'utente:", error);
            this.showNotification("Errore durante l'eliminazione dell'utente", "error");
        }
    }

    async changeUserRole(userId, newRole) {
        try {
            const response = await fetch(`/api/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ role: newRole }),
                credentials: 'include'
            });

            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login';
                    return;
                }
                if (response.status === 403) {
                    window.location.href = '/';
                    return;
                }
                throw new Error('Errore durante il cambio di ruolo');
            }

            // Reload the users list after successful role change
            await this.loadUsers();
            this.showNotification("Ruolo utente aggiornato con successo", "success");
        } catch (error) {
            console.error("Errore durante il cambio di ruolo:", error);
            this.showNotification("Errore durante il cambio di ruolo: " + error.message, "error");
        }
    }

    async toggleUserBlock(userId, blocked) {
        try {
            const response = await fetch(`/api/admin/users/${userId}/block`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ blocked: blocked }),
                credentials: 'include'
            });

            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login';
                    return;
                }
                if (response.status === 403) {
                    window.location.href = '/';
                    return;
                }
                throw new Error('Errore durante il cambio di stato di blocco');
            }

            // Update the user's blocked status in the local array
            const userIndex = this.users.findIndex(user => user.id === parseInt(userId));
            if (userIndex !== -1) {
                this.users[userIndex].is_blocked = blocked;
            }

            // Update the UI
            this.updateUI();
            this.showNotification(`Utente ${blocked ? 'bloccato' : 'sbloccato'} con successo`, "success");
        } catch (error) {
            console.error("Errore durante il cambio di stato di blocco:", error);
            this.showNotification("Errore durante il cambio di stato di blocco: " + error.message, "error");
        }
    }

    async showUserDetails(userId) {
        try {
            console.log('Fetching details for user:', userId);
            const response = await fetch(`/api/admin/users/${userId}/details`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));

            // Log the raw response for debugging
            const responseText = await response.text();
            console.log('Raw response:', responseText);

            if (!response.ok) {
                if (response.status === 401) {
                    console.log('Unauthorized - redirecting to login');
                    window.location.href = '/login';
                    return;
                }
                if (response.status === 403) {
                    console.log('Forbidden - redirecting to home');
                    window.location.href = '/';
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Try to parse the response as JSON
            let userDetails;
            try {
                userDetails = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse response as JSON:', e);
                throw new Error('Invalid JSON response from server');
            }

            console.log('Parsed user details:', userDetails);

            if (userDetails.error) {
                throw new Error(userDetails.message || 'Errore nel recupero dei dettagli utente');
            }

            if (!userDetails.data) {
                throw new Error('Formato dati non valido');
            }

            // Popola il modale con i dettagli dell'utente
            const modal = document.getElementById('userDetailsModal');
            const modalContent = modal.querySelector('.modal-body');
            
            modalContent.innerHTML = `
                <div class="user-details">
                    <h4>${userDetails.data.name} ${userDetails.data.surname}</h4>
                    <p><strong>Email:</strong> ${userDetails.data.email}</p>
                    <p><strong>Ruolo:</strong> ${userDetails.data.role === 'moderators' ? 'moderators' : 'members'}</p>
                    <p><strong>Verificato:</strong> ${userDetails.data.is_verified ? 'Sì' : 'No'}</p>
                    <p><strong>Stato:</strong> ${userDetails.data.is_blocked ? '<span class="badge bg-danger">Bloccato</span>' : '<span class="badge bg-success">Attivo</span>'}</p>
                    <p><strong>Data registrazione:</strong> ${new Date(userDetails.data.created_at).toLocaleDateString()}</p>
                    ${userDetails.data.role === 'moderators' ? `
                        <p><strong>Azienda:</strong> ${userDetails.data.company_name || 'Non specificata'}</p>
                    ` : ''}
                    <hr>
                  
                    <hr>
                    <div class="d-flex justify-content-end">
                        <button class="btn ${userDetails.data.is_blocked ? 'btn-success' : 'btn-danger'} btn-sm toggle-block" 
                                data-user-id="${userDetails.data.id}" 
                                data-current-blocked="${userDetails.data.is_blocked}">
                            <i class="fas ${userDetails.data.is_blocked ? 'fa-unlock' : 'fa-lock'}"></i>
                            ${userDetails.data.is_blocked ? 'Sblocca' : 'Blocca'} Utente
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

    async getHtml() {
        return `
            <div class="container mt-4">
                <h1 class="mb-4">Gestione Utenti</h1>
                
                <!-- Statistiche -->
                <div class="row mb-4">
                    <div class="col-md-3">
                        <div class="card bg-primary text-white">
                            <div class="card-body">
                                <h5 class="card-title">Utenti Totali</h5>
                                <p class="card-text display-4" id="total-users">0</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-success text-white">
                            <div class="card-body">
                                <h5 class="card-title">Utenti Verificati</h5>
                                <p class="card-text display-4" id="verified-users">0</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-info text-white">
                            <div class="card-body">
                                <h5 class="card-title">Moderatori</h5>
                                <p class="card-text display-4" id="moderators">0</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-warning text-white">
                            <div class="card-body">
                                <h5 class="card-title">Membri</h5>
                                <p class="card-text display-4" id="members">0</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Barra di ricerca -->
                <div class="row mb-4">
                    <div class="col">
                        <div class="input-group">
                            <input type="text" id="user-search" class="form-control" placeholder="Cerca utenti...">
                            <button class="btn btn-outline-secondary" type="button">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Tabella utenti -->
                <div class="table-responsive">
                    <table class="table table-striped" id="users-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Email</th>
                                <th>Ruolo</th>
                                <th>Verificato</th>
                                <th>Stato</th>
                                <th>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Gli utenti verranno inseriti qui dinamicamente -->
                        </tbody>
                    </table>
                </div>

                <!-- Modale dettagli utente -->
                <div class="modal fade" id="userDetailsModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Dettagli Utente</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <!-- I dettagli dell'utente verranno inseriti qui dinamicamente -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
} 