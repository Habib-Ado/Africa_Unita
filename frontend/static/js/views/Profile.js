// File: Profile.js

import AbstractView from "./AbstractView.js";
import { API_BASE } from "../index.js";

export default class extends AbstractView {
    constructor() {
        super();
        this.setTitle("Il Mio Profilo - Africa Unita");
        this.userData = null;
        this.role = null;
        this.stats = null;
        this.paymentStatus = null;
        this.fees = [];
        this.userStats = {
            posts: 0,
            comments: 0,
            memberSince: null
        };
        this.meetingStats = null;
        this.penalties = [];
        // Bind the notification methods
        this.showNotification = this.showNotification.bind(this);
        this.showError = this.showError.bind(this);
    }

    // Add notification methods
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.padding = '15px 25px';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '1000';
        notification.style.backgroundColor = type === 'success' ? '#4CAF50' : '#f44336';
        notification.style.color = 'white';
        notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        notification.style.transition = 'opacity 0.3s ease-in-out';

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    async init() {
        try {
            const token = localStorage.getItem('auth_token')
            const response = await fetch("/api/auth/me", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login';
                    return;
                }
                throw new Error("Errore nel recupero del profilo");
            }

            const payload = await response.json();
            const userData = payload.data?.user || payload.user || payload;
            console.log("Profile data received:", userData);

            console.log("Extracted user data:", userData);

            this.userData = userData;
            this.role = userData.role;
            this.stats = payload.data?.statistics || null; // stats non più usate, rimosso e-commerce

            // Rimosso contenuto e-commerce (ordini/artigiani)

            console.log("Processed data:", {
                userData: this.userData,
                role: this.role,
                stats: this.stats
            });

            // Verifica se l'account è verificato
            if (!this.userData.is_verified) {
                const verificationMessage = document.getElementById("verification-message");
                if (verificationMessage) {
                    verificationMessage.style.display = "block";
                }
            }

            // Carica stato pagamenti
            await this.loadPaymentStatus();
            
            // Carica statistiche utente
            await this.loadUserStats();
            
            // Carica statistiche riunioni e multe
            await this.loadMeetingStats();
        } catch (error) {
            console.error("Error initializing profile:", error);
            this.showError("Errore nel caricamento del profilo");
        }
    }

    async loadPaymentStatus() {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/fees/my-status', {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });

            if (response.ok) {
            const data = await response.json();
                this.paymentStatus = data.data?.paymentStatus;
                this.fees = data.data?.fees || [];
            } else {
                // Se il sistema quote non è ancora attivo, ignora l'errore
                console.log('⚠️ Sistema quote non ancora attivo - eseguire: npm run db:add-fees');
                this.paymentStatus = null;
                this.fees = [];
            }
        } catch (error) {
            console.log('⚠️ Sistema quote non disponibile');
            this.paymentStatus = null;
            this.fees = [];
        }
    }
    
    async loadUserStats() {
        try {
            const token = localStorage.getItem('auth_token');
            
            // Carica numero di posts dell'utente
            const postsResponse = await fetch('/api/posts/my', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (postsResponse.ok) {
                const postsData = await postsResponse.json();
                this.userStats.posts = postsData.data?.posts?.length || 0;
            }
            
            // Calcola data di iscrizione
            if (this.userData.created_at) {
                const createdDate = new Date(this.userData.created_at);
                this.userStats.memberSince = createdDate.toLocaleDateString('it-IT', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                });
            }
            
        } catch (error) {
            console.error('Error loading user stats:', error);
        }
    }
    
    async loadMeetingStats() {
        try {
            const token = localStorage.getItem('auth_token');
            const userId = this.userData.id;
            
            const response = await fetch(`/api/meetings/user/${userId}/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.meetingStats = data.data?.stats || null;
                this.penalties = data.data?.penalties || [];
                console.log('Meeting stats loaded:', this.meetingStats);
                console.log('Penalties loaded:', this.penalties);
            }
        } catch (error) {
            console.error('Error loading meeting stats:', error);
            this.meetingStats = null;
            this.penalties = [];
        }
    }

    // Rimosso: updateOrderStatus()
    // Rimosso: renderOrders()
    // Rimosso: getStatusBadgeColor()
    // Rimosso: getStatusLabel()
    // Rimosso: updateUI() - non più necessario con nuovo design

    populateForm() {
        // Popola i campi del form con i dati correnti dell'utente
        document.getElementById("name").value = this.userData.first_name || "";
        document.getElementById("surname").value = this.userData.last_name || "";
        document.getElementById("birthdate").value = this.userData.date_of_birth || "";
        document.getElementById("phone").value = this.userData.phone || "";
        document.getElementById("address").value = this.userData.address || "";
        document.getElementById("email").value = this.userData.email || "";
        document.getElementById("city").value = this.userData.city || "";
        document.getElementById("country_of_origin").value = this.userData.country_of_origin || "Africa";
    }

    validateForm() {
        let isValid = true;
        const errors = {};

        // Validazione nome (obbligatoria)
        const name = document.getElementById("name").value.trim();
        if (!name || name.length < 2 || name.length > 50) {
            errors.name = "Il nome deve essere compreso tra 2 e 50 caratteri";
            isValid = false;
        }

        // Validazione cognome (obbligatoria)
        const surname = document.getElementById("surname").value.trim();
        if (!surname || surname.length < 2 || surname.length > 50) {
            errors.surname = "Il cognome deve essere compreso tra 2 e 50 caratteri";
            isValid = false;
        }

        // Validazione telefono (opzionale)
        const phone = document.getElementById("phone").value.trim();
        if (phone && !/^\+?[0-9]{10,15}$/.test(phone)) {
            errors.phone = "Inserisci un numero di telefono valido";
            isValid = false;
        }

        // Validazione indirizzo (opzionale)
        const address = document.getElementById("address").value.trim();
        if (address && (address.length < 5 || address.length > 100)) {
            errors.address = "L'indirizzo deve essere compreso tra 5 e 100 caratteri";
            isValid = false;
        }

        // Rimosso: validazione company_name (non più necessario)

        // Validazione email (obbligatoria)
        const email = document.getElementById("email").value.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = "Inserisci un indirizzo email valido";
            isValid = false;
        }

        // Pulisci gli errori precedenti
        document.querySelectorAll(".error-message").forEach(el => {
            el.textContent = "";
        });

        // Mostra nuovi errori
        Object.keys(errors).forEach(field => {
            const errorElement = document.getElementById(`${field}Error`);
            if (errorElement) {
                errorElement.textContent = errors[field];
                errorElement.style.color = "red";
            }
        });

        return isValid;
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (!this.validateForm()) {
            return;
        }

        const formData = {
            first_name: document.getElementById("name").value.trim(),
            last_name: document.getElementById("surname").value.trim(),
            date_of_birth: document.getElementById("birthdate").value || null,
            phone: document.getElementById("phone").value.trim() || null,
            address: document.getElementById("address").value.trim() || null,
            city: document.getElementById("city").value.trim() || null,
            country_of_origin: document.getElementById("country_of_origin").value.trim() || null
        };

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch("/api/users/profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            
            if (response.ok) {
                // Chiudi il modale
                const modal = bootstrap.Modal.getInstance(document.getElementById("myModal"));
                modal.hide();

                // Aggiorna i dati dell'utente
                this.userData = { ...this.userData, ...formData };

                // Ricarica la pagina per mostrare i dati aggiornati
                window.location.reload();
            } else {
                alert(data.message || "Errore durante l'aggiornamento del profilo");
            }
        } catch (error) {
            console.error("Errore durante l'aggiornamento del profilo:", error);
            alert("Si è verificato un errore durante l'aggiornamento del profilo");
        }
    }

    async handleAvatarChange(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            alert("Per favore seleziona un'immagine in formato JPG, JPEG o PNG");
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert("L'immagine deve essere inferiore a 2MB");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("avatar", file);

            const token = localStorage.getItem('auth_token');
            const response = await fetch("/api/users/profile/avatar", {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Avatar updated successfully:', data);
                
                // Aggiorna i dati dell'utente PRIMA di aggiornare l'immagine
                this.userData.avatar_url = data.data.avatarUrl || data.data.user?.avatar_url;
                
                // Aggiorna l'immagine dell'avatar immediatamente
                const avatarImg = document.querySelector(".profile-hero-avatar");
                if (avatarImg) {
                    // Usa l'URL restituito dal server con cache busting
                    const avatarUrl = this.userData.avatar_url 
                        ? `${API_BASE}${this.userData.avatar_url}?t=${Date.now()}` 
                        : '/static/img/avatar.png';
                    avatarImg.src = avatarUrl;
                    console.log('Avatar image updated to:', avatarUrl);
                } else {
                    console.warn('Avatar image element not found');
                }
                
                // Mostra il messaggio di successo
                this.showNotification("Avatar aggiornato con successo!");
            } else {
                this.showError(data.message || "Errore durante l'aggiornamento dell'avatar");
            }
        } catch (error) {
            console.error("Errore durante l'aggiornamento dell'avatar:", error);
            alert("Si è verificato un errore durante l'aggiornamento dell'avatar");
        }
    }

    // Rimosso: resendVerificationEmail() - endpoint non implementato nel backend

    // Rimosso: viewOrderDetails() - non più necessario per associazione
    

    initializeEventListeners() {
        // Event listener per il pulsante modifica profilo
        const editProfileButton = document.getElementById('edit-profile');
        if (editProfileButton) {
            editProfileButton.addEventListener('click', () => {
                const modal = document.getElementById('myModal');
                this.populateForm();
                const myModal = new bootstrap.Modal(modal);
                myModal.show();
            });
        }

        // Event listener per il submit del form
        const form = document.getElementById('profile-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Event listener per il cambio avatar
        const avatarButton = document.querySelector('.avatar-change-btn');
        const avatarInput = document.getElementById('avatar-input');
        
        if (avatarButton && avatarInput) {
            console.log('Avatar button and input found, attaching listeners');
            avatarButton.addEventListener('click', () => {
                console.log('Avatar button clicked');
                avatarInput.click();
            });

            avatarInput.addEventListener('change', (e) => {
                console.log('Avatar file selected', e.target.files[0]);
                this.handleAvatarChange(e);
            });
        } else {
            console.log('Avatar button or input not found:', { avatarButton, avatarInput });
        }
    }

    async afterRender() {
        // Inizializza animazioni e contatori
        this.initAnimations();
        this.initStatCounters();
        
        // Inizializza tutti gli event listener
        this.initializeEventListeners();
    }
    
    initAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);
        
        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            observer.observe(el);
        });
    }
    
    initStatCounters() {
        const counters = document.querySelectorAll('.stat-number[data-target]');
        
        counters.forEach(counter => {
            const target = parseInt(counter.dataset.target);
            const duration = 1500;
            const increment = target / (duration / 16);
            let current = 0;
            
            const updateCounter = () => {
                current += increment;
                if (current < target) {
                    counter.textContent = Math.floor(current);
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target;
                }
            };
            
            updateCounter();
        });
    }
    
    async getHtml() {
        await this.init();
        
        console.log("User data before rendering:", this.userData);
        console.log("Role:", this.userData.role);

        // Determina il ruolo visualizzato
        const roleDisplay = this.userData.role === 'admin' ? '👑 Amministratore' : 
                           this.userData.role === 'moderator' ? '✏️ Moderatore' :
                           this.userData.role === 'treasurer' ? '💰 Tesoriere' : '👤 Membro';
        
        const roleClass = this.userData.role === 'admin' ? 'role-admin' :
                         this.userData.role === 'moderator' ? 'role-moderator' :
                         this.userData.role === 'treasurer' ? 'role-treasurer' : 'role-member';
        
        // Costruisci l'URL dell'avatar con API_BASE e fallback
        const avatarUrl = this.userData.avatar_url 
            ? `${API_BASE}${this.userData.avatar_url}?t=${Date.now()}` 
            : '/static/img/avatar.png';
        
        return `
        <div class="modern-profile-container">
            <div class="container py-5">
                <!-- Profile Hero Header -->
                <div class="profile-hero-header animate-on-scroll">
                    <div class="profile-hero-bg ${roleClass}"></div>
                    <div class="profile-hero-content">
                        <div class="profile-avatar-wrapper">
                            <img src="${avatarUrl}" alt="${this.userData.first_name}" class="profile-hero-avatar" style="object-fit: cover;">
                            <input type="file" id="avatar-input" class="d-none" accept="image/*">
                            <button class="avatar-change-btn" title="Cambia avatar">
                                <i class="fas fa-camera"></i>
                            </button>
                        </div>
                        <div class="profile-hero-info">
                            <h1 class="profile-hero-name">${this.userData.first_name} ${this.userData.last_name}</h1>
                            <div class="profile-hero-role">
                                <span class="role-badge ${roleClass}">${roleDisplay}</span>
                    </div>
                            <div class="profile-hero-meta">
                                <span><i class="fas fa-envelope"></i> ${this.userData.email}</span>
                                ${this.userData.phone ? `<span><i class="fas fa-phone"></i> ${this.userData.phone}</span>` : ''}
                                ${this.userData.city ? `<span><i class="fas fa-map-marker-alt"></i> ${this.userData.city}</span>` : ''}
                </div>
                            <button id="edit-profile" class="btn btn-primary btn-lg mt-3">
                                <i class="fas fa-edit"></i> Modifica Profilo
                        </button>
                        </div>
                    </div>
                    </div>
                    
                <!-- User Statistics Cards -->
                <div class="row g-4 mb-5 animate-on-scroll">
                    <div class="col-md-4">
                        <div class="user-stat-card stat-gradient-1">
                            <div class="stat-icon">
                                <i class="fas fa-bullhorn"></i>
                            </div>
                            <div class="stat-number" data-target="${this.userStats.posts}">0</div>
                            <div class="stat-label">Annunci Pubblicati</div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="user-stat-card stat-gradient-2">
                            <div class="stat-icon">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div class="stat-number">${this.userStats.memberSince || 'Nuovo'}</div>
                            <div class="stat-label">Membro da</div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="user-stat-card stat-gradient-3">
                            <div class="stat-icon">
                                <i class="fas ${this.paymentStatus?.payment_status === 'up_to_date' ? 'fa-check-circle' : 'fa-clock'}"></i>
                            </div>
                            <div class="stat-number">${this.paymentStatus?.payment_status === 'up_to_date' ? '✓' : '€10'}</div>
                            <div class="stat-label">${this.paymentStatus?.payment_status === 'up_to_date' ? 'Quote in Regola' : 'Quota Mensile'}</div>
                        </div>
                    </div>
                </div>

                <!-- Admin/Treasurer Panel -->
                ${this.userData.role === 'admin' || this.userData.role === 'moderator' || this.userData.role === 'treasurer' ? `
                    <div class="admin-access-panel animate-on-scroll mb-5">
                        <h3 class="panel-title">
                            <i class="fas fa-crown"></i> 
                            ${this.userData.role === 'admin' ? 'Pannello Amministratore' : 
                              this.userData.role === 'moderator' ? 'Pannello Moderatore' :
                              'Pannello Tesoriere'}
                        </h3>
                        <div class="row g-3">
                            ${this.userData.role === 'moderator' || this.userData.role === 'admin' ? `
                                <div class="col-md-${this.userData.role === 'admin' ? '4' : '6'}">
                                    <a href="/moderator" data-link class="quick-access-card">
                                        <div class="icon-wrapper bg-primary">
                                            <i class="fas fa-edit"></i>
                                        </div>
                                        <h5>Gestione Contenuti</h5>
                                        <p>Pubblica news e comunicazioni</p>
                                    </a>
                                </div>
                            ` : ''}
                            ${this.userData.role === 'treasurer' || this.userData.role === 'admin' ? `
                                <div class="col-md-${this.userData.role === 'admin' ? '4' : '6'}">
                                    <a href="/treasurer" data-link class="quick-access-card">
                                        <div class="icon-wrapper bg-success">
                                            <i class="fas fa-coins"></i>
                                        </div>
                                        <h5>Gestione Tesoreria</h5>
                                        <p>Quote e transazioni</p>
                                        </a>
                            </div>
                        ` : ''}
                        ${this.userData.role === 'admin' ? `
                                <div class="col-md-4">
                                    <a href="/admin/users" data-link class="quick-access-card">
                                        <div class="icon-wrapper bg-danger">
                                            <i class="fas fa-users-cog"></i>
                                        </div>
                                    <h5>Gestione Utenti</h5>
                                        <p>Amministra membri</p>
                                    </a>
                                </div>
                            ` : ''}
                                </div>
                            </div>
                            ` : ''}
                
                <div class="row g-4">
                    <!-- Informazioni Personali -->
                    <div class="col-lg-6">
                        <div class="profile-info-card animate-on-scroll">
                            <div class="card-header-modern">
                                <i class="fas fa-user"></i>
                                <h4>Informazioni Personali</h4>
                            </div>
                            <div class="info-grid">
                                <div class="info-item-modern">
                                    <div class="info-icon"><i class="fas fa-envelope"></i></div>
                                    <div class="info-details">
                                        <div class="info-label-modern">Email</div>
                                        <div class="info-value-modern">${this.userData.email}</div>
                                    </div>
                                </div>
                                <div class="info-item-modern">
                                    <div class="info-icon"><i class="fas fa-phone"></i></div>
                                    <div class="info-details">
                                        <div class="info-label-modern">Telefono</div>
                                        <div class="info-value-modern">${this.userData.phone || 'Non specificato'}</div>
                                    </div>
                                </div>
                                <div class="info-item-modern">
                                    <div class="info-icon"><i class="fas fa-map-marker-alt"></i></div>
                                    <div class="info-details">
                                        <div class="info-label-modern">Città</div>
                                        <div class="info-value-modern">${this.userData.city || 'Non specificato'}</div>
                                    </div>
                                </div>
                                <div class="info-item-modern">
                                    <div class="info-icon"><i class="fas fa-globe-africa"></i></div>
                                    <div class="info-details">
                                        <div class="info-label-modern">Paese di Origine</div>
                                        <div class="info-value-modern">${this.userData.country_of_origin || 'Non specificato'}</div>
                                    </div>
                                </div>
                                ${this.userData.date_of_birth ? `
                                    <div class="info-item-modern">
                                        <div class="info-icon"><i class="fas fa-birthday-cake"></i></div>
                                        <div class="info-details">
                                            <div class="info-label-modern">Data di Nascita</div>
                                            <div class="info-value-modern">${new Date(this.userData.date_of_birth).toLocaleDateString()}</div>
                        </div>
                    </div>
                ` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- Quote Associative -->
                    <div class="col-lg-6">
                        <div class="profile-info-card animate-on-scroll">
                            <div class="card-header-modern">
                                <i class="fas fa-euro-sign"></i>
                                <h4>Quote Associative</h4>
                            </div>
                        ${this.paymentStatus ? `
                                <div class="payment-status-banner ${this.paymentStatus.payment_status === 'up_to_date' ? 'status-ok' : 'status-warning'}">
                                    <i class="fas ${this.paymentStatus.payment_status === 'up_to_date' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
                                    <div>
                                        <strong>${this.paymentStatus.payment_status === 'up_to_date' ? 'Sei in regola!' : 'Pagamenti in sospeso'}</strong>
                                        ${this.paymentStatus.payment_status !== 'up_to_date' ? `
                                            <div class="mt-1 small">
                                                Quote scadute: €${parseFloat(this.paymentStatus.overdue_fees || 0).toFixed(2)}
                        </div>
                    ` : ''}
                                    </div>
                                </div>
                                <div class="payment-summary">
                                    <div class="payment-item">
                                        <span>Totale Quote:</span>
                                        <strong>€${parseFloat(this.paymentStatus.total_fees || 0).toFixed(2)}</strong>
                                    </div>
                                    <div class="payment-item">
                                        <span>Pagate:</span>
                                        <strong class="text-success">€${parseFloat(this.paymentStatus.paid_fees || 0).toFixed(2)}</strong>
                                    </div>
                                    <div class="payment-item">
                                        <span>In Sospeso:</span>
                                        <strong class="text-warning">€${parseFloat(this.paymentStatus.pending_fees || 0).toFixed(2)}</strong>
                                </div>
                                    </div>
                    ` : `
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle"></i>
                                    Sistema quote non attivo
                                </div>
                    `}
                            <div class="mt-3 small text-muted">
                                <i class="fas fa-info-circle"></i> Quota mensile: €10,00. Contatta il tesoriere per pagare.
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Riunioni e Multe -->
                ${this.meetingStats ? `
                    <div class="row g-4 mt-4">
                        <div class="col-lg-6">
                            <div class="profile-info-card animate-on-scroll">
                                <div class="card-header-modern">
                                    <i class="fas fa-calendar-check"></i>
                                    <h4>Presenze Riunioni</h4>
                                </div>
                                <div class="meeting-stats-grid">
                                    <div class="meeting-stat-item stat-success">
                                        <div class="stat-icon-meet"><i class="fas fa-check-circle"></i></div>
                                        <div class="stat-details">
                                            <div class="stat-number-meet">${this.meetingStats.total_present || 0}</div>
                                            <div class="stat-label-meet">Presente</div>
                                        </div>
                                    </div>
                                    <div class="meeting-stat-item stat-danger">
                                        <div class="stat-icon-meet"><i class="fas fa-times-circle"></i></div>
                                        <div class="stat-details">
                                            <div class="stat-number-meet">${this.meetingStats.total_absent || 0}</div>
                                            <div class="stat-label-meet">Assente</div>
                                        </div>
                                    </div>
                                    <div class="meeting-stat-item stat-warning">
                                        <div class="stat-icon-meet"><i class="fas fa-file-medical"></i></div>
                                        <div class="stat-details">
                                            <div class="stat-number-meet">${this.meetingStats.total_justified || 0}</div>
                                            <div class="stat-label-meet">Giustificato</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-lg-6">
                            <div class="profile-info-card animate-on-scroll">
                                <div class="card-header-modern">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    <h4>Multe per Assenze</h4>
                                </div>
                                ${this.penalties.filter(p => p.status === 'pending').length > 0 ? `
                                    <div class="penalties-alert">
                                        <i class="fas fa-exclamation-circle"></i>
                                        <div>
                                            <strong>Hai ${this.penalties.filter(p => p.status === 'pending').length} multa/e pendente/i</strong>
                                            <div class="mt-1 small">
                                                Totale da pagare: €${parseFloat(this.meetingStats.total_penalty_amount || 0).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                    <div class="penalties-list">
                                        ${this.penalties.filter(p => p.status === 'pending').map(penalty => `
                                            <div class="penalty-item">
                                                <div class="penalty-info">
                                                    <div class="penalty-title">Assenze consecutive</div>
                                                    <div class="penalty-dates">
                                                        ${new Date(penalty.meeting1_date).toLocaleDateString('it-IT')} - 
                                                        ${new Date(penalty.meeting2_date).toLocaleDateString('it-IT')}
                                                    </div>
                                                </div>
                                                <div class="penalty-amount">€${parseFloat(penalty.amount).toFixed(2)}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : `
                                    <div class="alert alert-success">
                                        <i class="fas fa-check-circle"></i>
                                        Nessuna multa pendente!
                                    </div>
                                `}
                                <div class="mt-3 small text-muted">
                                    <i class="fas fa-info-circle"></i> 
                                    2 assenze consecutive non giustificate = multa di €10,00
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                <!-- Quick Actions -->
                <div class="quick-actions-grid animate-on-scroll mt-4">
                    <a href="/my-posts" data-link class="action-card action-primary">
                        <i class="fas fa-bullhorn"></i>
                        <span>I Miei Annunci</span>
                    </a>
                    <a href="/my-loans" data-link class="action-card action-info">
                        <i class="fas fa-hand-holding-usd"></i>
                        <span>I Miei Prestiti</span>
                    </a>
                    <a href="/messages" data-link class="action-card action-success">
                        <i class="fas fa-envelope"></i>
                        <span>Messaggi</span>
                    </a>
                    <a href="/users" data-link class="action-card action-info">
                        <i class="fas fa-users"></i>
                        <span>Membri</span>
                    </a>
                    <a href="/" data-link class="action-card action-warning">
                        <i class="fas fa-home"></i>
                        <span>Home</span>
                    </a>
                </div>

                <!-- Modal Modifica Profilo -->
                <div class="modal fade" id="myModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content modern-modal">
                            <div class="modal-header gradient-header">
                                <h5 class="modal-title"><i class="fas fa-edit"></i> Modifica Profilo</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="profile-form">
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <label class="form-label">Nome *</label>
                                            <input type="text" class="form-control modern-input" id="name" required>
                                        <div id="nameError" class="error-message"></div>
                                    </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Cognome *</label>
                                            <input type="text" class="form-control modern-input" id="surname" required>
                                        <div id="surnameError" class="error-message"></div>
                                    </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Email *</label>
                                            <input type="email" class="form-control modern-input" id="email" required readonly>
                                        <div id="emailError" class="error-message"></div>
                                    </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Telefono</label>
                                            <input type="tel" class="form-control modern-input" id="phone">
                                        <div id="phoneError" class="error-message"></div>
                                    </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Città</label>
                                            <input type="text" class="form-control modern-input" id="city">
                                    </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Data di Nascita</label>
                                            <input type="date" class="form-control modern-input" id="birthdate">
                                    </div>
                                        <div class="col-12">
                                            <label class="form-label">Indirizzo</label>
                                            <input type="text" class="form-control modern-input" id="address">
                                            <div id="addressError" class="error-message"></div>
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label">Paese di Origine</label>
                                            <input type="text" class="form-control modern-input" id="country_of_origin">
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>
                                <button type="submit" form="profile-form" class="btn btn-primary btn-lg">
                                    <i class="fas fa-save"></i> Salva Modifiche
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }
}
