// File: Profile.js

import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
    constructor() {
        super();
        this.setTitle("Il Mio Profilo - Artigianato Online");
        this.userData = null;
        this.role = null;
        this.stats = null;
        // Bind the notification methods
        this.showNotification = this.showNotification.bind(this);
        this.showError = this.showError.bind(this);
        this.viewOrderDetails = this.viewOrderDetails.bind(this);
        this.downloadInvoice = this.downloadInvoice.bind(this);
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
            this.stats = data.statistics;

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

            // Aggiungi il pulsante di reinvio email di verifica se l'utente non è verificato
            if (!this.userData.is_verified) {
                const resendButton = document.createElement("button");
                resendButton.className = "btn btn-link";
                resendButton.textContent = "Reinvia email di verifica";
                resendButton.onclick = () => this.resendVerificationEmail();
                
                const verificationMessage = document.getElementById("verification-message");
                if (verificationMessage) {
                    verificationMessage.querySelector(".alert").appendChild(resendButton);
                }
            }

            this.updateUI();
        } catch (error) {
            console.error("Error initializing profile:", error);
            this.showError("Errore nel caricamento del profilo");
        }
    }

    // Rimosso: loadArtisanOrders()

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
        document.getElementById("name").value = this.userData.name || "";
        document.getElementById("surname").value = this.userData.surname || "";
        document.getElementById("birthdate").value = this.userData.birthdate || "";
        document.getElementById("phone").value = this.userData.phone || "";
        document.getElementById("address").value = this.userData.address || "";
        document.getElementById("email").value = this.userData.email || "";
        
        // Gestisci il campo company_name solo per gli artigiani
        const companyNameField = document.getElementById("company-name-field");
        const companyNameInput = document.getElementById("company_name");

        if (this.userData.role === "artigiano") {
            if (companyNameField && companyNameInput) {
                companyNameField.style.display = "block";
                companyNameInput.value = this.userData.company_name || "";
            }
        }
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

        // Validazione nome azienda (obbligatoria solo per gli artigiani)
        if (this.userData.role === "artigiano") {
            const companyName = document.getElementById("company_name").value.trim();
            if (!companyName || companyName.length < 2 || companyName.length > 100) {
                errors.company_name = "Il nome dell'azienda è obbligatorio e deve essere compreso tra 2 e 100 caratteri";
                isValid = false;
            }
        }

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
            name: document.getElementById("name").value.trim(),
            surname: document.getElementById("surname").value.trim(),
            birthdate: document.getElementById("birthdate").value || null,
            phone: document.getElementById("phone").value.trim() || null,
            address: document.getElementById("address").value.trim() || null,
            email: document.getElementById("email").value.trim(),
            company_name: this.userData.role === "artigiano" ? 
                         document.getElementById("company_name").value.trim() : null
        };

        try {
            const response = await fetch("/api/profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
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

                // Aggiorna gli elementi dell'interfaccia utente
                document.querySelector(".profile-name").textContent = `${formData.name} ${formData.surname}`;
                
                // Aggiorna l'elenco delle informazioni
                const infoList = document.querySelector(".info-list");
                if (infoList) {
                    const emailValue = infoList.querySelector("li:nth-child(1) .info-value");
                    const phoneValue = infoList.querySelector("li:nth-child(2) .info-value");
                    const addressValue = infoList.querySelector("li:nth-child(3) .info-value");
                    
                    if (emailValue) emailValue.textContent = formData.email;
                    if (phoneValue) phoneValue.textContent = formData.phone || 'Non specificato';
                    if (addressValue) addressValue.textContent = formData.address || 'Non specificato';

                    // Aggiorna l'azienda se l'utente è artigiano
                    if (this.userData.role === 'artigiano') {
                        const companyElement = infoList.querySelector("li:nth-child(4)");
                        if (companyElement) {
                            companyElement.querySelector(".info-value").textContent = formData.company_name || 'Non specificato';
                        }
                    }
                }

                // Mostra il messaggio di successo
                alert("Profilo aggiornato con successo!");
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

    // Aggiungi il metodo per reinviare l'email di verifica se l'utente non è verificato
    async resendVerificationEmail() {
        try {
            const response = await fetch("/api/resend-verification", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            });

            const data = await response.json();
            
            if (response.ok) {
                alert("Email di verifica reinviata con successo!");
            } else {
                alert(data.message || "Errore durante l'invio dell'email di verifica");
            }
        } catch (error) {
            console.error("Errore durante l'invio dell'email di verifica:", error);
            alert("Si è verificato un errore durante l'invio dell'email di verifica");
        }
    }

    async viewOrderDetails(orderId) {
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
        // Add event listeners for order detail buttons
        document.querySelectorAll('.view-order').forEach(button => {
            button.addEventListener('click', (e) => {
                const orderId = e.target.closest('.view-order').dataset.orderId;
                this.viewOrderDetails(orderId);
            });
        });

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

        // Aggiungi event listeners per gli ordini
        document.querySelectorAll('.update-status').forEach(button => {
            button.addEventListener('click', (e) => {
                const orderId = e.target.closest('.update-status').dataset.orderId;
                const newStatus = e.target.closest('.update-status').dataset.status;
                this.updateOrderStatus(orderId, newStatus);
            });
        });
    }

    async after_render() {
        // Initialize other event listeners and functionality
        this.initializeEventListeners();
    }

    async getHtml() {
        await this.init();
        this.userData.avatar = this.userData.avatar || "/static/img/avatar.png";
        
        console.log("User data before rendering:", this.userData);
        console.log("Role:", this.userData.role);
        console.log("Statistics:", this.stats);
        
        // Determina se mostrare la sezione ordini
        const showOrders = this.userData.role && this.userData.role.toLowerCase() !== "artigiano";

        // Prepara le statistiche per gli artigiani e admin
        const showStatistics = this.userData.role === 'artigiano' || this.userData.role === 'admin';
        const stats = this.stats || { 
            total_products: 0, 
            total_items: 0,
            total_users: 0,
            total_orders: 0
        };

        // Determina il ruolo visualizzato
        let roleDisplay = 'Cliente';
        if (this.userData.role === 'artigiano') {
            roleDisplay = 'Artigiano';
        } else if (this.userData.role === 'admin') {
            roleDisplay = 'Amministratore';
        }
        
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

            .manage-products-btn {
                background: #2ecc71;
                color: white;
                border: none;
                transition: all 0.3s ease;
            }

            .manage-products-btn:hover {
                background: #27ae60;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(46,204,113,0.2);
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
                        <img src="${this.userData.avatar}" alt="Avatar" class="profile-avatar">
                        <input type="file" autocomplete="off" id="avatar-input" class="avatar-upload" accept="image/*">
                        <button class="change-avatar-btn" title="Cambia avatar">
                            <i class="fas fa-camera"></i>
                        </button>
                    </div>
                    
                    <div class="profile-info">
                        <h1 class="profile-name">${this.userData.name} ${this.userData.surname}</h1>
                        <p class="profile-role">${roleDisplay}</p>
                        
                        <div class="profile-actions">
                            <button id="edit-profile" class="profile-btn edit-profile-btn">
                                <i class="fas fa-edit"></i> Modifica Profilo
                            </button>
                            ${this.userData.role === 'artigiano' ? `
                                <a href="/my-products" class="profile-btn manage-products-btn" data-link>
                                    <i class="fas fa-box"></i> Gestisci Prodotti
                                </a>
                            ` : ''}
                        </div>
                    </div>
                </div>

                ${showStatistics ? `
                    <div class="profile-stats">
                        ${this.userData.role === 'artigiano' ? `
                            <div class="stat-card">
                                <div class="stat-value">${stats.total_products}</div>
                                <div class="stat-label">Prodotti pubblicati</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${stats.total_items}</div>
                                <div class="stat-label">Articoli totali</div>
                            </div>
                        ` : ''}
                        ${this.userData.role === 'admin' ? `
                            <div class="stat-card">
                                <div class="stat-value">${stats.total_users}</div>
                                <div class="stat-label">Utenti totali</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${stats.total_products}</div>
                                <div class="stat-label">Prodotti totali</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${stats.total_orders}</div>
                                <div class="stat-label">Ordini totali</div>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                ${this.userData.role === 'admin' ? `
                    <div class="admin-panel">
                        <h2 class="admin-title">Pannello Amministratore</h2>
                        <div class="row">
                            <div class="col-md-3">
                                <div class="admin-card">
                                    <h5>Gestione Utenti</h5>
                                    <p>Gestisci gli utenti della piattaforma</p>
                                    <a href="/admin/users" class="btn btn-primary w-100" data-link>
                                        <i class="fas fa-users"></i> Accedi
                                    </a>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="admin-card">
                                    <h5>Gestione Prodotti</h5>
                                    <p>Gestisci i prodotti della piattaforma</p>
                                    <a href="/admin/products" class="btn btn-success w-100" data-link>
                                        <i class="fas fa-box"></i> Accedi
                                    </a>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="admin-card">
                                    <h5>Gestione Ordini</h5>
                                    <p>Gestisci gli ordini della piattaforma</p>
                                    <a href="/admin/orders" class="btn btn-info w-100" data-link>
                                        <i class="fas fa-shopping-cart"></i> Accedi
                                    </a>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="admin-card">
                                    <h5>Statistiche</h5>
                                    <p>Visualizza le statistiche della piattaforma</p>
                                    <a href="/admin/stats" class="btn btn-warning w-100" data-link>
                                        <i class="fas fa-chart-bar"></i> Accedi
                                    </a>
                                </div>
                            </div>
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
                                <span class="info-label">Indirizzo:</span>
                                <span class="info-value">${this.userData.address || 'Non specificato'}</span>
                            </li>
                        </ul>
                    </div>

                    

                    ${this.userData.role === 'artigiano' ? `
                        <div class="profile-section">
                            <h2 class="section-title">Statistiche Artigiano</h2>
                            <div class="row">
                                <div class="col-md-3">
                                    <div class="stat-card">
                                        <div class="stat-value">${stats.total_products || 0}</div>
                                        <div class="stat-label">Prodotti pubblicati</div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="stat-card">
                                        <div class="stat-value">${stats.total_orders || 0}</div>
                                        <div class="stat-label">Ordini ricevuti</div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="stat-card">
                                        <div class="stat-value">€${stats.total_revenue || 0}</div>
                                        <div class="stat-label">Ricavo totale</div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="stat-card">
                                        <div class="stat-value">${stats.average_rating || 0}</div>
                                        <div class="stat-label">Valutazione media</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="profile-section">
                            <h2 class="section-title">Gestione Ordini</h2>
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>ID Ordine</th>
                                            <th>Data</th>
                                            <th>Cliente</th>
                                            <th>Prodotti</th>
                                            <th>Totale</th>
                                            <th>Stato</th>
                                            <th>Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.orders.map(order => `
                                            <tr>
                                                <td>#${order.id}</td>
                                                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                                                <td>${order.customer_name}</td>
                                                <td>${order.items_count} prodotti</td>
                                                <td>€${order.total.toFixed(2)}</td>
                                                <td>
                                                    <span class="badge bg-${this.getStatusBadgeColor(order.status)}">
                                                        ${this.getStatusLabel(order.status)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button class="btn btn-sm btn-info view-order" data-order-id="${order.id}">
                                                        <i class="fas fa-eye"></i> Dettagli
                                                    </button>
                                                    ${order.status === 'pending' ? `
                                                        <button class="btn btn-sm btn-success update-status" data-order-id="${order.id}" data-status="processing">
                                                            <i class="fas fa-check"></i> Accetta
                                                        </button>
                                                        <button class="btn btn-sm btn-danger update-status" data-order-id="${order.id}" data-status="cancelled">
                                                            <i class="fas fa-times"></i> Rifiuta
                                                        </button>
                                                    ` : ''}
                                                    ${order.status === 'processing' ? `
                                                        <button class="btn btn-sm btn-primary update-status" data-order-id="${order.id}" data-status="shipped">
                                                            <i class="fas fa-truck"></i> Spedisci
                                                        </button>
                                                    ` : ''}
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ` : ''}
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
                                    ${this.userData.role === 'artigiano' ? `
                                        <div class="form-group" id="company-name-field">
                                            <label for="company_name" class="form-label">Nome Azienda</label>
                                            <input type="text" class="form-control" id="company_name">
                                            <div id="company_nameError" class="error-message"></div>
                                        </div>
                                    ` : ''}
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>
                                <button type="submit" form="profile-form" class="btn btn-primary">Salva modifiche</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modal per i dettagli dell'ordine -->
                <div class="modal fade" id="orderDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Dettagli Ordine</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <!-- I dettagli dell'ordine verranno inseriti qui dinamicamente -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }
}