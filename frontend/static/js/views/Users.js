import AbstractView from "./AbstractView.js";
import { navigateTo } from "../index.js";

export default class extends AbstractView {
    constructor() {
        super();
        this.setTitle("Membri - Africa Unita");
        this.users = [];
        this.filteredUsers = [];
        this.currentUser = null;
        this.isAuthenticated = null; // null = loading, true = authenticated, false = not authenticated
    }

    async init() {
        try {
            // Verifica autenticazione
            const token = localStorage.getItem('auth_token');
            if (!token) {
                this.isAuthenticated = false;
                navigateTo('/login');
                return;
            }

            const response = await fetch("http://localhost:3000/api/auth/me", {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('Auth response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Auth data:', data);
                this.currentUser = data.data?.user;
                this.isAuthenticated = true;
                console.log('User authenticated:', this.currentUser);
                await this.loadUsers();
                this.initializeEventListeners();
                
                // Forza il re-rendering dopo l'autenticazione
                this.updateView();
            } else {
                console.log('Auth failed, status:', response.status);
                this.isAuthenticated = false;
                navigateTo('/login');
            }
        } catch (error) {
            console.error('Error in init:', error);
            this.isAuthenticated = false;
            navigateTo('/login');
        }
    }

    async loadUsers() {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch("http://localhost:3000/api/users", {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Users loaded:', data);
                this.users = data.data?.users || [];
                this.filteredUsers = [...this.users];
                console.log('Users array length:', this.users.length);
                this.updateUsersList();
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    updateUsersList() {
        console.log('updateUsersList called, filteredUsers:', this.filteredUsers.length);
        const usersList = document.getElementById('users-list');
        if (!usersList) {
            console.log('users-list element not found');
            return;
        }

        if (this.filteredUsers.length === 0) {
            usersList.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info text-center">
                        <i class="fas fa-info-circle"></i>
                        Nessun utente trovato con i criteri di ricerca selezionati.
                    </div>
                </div>
            `;
            return;
        }

        usersList.innerHTML = this.filteredUsers.map(user => `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card h-100">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex align-items-center mb-3">
                            <div class="avatar-circle me-3 d-flex align-items-center justify-content-center">
                                <i class="fas fa-user text-white"></i>
                            </div>
                            <div>
                                <h6 class="card-title mb-0">${user.first_name || ''} ${user.last_name || ''}</h6>
                                <small class="text-muted">@${user.username}</small>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <p class="card-text small">
                                <i class="fas fa-envelope text-muted me-1"></i>
                                ${user.email}
                            </p>
                            <p class="card-text small">
                                <i class="fas fa-user-tag text-muted me-1"></i>
                                ${this.getRoleDisplay(user.role)}
                            </p>
                        </div>
                        
                        <div class="d-grid gap-2 mt-auto">
                            <button class="btn btn-outline-primary btn-sm view-profile-btn" data-user-id="${user.id}">
                                <i class="fas fa-user"></i> Vedi Profilo
                            </button>
                            <button class="btn btn-success btn-sm send-message-btn" data-user-id="${user.id}" data-username="${user.username}">
                                <i class="fas fa-envelope"></i> Invia Messaggio
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    initializeEventListeners() {
        // Event listener per la ricerca
        const searchInput = document.getElementById('userSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterUsers();
            });
        }

        // Event listener per il filtro ruolo
        const roleFilter = document.getElementById('roleFilter');
        if (roleFilter) {
            roleFilter.addEventListener('change', (e) => {
                this.filterUsers();
            });
        }

        // Event listener per il pulsante aggiorna
        const refreshBtn = document.getElementById('refreshUsersBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadUsers();
            });
        }

        // Event listener per il pulsante messaggi
        const messagesBtn = document.getElementById('btnMessages');
        if (messagesBtn) {
            messagesBtn.addEventListener('click', () => {
                navigateTo('/messages');
            });
        }

        // Event delegation per i pulsanti dinamici
        document.addEventListener('click', (e) => {
            if (e.target.closest('.view-profile-btn')) {
                const userId = e.target.closest('.view-profile-btn').dataset.userId;
                navigateTo(`/profile/${userId}`);
            }
            
            if (e.target.closest('.send-message-btn')) {
                const userId = e.target.closest('.send-message-btn').dataset.userId;
                const username = e.target.closest('.send-message-btn').dataset.username;
                navigateTo(`/messages?user=${userId}`);
            }
        });
    }

    filterUsers() {
        const searchTerm = document.getElementById('userSearch')?.value.toLowerCase() || '';
        const roleFilter = document.getElementById('roleFilter')?.value || '';

        // Filtra l'utente corrente dalla lista
        this.filteredUsers = this.users.filter(user => {
            // Filtro per testo (nome, cognome, username, email)
            const matchesSearch = !searchTerm || 
                user.first_name?.toLowerCase().includes(searchTerm) ||
                user.last_name?.toLowerCase().includes(searchTerm) ||
                user.username?.toLowerCase().includes(searchTerm) ||
                user.email?.toLowerCase().includes(searchTerm);

            // Filtro per ruolo
            const matchesRole = !roleFilter || user.role === roleFilter;

            return user.id !== this.currentUser?.id && matchesSearch && matchesRole;
        });

        // Aggiorna la visualizzazione
        this.updateUsersList();
    }

    getRoleDisplay(role) {
        const roleMap = {
            'admin': 'Amministratore',
            'treasurer': 'Tesoriere',
            'moderator': 'Moderatore',
            'user': 'Membro'
        };
        return roleMap[role] || 'Membro';
    }

    async updateView() {
        console.log('updateView called, isAuthenticated:', this.isAuthenticated);
        // Aggiorna il contenuto della pagina dopo l'autenticazione
        const app = document.getElementById('app');
        if (app) {
            const html = await this.getHtml();
            console.log('HTML generated, length:', html.length);
            app.innerHTML = html;
            // Re-inizializza gli event listener dopo il re-rendering
            this.initializeEventListeners();
        }
    }

    async getHtml() {
        // Se l'autenticazione è in corso (null), mostra loading
        if (this.isAuthenticated === null) {
            return `
                <div class="container mt-4">
                    <div class="text-center">
                        <div class="spinner-border" role="status">
                            <span class="visually-hidden">Caricamento...</span>
                        </div>
                        <p class="mt-2">Verifica autenticazione...</p>
                    </div>
                </div>
            `;
        }
        
        // Se l'autenticazione è fallita (false), mostra errore
        if (this.isAuthenticated === false) {
            return `
                <div class="container mt-4">
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        Devi essere autenticato per vedere questa pagina.
                    </div>
                </div>
            `;
        }

        return `
            <style>
                .avatar-circle {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 1.2rem;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .card {
                    transition: transform 0.2s ease-in-out;
                }
                .card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                }
            </style>
            <div class="container mt-4">
                <div class="row">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <h1 class="h3 mb-0">
                                <i class="fas fa-users text-primary"></i> Membri dell'Associazione
                            </h1>
                            <div>
                                <button class="btn btn-outline-secondary" id="btnMessages">
                                    <i class="fas fa-comments"></i> Messaggi
                                </button>
                            </div>
                        </div>

                        <!-- Barra di ricerca -->
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <div class="input-group">
                                    <span class="input-group-text">
                                        <i class="fas fa-search"></i>
                                    </span>
                                    <input type="text" class="form-control" id="search-users" placeholder="Cerca per nome, username o email...">
                                </div>
                            </div>
                            <div class="col-md-3">
                                <select class="form-select" id="filter-role">
                                    <option value="">Tutti i ruoli</option>
                                    <option value="user">Membro</option>
                                    <option value="treasurer">Tesoriere</option>
                                    <option value="admin">Amministratore</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <button class="btn btn-outline-primary w-100" id="refreshUsersBtn">
                                    <i class="fas fa-sync"></i> Aggiorna
                                </button>
                            </div>
                        </div>

                        <!-- Lista utenti -->
                        <div class="row" id="users-list">
                            <!-- Popolato dinamicamente -->
                        </div>

                    </div>
                </div>
            </div>
        `;
    }
}
