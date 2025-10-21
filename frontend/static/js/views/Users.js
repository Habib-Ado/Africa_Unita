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
        this.stats = {
            total: 0,
            admins: 0,
            moderators: 0,
            members: 0,
            online: 0
        };
        this.viewMode = 'grid'; // 'grid' o 'list'
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

            const response = await fetch("/api/auth/me", {
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
                
                // Carica i membri automaticamente
                await this.loadUsers();
                
                // Inizializza gli event listener
                this.initializeEventListeners();
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
            const response = await fetch("/api/users", {
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
                this.calculateStats();
                this.updateUsersList();
                this.updateStats();
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }
    
    calculateStats() {
        this.stats.total = this.users.length;
        this.stats.admins = this.users.filter(u => u.role === 'admin').length;
        this.stats.moderators = this.users.filter(u => u.role === 'moderator').length;
        this.stats.members = this.users.filter(u => u.role === 'user').length;
        this.stats.online = Math.floor(this.users.length * 0.3); // Simulazione
    }
    
    updateStats() {
        const elements = {
            total: document.getElementById('stat-total'),
            admins: document.getElementById('stat-admins'),
            moderators: document.getElementById('stat-moderators'),
            members: document.getElementById('stat-members')
        };
        
        // Anima i contatori
        Object.keys(elements).forEach(key => {
            if (elements[key]) {
                this.animateCounter(elements[key], this.stats[key]);
            }
        });
    }
    
    animateCounter(element, target) {
        const duration = 1500;
        const increment = target / (duration / 16);
        let current = 0;
        
        const updateCounter = () => {
            current += increment;
            if (current < target) {
                element.textContent = Math.floor(current);
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = target;
            }
        };
        
        updateCounter();
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
                    <div class="no-results-card">
                        <i class="fas fa-search fa-3x mb-3"></i>
                        <h4>Nessun membro trovato</h4>
                        <p class="text-muted">Prova a modificare i criteri di ricerca</p>
                    </div>
                </div>
            `;
            return;
        }

        const roleColors = {
            'admin': 'role-admin',
            'moderator': 'role-moderator',
            'treasurer': 'role-treasurer',
            'user': 'role-member'
        };

        usersList.innerHTML = this.filteredUsers.map((user, index) => {
            // Costruisci l'URL dell'avatar con cache busting
            const avatarUrl = user.avatar_url 
                ? `${API_BASE}${user.avatar_url}?t=${Date.now()}` 
                : null;
            
            return `
            <div class="col-md-6 col-lg-4 animate-fade-in" style="animation-delay: ${index * 0.05}s">
                <div class="member-card ${roleColors[user.role] || 'role-member'}">
                    <div class="member-card-header">
                        <div class="member-avatar ${roleColors[user.role] || 'role-member'}">
                            ${avatarUrl ? 
                                `<img src="${avatarUrl}" alt="${user.first_name}" style="object-fit: cover;">` :
                                `<span class="avatar-initials">${this.getInitials(user)}</span>`
                            }
                        </div>
                        <span class="role-badge ${roleColors[user.role] || 'role-member'}">
                            ${this.getRoleIcon(user.role)} ${this.getRoleDisplay(user.role)}
                        </span>
                    </div>
                    
                    <div class="member-card-body">
                        <h5 class="member-name">${user.first_name || ''} ${user.last_name || ''}</h5>
                        <p class="member-username">@${user.username}</p>
                        
                        <div class="member-info">
                            <div class="info-item">
                                <i class="fas fa-envelope"></i>
                                <span>${user.email}</span>
                            </div>
                            ${user.city ? `
                                <div class="info-item">
                                    <i class="fas fa-map-marker-alt"></i>
                                    <span>${user.city}</span>
                                </div>
                            ` : ''}
                            ${user.country_of_origin ? `
                                <div class="info-item">
                                    <i class="fas fa-globe-africa"></i>
                                    <span>${user.country_of_origin}</span>
                                </div>
                            ` : ''}
                        </div>
                        </div>
                        
                    <div class="member-card-footer">
                        <button class="btn-member-action btn-primary view-profile-btn" data-user-id="${user.id}">
                            <i class="fas fa-user"></i> Profilo
                            </button>
                        <button class="btn-member-action btn-success send-message-btn" data-user-id="${user.id}" data-username="${user.username}">
                            <i class="fas fa-envelope"></i> Messaggio
                            </button>
                    </div>
                </div>
            </div>
        `}).join('');
    }
    
    getInitials(user) {
        const first = user.first_name?.charAt(0) || user.username?.charAt(0) || '?';
        const last = user.last_name?.charAt(0) || '';
        return (first + last).toUpperCase();
    }
    
    getRoleIcon(role) {
        const icons = {
            'admin': '👑',
            'moderator': '✏️',
            'treasurer': '💰',
            'user': '👤'
        };
        return icons[role] || '👤';
    }

    initializeEventListeners() {
        // Event listener per la ricerca
        const searchInput = document.getElementById('search-users');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterUsers();
            });
        }

        // Event listener per il filtro ruolo
        const roleFilter = document.getElementById('filter-role');
        if (roleFilter) {
            roleFilter.addEventListener('change', (e) => {
                this.filterUsers();
            });
        }

        // Event listener per il pulsante aggiorna
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                refreshBtn.classList.add('spinning');
                this.loadUsers();
                setTimeout(() => refreshBtn.classList.remove('spinning'), 1000);
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
        const searchTerm = document.getElementById('search-users')?.value.toLowerCase() || '';
        const roleFilter = document.getElementById('filter-role')?.value || '';

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
        return `
            <div class="modern-members-container">
                <div class="container py-5">
                    <!-- Hero Header -->
                    <div class="members-hero-header mb-5 animate-fade-in">
                        <div class="hero-content">
                            <h1 class="hero-title">
                                <i class="fas fa-users"></i> 
                                Membri dell'Associazione
                            </h1>
                            <p class="hero-subtitle">Scopri e connettiti con i membri della nostra community</p>
                        </div>
                    </div>
                    
                    <!-- Statistics Cards -->
                    <div class="row g-4 mb-5">
                        <div class="col-md-3">
                            <div class="stat-card-members stat-gradient-1 animate-fade-in">
                                <div class="stat-icon-members">
                                    <i class="fas fa-users"></i>
                                </div>
                                <div class="stat-number-members" id="stat-total">0</div>
                                <div class="stat-label-members">Membri Totali</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card-members stat-gradient-2 animate-fade-in" style="animation-delay: 0.1s">
                                <div class="stat-icon-members">
                                    <i class="fas fa-crown"></i>
                                </div>
                                <div class="stat-number-members" id="stat-admins">0</div>
                                <div class="stat-label-members">Amministratori</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card-members stat-gradient-3 animate-fade-in" style="animation-delay: 0.2s">
                                <div class="stat-icon-members">
                                    <i class="fas fa-user-edit"></i>
                                </div>
                                <div class="stat-number-members" id="stat-moderators">0</div>
                                <div class="stat-label-members">Moderatori</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card-members stat-gradient-4 animate-fade-in" style="animation-delay: 0.3s">
                                <div class="stat-icon-members">
                                    <i class="fas fa-user-friends"></i>
                                </div>
                                <div class="stat-number-members" id="stat-members">0</div>
                                <div class="stat-label-members">Membri Attivi</div>
                            </div>
                            </div>
                        </div>

                    <!-- Search and Filters -->
                    <div class="members-filters mb-4 animate-fade-in" style="animation-delay: 0.4s">
                        <div class="row g-3">
                            <div class="col-lg-6">
                                <div class="search-box">
                                    <i class="fas fa-search search-icon"></i>
                                    <input type="text" 
                                           class="form-control search-input" 
                                           id="search-users" 
                                           placeholder="Cerca per nome, username o email...">
                                </div>
                            </div>
                            <div class="col-lg-3">
                                <select class="form-select filter-select" id="filter-role">
                                    <option value="">🎯 Tutti i ruoli</option>
                                    <option value="admin">👑 Amministratori</option>
                                    <option value="moderator">✏️ Moderatori</option>
                                    <option value="treasurer">💰 Tesorieri</option>
                                    <option value="user">👤 Membri</option>
                                </select>
                            </div>
                            <div class="col-lg-3">
                                <button class="btn-refresh w-100" id="refresh-btn">
                                    <i class="fas fa-sync-alt"></i> Aggiorna
                                </button>
                            </div>
                        </div>
                        </div>

                    <!-- Members Grid -->
                    <div class="row g-4" id="users-list">
                        <!-- Popolato dinamicamente -->
                    </div>
                </div>
            </div>
        `;
    }
}
