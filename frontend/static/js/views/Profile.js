// File: Profile.js

import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
    constructor() {
        super();
        this.setTitle("Il Mio Profilo - Africa Unita");
        this.userData = null;
        this.role = null;
        this.stats = null;
        this.paymentStatus = null;
        this.fees = [];
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
            const response = await fetch("http://localhost:3000/api/auth/me", {
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

            // Inizializza il modale di modifica del profilo
            const editProfileButton = document.getElementById("edit-profile");
            if (editProfileButton) {
                editProfileButton.addEventListener("click", () => {
                    const modal = document.getElementById("myModal");
                    this.populateForm();
                    const myModal = new bootstrap.Modal(modal);
                    myModal.show();
                });
            }

            // Inizializza il submit del form
            const form = document.getElementById("profile-form");
            if (form) {
                form.addEventListener("submit", (e) => this.handleSubmit(e));
            }

            // Inizializza il cambio dell'avatar
            const avatarButton = document.querySelector(".change-avatar-btn");
            const avatarInput = document.getElementById("avatar-input");
            
            if (avatarButton && avatarInput) {
                avatarButton.addEventListener("click", () => {
                    avatarInput.click();
                });

                avatarInput.addEventListener("change", (e) => this.handleAvatarChange(e));
            }

            // Email verification: da implementare in futuro se necessario

            // Carica stato pagamenti
            await this.loadPaymentStatus();

            this.updateUI();
        } catch (error) {
            console.error("Error initializing profile:", error);
            this.showError("Errore nel caricamento del profilo");
        }
    }

    async loadPaymentStatus() {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('http://localhost:3000/api/fees/my-status', {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.paymentStatus = data.data?.status;
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

    // Rimosso: updateOrderStatus()

    // Rimosso: renderOrders()

    // Rimosso: getStatusBadgeColor()

    // Rimosso: getStatusLabel()

    updateUI() {
        const roleDisplay = this.role === 'admin' ? 'Amministratore' : 'Membro';

        const profileContent = document.getElementById('profile-content');
        if (profileContent) {
            profileContent.innerHTML = `
                <div class="profile-header">
                    <div class="profile-avatar">
                        <img src="${this.userData.avatar || '/static/img/avatar.png'}" alt="Avatar" id="avatar-preview">
                        <div class="avatar-upload">
                            <label for="avatar-upload" class="btn btn-primary">Cambia Avatar</label>
                            <input type="file" id="avatar-upload" accept="image/*" style="display: none;">
                        </div>
                    </div>
                    <div class="profile-info">
                        <h2>${this.userData.name} ${this.userData.surname}</h2>
                        <p class="role-badge">${roleDisplay}</p>
                        <p><i class="fas fa-envelope"></i> ${this.userData.email}</p>
                        <p><i class="fas fa-phone"></i> ${this.userData.phone || 'Non specificato'}</p>
                        <p><i class="fas fa-map-marker-alt"></i> ${this.userData.address || 'Non specificato'}</p>
                    </div>
                </div>

                <div class="profile-stats">
                    ${this.role === 'artigiano' ? `
                        <div class="stat-card">
                            <h3>Statistiche</h3>
                            <p>Prodotti totali: ${this.stats?.total_products || 0}</p>
                            <p>Items totali: ${this.stats?.total_items || 0}</p>
                        </div>
                    ` : ''}
                    ${this.role === 'admin' ? `
                        <div class="stat-card">
                            <h3>Statistiche</h3>
                            <p>Utenti totali: ${this.stats?.total_users || 0}</p>
                            <p>Prodotti totali: ${this.stats?.total_products || 0}</p>
                            <p>Ordini totali: ${this.stats?.total_orders || 0}</p>
                        </div>
                    ` : ''}
                </div>

                ${this.role === 'admin' ? `
                    <div class="admin-panel">
                        <h3>Area Amministratore</h3>
                        <div class="admin-cards">
                            <a href="/admin/users" class="admin-card">
                                <i class="fas fa-users"></i>
                                <h4>Gestione Utenti</h4>
                                <p>Gestisci gli utenti della piattaforma</p>
                            </a>
                            <a href="/admin/stats" class="admin-card">
                                <i class="fas fa-chart-bar"></i>
                                <h4>Statistiche</h4>
                                <p>Visualizza le statistiche della piattaforma</p>
                            </a>
                        </div>
                    </div>
                ` : ''}

                <div class="profile-actions">
                    <button class="btn btn-primary" id="edit-profile">Modifica Profilo</button>
                </div>
            `;
        }
    }

    populateForm() {
        // Popola i campi del form con i dati correnti dell'utente
        document.getElementById("name").value = this.userData.first_name || "";
        document.getElementById("surname").value = this.userData.last_name || "";
        document.getElementById("birthdate").value = this.userData.date_of_birth || "";
        document.getElementById("phone").value = this.userData.phone || "";
        document.getElementById("address").value = this.userData.address || "";
        document.getElementById("email").value = this.userData.email || "";
        document.getElementById("city").value = this.userData.city || "";
        document.getElementById("country_of_origin").value = this.userData.country_of_origin || "";
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
            const response = await fetch("http://localhost:3000/api/users/profile", {
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

            const response = await fetch("/api/profile/avatar", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                // Aggiorna l'immagine dell'avatar immediatamente
                const avatarImg = document.querySelector(".profile-avatar");
                if (avatarImg) {
                    // Crea un URL temporaneo per il file caricato
                    const tempUrl = URL.createObjectURL(file);
                    avatarImg.src = tempUrl;
                    
                    // Pulisci l'URL temporaneo dopo il caricamento dell'immagine
                    avatarImg.onload = () => URL.revokeObjectURL(tempUrl);
                }
                
                // Aggiorna i dati dell'utente
                this.userData.avatar = data.avatarUrl || this.userData.avatar;
                
                // Mostra il messaggio di successo
                alert("Avatar aggiornato con successo!");
            } else {
                alert(data.message || "Errore durante l'aggiornamento dell'avatar");
            }
        } catch (error) {
            console.error("Errore durante l'aggiornamento dell'avatar:", error);
            alert("Si è verificato un errore durante l'aggiornamento dell'avatar");
        }
    }

    // Rimosso: resendVerificationEmail() - endpoint non implementato nel backend

    // Rimosso: viewOrderDetails() - non più necessario per associazione
    
    async viewOrderDetails_removed(orderId) {
        console.log('viewOrderDetails called with orderId:', orderId);
        try {
            const response = await fetch(`/api/orders/${orderId}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            console.log('API Response status:', response.status);
            
            if (!response.ok) {
                throw new Error('Errore nel recupero dei dettagli dell\'ordine');
            }

            const data = await response.json();
            console.log('Order details data:', data);
            
            if (data.error) {
                throw new Error(data.message);
            }

            const order = data.order;
            console.log('Order data:', order);

            // Assicurati che lo stato dell'ordine sia sempre definito
            const orderStatus = order.status || 'pending';
            console.log('Order status:', orderStatus);

            const modal = document.getElementById('orderDetailsModal');
            if (!modal) {
                console.error('Modal element not found');
                return;
            }
            
            const modalContent = modal.querySelector('.modal-body');
            if (!modalContent) {
                console.error('Modal content element not found');
                return;
            }

            // Calcola i totali
            const itemsTotal = order.items.reduce((sum, item) => {
                const itemTotal = item.quantity * item.price * (1 - (item.discount || 0) / 100);
                return sum + itemTotal;
            }, 0);

            const total = parseFloat(order.total_amount);
            const subtotal = itemsTotal;
            const shippingCost = total - subtotal;

            // Formatta il numero d'ordine
            const orderNumber = `ORD-${String(order.id).padStart(6, '0')}`;

            // Formatta le date
            const orderDate = new Date(order.created_at).toLocaleDateString('it-IT', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Calcola la data di consegna stimata (7 giorni dopo l'ordine)
            const deliveryDate = new Date(order.created_at);
            deliveryDate.setDate(deliveryDate.getDate() + 7);
            const formattedDeliveryDate = deliveryDate.toLocaleDateString('it-IT', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Ottieni il colore e l'etichetta dello stato
            const statusColor = this.getStatusBadgeColor(orderStatus);
            const statusLabel = this.getStatusLabel(orderStatus);
            console.log('Status display:', { color: statusColor, label: statusLabel });

            modalContent.innerHTML = `
                <div class="order-details">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h4>Ordine ${orderNumber}</h4>
                        <button class="btn btn-primary" id="downloadInvoiceBtn">
                            <i class="fas fa-download"></i> Scarica Fattura
                        </button>
                    </div>
                    <div class="order-info">
                        <p><strong>Data ordine:</strong> ${orderDate}</p>
                        <p><strong>Data consegna stimata:</strong> ${formattedDeliveryDate}</p>
                        <p><strong>Stato:</strong> <span class="badge bg-${statusColor}">${statusLabel}</span></p>
                    </div>
                    <hr>
                    <h5>Prodotti</h5>
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Prodotto</th>
                                    <th>Quantità</th>
                                    <th>Prezzo</th>
                                    <th>Totale</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${order.items.map(item => {
                                    const itemTotal = item.quantity * item.price * (1 - (item.discount || 0) / 100);
                                    return `
                                    <tr>
                                        <td>
                                            <div class="d-flex align-items-center">
                                                <div>
                                                        <a href="/product/${item.product_id}" class="text-decoration-none">
                                                            ${item.name}
                                                        </a>
                                                        <small class="text-muted d-block">${item.description}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td>${item.quantity}</td>
                                        <td>€${parseFloat(item.price).toFixed(2)}</td>
                                            <td>€${itemTotal.toFixed(2)}</td>
                                    </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    <hr>
                    <h5>Indirizzo di spedizione</h5>
                    ${order.shipping_address ? `
                        <p>${order.shipping_address.full_name}</p>
                        <p>${order.shipping_address.address}</p>
                        <p>${order.shipping_address.city}, ${order.shipping_address.postal_code}</p>
                        <p>Tel: ${order.shipping_address.phone}</p>
                    ` : '<p>Indirizzo non disponibile</p>'}
                    <hr>
                    <h5>Riepilogo</h5>
                    <p><strong>Subtotale:</strong> €${subtotal.toFixed(2)}</p>
                    <p><strong>Spedizione:</strong> €${shippingCost.toFixed(2)}</p>
                    <p><strong>Totale:</strong> €${total.toFixed(2)}</p>
                </div>
            `;

            // Aggiungi l'event listener per il pulsante di download
            const downloadBtn = modalContent.querySelector('#downloadInvoiceBtn');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', () => this.downloadInvoice(orderId));
            }

            const modalInstance = new bootstrap.Modal(modal);
            modalInstance.show();
        } catch (error) {
            console.error('Error showing order details:', error);
            this.showError('Errore nel recupero dei dettagli dell\'ordine');
        }
    }

    async downloadInvoice(orderId) {
        try {
            const response = await fetch(`/api/orders/${orderId}/invoice`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/pdf',
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Errore nel download della fattura');
            }

            // Ottieni il blob del PDF
            const blob = await response.blob();
            
            // Crea un URL per il blob
            const url = window.URL.createObjectURL(blob);
            
            // Crea un link temporaneo per il download
            const link = document.createElement('a');
            link.href = url;
            link.download = `fattura-ORD-${String(orderId).padStart(6, '0')}.pdf`;
        
            // Aggiungi il link al documento e simula il click
            document.body.appendChild(link);
            link.click();
            
            // Pulisci
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading invoice:', error);
            this.showError('Errore nel download della fattura');
        }
    }

    initializeEventListeners() {
        // Rimosso: event listener ordini (non più necessario)
        
        // Add event listener for edit profile button
        const editProfileButton = document.getElementById('edit-profile');
        if (editProfileButton) {
            editProfileButton.addEventListener('click', () => {
                const modal = document.getElementById('myModal');
                this.populateForm();
                const myModal = new bootstrap.Modal(modal);
                myModal.show();
            });
        }

        // Add event listener for profile form submission
        const form = document.getElementById('profile-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Add event listener for avatar change
        const avatarInput = document.getElementById('avatar-input');
        if (avatarInput) {
            avatarInput.addEventListener('change', (e) => this.handleAvatarChange(e));
        }
    }

    async after_render() {
        // Initialize other event listeners and functionality
        this.initializeEventListeners();
    }

    async getHtml() {
        await this.init();
        this.userData.avatar_url = this.userData.avatar_url || "/static/img/avatar.png";
        
        console.log("User data before rendering:", this.userData);
        console.log("Role:", this.userData.role);
        
        // Determina il ruolo visualizzato
        const roleDisplay = this.userData.role === 'admin' ? 'Amministratore' : 'Membro';
        
        return `
        <style>
            .profile-container {
                min-height: 100vh;
                background-color: #f5f7fa;
                padding: 2rem 0;
            }

            .profile-card {
                background-color: #ffffff;
                border-radius: 15px;
                box-shadow: 0 8px 20px rgba(0,0,0,0.1);
                padding: 2.5rem;
                color: #2c3e50;
                margin-bottom: 2rem;
                border: 1px solid #e6e9f0;
            }

            .profile-name {
                color: #2c3e50;
                font-weight: 600;
            }

            .profile-role {
                color: #6c757d;
            }

            .profile-section {
                background: #ffffff;
                padding: 2rem;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                border: 1px solid #e6e9f0;
            }

            .section-title {
                color: #2c3e50;
                font-weight: 600;
                border-bottom: 2px solid #f0f0f0;
            }

            .info-label {
                color: #6c757d;
            }

            .info-value {
                color: #2c3e50;
            }

            .profile-stats {
                display: flex;
                gap: 1.5rem;
                margin: 2rem 0;
                flex-wrap: wrap;
            }

            .stat-card {
                flex: 1;
                min-width: 200px;
                background: #ffffff;
                padding: 1.5rem;
                border-radius: 10px;
                text-align: center;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                transition: transform 0.3s ease;
            }

            .stat-card:hover {
                transform: translateY(-5px);
            }

            .stat-value {
                font-size: 2rem;
                font-weight: bold;
                color: #3498db;
                margin-bottom: 0.5rem;
            }

            .stat-label {
                font-size: 1rem;
                color: #666;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .edit-profile-btn {
                background: #3498db;
                color: white;
                border: none;
                transition: all 0.3s ease;
            }

            .edit-profile-btn:hover {
                background: #2980b9;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(52,152,219,0.2);
            }


            .admin-panel {
                background: #ffffff;
                padding: 2rem;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                border: 1px solid #e6e9f0;
                margin-top: 2rem;
            }

            .admin-card {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 1.5rem;
                margin-bottom: 1rem;
                transition: transform 0.3s ease;
            }

            .admin-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }

            .admin-title {
                color: #2c3e50;
                font-weight: 600;
                margin-bottom: 1.5rem;
                padding-bottom: 0.5rem;
                border-bottom: 2px solid #e6e9f0;
            }
        </style>

        <div class="profile-container">
            <div class="container">
                <!-- Area per messaggi di verifica -->
                <div id="verification-message" class="mt-3 text-center" style="display: none;">
                    <div class="alert alert-info">
                        Per favore verifica il tuo account per sbloccare tutte le funzionalità.
                        <div class="mt-2">
                            <small>Non hai ricevuto l'email di verifica?</small>
                        </div>
                    </div>
                </div>

                <div class="profile-header">
                    <div class="avatar-section">
                        <img src="${this.userData.avatar_url}" alt="Avatar" class="profile-avatar">
                        <input type="file" autocomplete="off" id="avatar-input" class="avatar-upload" accept="image/*">
                        <button class="change-avatar-btn" title="Cambia avatar">
                            <i class="fas fa-camera"></i>
                        </button>
                    </div>
                    
                    <div class="profile-info">
                        <h1 class="profile-name">${this.userData.first_name} ${this.userData.last_name}</h1>
                        <p class="profile-role">${roleDisplay}</p>
                        
                        <div class="profile-actions">
                            <button id="edit-profile" class="profile-btn edit-profile-btn">
                                <i class="fas fa-edit"></i> Modifica Profilo
                            </button>
                        </div>
                    </div>
                </div>

                ${this.userData.role === 'admin' || this.userData.role === 'treasurer' ? `
                    <div class="admin-panel">
                        <h2 class="admin-title">${this.userData.role === 'admin' ? 'Area Amministratore' : 'Area Tesoriere'}</h2>
                        <div class="row">
                            ${this.userData.role === 'treasurer' || this.userData.role === 'admin' ? `
                                <div class="col-md-${this.userData.role === 'admin' ? '4' : '12'}">
                                    <div class="admin-card">
                                        <h5>Gestione Tesoreria</h5>
                                        <p>Gestisci quote associative e fondo</p>
                                        <a href="/treasurer" class="btn btn-success w-100" data-link>
                                            <i class="fas fa-coins"></i> Accedi
                                        </a>
                                    </div>
                                </div>
                            ` : ''}
                            ${this.userData.role === 'admin' ? `
                                <div class="col-md-4">
                                    <div class="admin-card">
                                        <h5>Gestione Utenti</h5>
                                        <p>Gestisci i membri della piattaforma</p>
                                        <a href="/admin/users" class="btn btn-primary w-100" data-link>
                                            <i class="fas fa-users"></i> Accedi
                                        </a>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="admin-card">
                                        <h5>Statistiche</h5>
                                        <p>Visualizza le statistiche dell'associazione</p>
                                        <a href="/admin/stats" class="btn btn-info w-100" data-link>
                                            <i class="fas fa-chart-bar"></i> Accedi
                                        </a>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}

                <div class="profile-sections">
                    <div class="profile-section">
                        <h2 class="section-title">Informazioni Personali</h2>
                        <ul class="info-list">
                            <li class="info-item">
                                <span class="info-label">Email:</span>
                                <span class="info-value">${this.userData.email}</span>
                            </li>
                            <li class="info-item">
                                <span class="info-label">Telefono:</span>
                                <span class="info-value">${this.userData.phone || 'Non specificato'}</span>
                            </li>
                            <li class="info-item">
                                <span class="info-label">Città:</span>
                                <span class="info-value">${this.userData.city || 'Non specificato'}</span>
                            </li>
                            <li class="info-item">
                                <span class="info-label">Paese di origine:</span>
                                <span class="info-value">${this.userData.country_of_origin || 'Non specificato'}</span>
                            </li>
                        </ul>
                    </div>

                    <div class="profile-section mt-4">
                        <h2 class="section-title">Situazione Quote Associative</h2>
                        ${this.paymentStatus ? `
                            <div class="alert ${this.paymentStatus.is_current ? 'alert-success' : 'alert-warning'} mb-3">
                                <div class="d-flex align-items-center">
                                    <i class="fas ${this.paymentStatus.is_current ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-2 fs-4"></i>
                                    <div>
                                        <strong>${this.paymentStatus.is_current ? '✓ Sei in regola!' : '⚠ Pagamenti in sospeso'}</strong>
                                        ${!this.paymentStatus.is_current ? `
                                            <div class="mt-1">
                                                <small>Mesi non pagati: ${this.paymentStatus.months_overdue}</small><br>
                                                <small>Totale da pagare: €${parseFloat(this.paymentStatus.total_unpaid).toFixed(2)}</small>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Mese/Anno</th>
                                        <th>Importo</th>
                                        <th>Stato</th>
                                        <th>Data Pagamento</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.fees.length > 0 ? this.fees.map(fee => `
                                        <tr>
                                            <td>${fee.month}/${fee.year}</td>
                                            <td>€${parseFloat(fee.amount).toFixed(2)}</td>
                                            <td>
                                                <span class="badge ${
                                                    fee.status === 'paid' ? 'bg-success' :
                                                    fee.status === 'overdue' ? 'bg-danger' :
                                                    'bg-warning text-dark'
                                                }">
                                                    ${fee.status === 'paid' ? 'Pagato' : 
                                                      fee.status === 'overdue' ? 'Scaduto' : 
                                                      'In sospeso'}
                                                </span>
                                            </td>
                                            <td>${fee.payment_date ? new Date(fee.payment_date).toLocaleDateString() : '-'}</td>
                                        </tr>
                                    `).join('') : `
                                        <tr>
                                            <td colspan="4" class="text-center text-muted">Nessuna quota registrata</td>
                                        </tr>
                                    `}
                                </tbody>
                            </table>
                        </div>
                        <div class="mt-2">
                            <small class="text-muted">
                                <i class="fas fa-info-circle"></i> Quota mensile: €10,00. 
                                Per effettuare il pagamento, contatta il tesoriere dell'associazione.
                            </small>
                        </div>
                    </div>
                </div>

                <!-- Modal per la modifica del profilo -->
                <div class="modal fade" id="myModal" tabindex="-1" aria-labelledby="modalLabel" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="modalLabel">Modifica Profilo</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <form id="profile-form">
                                    <div class="form-group">
                                        <label for="name" class="form-label">Nome</label>
                                        <input type="text" autocomplete="off" class="form-control" id="name">
                                        <div id="nameError" class="error-message"></div>
                                    </div>
                                    <div class="form-group">
                                        <label for="surname" class="form-label">Cognome</label>
                                        <input type="text" autocomplete="off" class="form-control" id="surname">
                                        <div id="surnameError" class="error-message"></div>
                                    </div>
                                    <div class="form-group">
                                        <label for="email" class="form-label">Email</label>
                                        <input type="email" autocomplete="off" class="form-control" id="email">
                                        <div id="emailError" class="error-message"></div>
                                    </div>
                                    <div class="form-group">
                                        <label for="phone" class="form-label">Telefono</label>
                                        <input type="tel" autocomplete="off" class="form-control" id="phone">
                                        <div id="phoneError" class="error-message"></div>
                                    </div>
                                    <div class="form-group">
                                        <label for="address" class="form-label">Indirizzo</label>
                                        <input type="text" autocomplete="off" class="form-control" id="address">
                                        <div id="addressError" class="error-message"></div>
                                    </div>
                                    <div class="form-group">
                                        <label for="birthdate" class="form-label">Data di nascita</label>
                                        <input type="date" autocomplete="off" class="form-control" id="birthdate">
                                    </div>
                                    <div class="form-group">
                                        <label for="city" class="form-label">Città</label>
                                        <input type="text" autocomplete="off" class="form-control" id="city">
                                    </div>
                                    <div class="form-group">
                                        <label for="country_of_origin" class="form-label">Paese di origine</label>
                                        <input type="text" autocomplete="off" class="form-control" id="country_of_origin">
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>
                                <button type="submit" form="profile-form" class="btn btn-primary">Salva modifiche</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }
}