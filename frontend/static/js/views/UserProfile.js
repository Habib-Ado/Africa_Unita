import AbstractView from "./AbstractView.js";
import { navigateTo } from "../index.js";

export default class extends AbstractView {
    constructor() {
        super();
        this.setTitle("Profilo Utente - Africa Unita");
        this.userId = null;
        this.userData = null;
        this.currentUser = null;
        this.isAuthenticated = false;
    }

    async init() {
        try {
            // Verifica autenticazione
            const token = localStorage.getItem('auth_token');
            if (!token) {
                navigateTo('/login');
                return;
            }

            const response = await fetch("http://localhost:3000/api/auth/me", {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.data?.user;
                this.isAuthenticated = true;
                
                // Ottieni l'ID utente dall'URL
                const pathParts = window.location.pathname.split('/');
                this.userId = pathParts[2]; // /profile/123 -> 123
                
                if (this.userId) {
                    await this.loadUserProfile();
                }
            } else {
                navigateTo('/login');
            }
        } catch (error) {
            console.error('Error in init:', error);
            navigateTo('/login');
        }
    }

    async loadUserProfile() {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`http://localhost:3000/api/users/${this.userId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.userData = data.data?.user;
                this.setTitle(`${this.userData?.first_name} ${this.userData?.last_name} - Profilo`);
                this.updateProfileDisplay();
            } else {
                document.querySelector("#app").innerHTML = `
                    <div class="container mt-4">
                        <div class="alert alert-danger">
                            <i class="fas fa-exclamation-triangle"></i>
                            Utente non trovato.
                        </div>
                        <button class="btn btn-primary" onclick="navigateTo('/users')">
                            <i class="fas fa-arrow-left"></i> Torna alla Lista
                        </button>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    updateProfileDisplay() {
        if (!this.userData) return;

        const profileContainer = document.getElementById('profile-container');
        if (!profileContainer) return;

        profileContainer.innerHTML = `
            <div class="row">
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-body text-center">
                            <img src="/static/img/avatar.png" alt="Avatar" class="rounded-circle mb-3" width="120" height="120">
                            <h4 class="card-title">${this.userData.first_name || ''} ${this.userData.last_name || ''}</h4>
                            <p class="text-muted">@${this.userData.username}</p>
                            
                            <div class="mb-3">
                                <span class="badge ${this.userData.role === 'admin' ? 'bg-danger' : 
                                                      this.userData.role === 'treasurer' ? 'bg-warning text-dark' : 
                                                      'bg-primary'} fs-6">
                                    ${this.userData.role === 'admin' ? 'Amministratore' : 
                                      this.userData.role === 'treasurer' ? 'Tesoriere' : 
                                      'Membro'}
                                </span>
                            </div>

                            <div class="d-grid gap-2">
                                <button class="btn btn-success" onclick="sendMessage(${this.userData.id}, '${this.userData.username}')">
                                    <i class="fas fa-envelope"></i> Invia Messaggio
                                </button>
                                <button class="btn btn-outline-secondary" onclick="navigateTo('/users')">
                                    <i class="fas fa-arrow-left"></i> Torna alla Lista
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">
                                <i class="fas fa-info-circle"></i> Informazioni Personali
                            </h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-sm-6 mb-3">
                                    <strong>Nome:</strong><br>
                                    <span class="text-muted">${this.userData.first_name || 'Non specificato'}</span>
                                </div>
                                <div class="col-sm-6 mb-3">
                                    <strong>Cognome:</strong><br>
                                    <span class="text-muted">${this.userData.last_name || 'Non specificato'}</span>
                                </div>
                                <div class="col-sm-6 mb-3">
                                    <strong>Username:</strong><br>
                                    <span class="text-muted">${this.userData.username}</span>
                                </div>
                                <div class="col-sm-6 mb-3">
                                    <strong>Email:</strong><br>
                                    <span class="text-muted">${this.userData.email}</span>
                                </div>
                                <div class="col-sm-6 mb-3">
                                    <strong>Telefono:</strong><br>
                                    <span class="text-muted">${this.userData.phone || 'Non specificato'}</span>
                                </div>
                                <div class="col-sm-6 mb-3">
                                    <strong>Paese di origine:</strong><br>
                                    <span class="text-muted">${this.userData.country_of_origin || 'Non specificato'}</span>
                                </div>
                                <div class="col-sm-6 mb-3">
                                    <strong>Membro dal:</strong><br>
                                    <span class="text-muted">${new Date(this.userData.created_at).toLocaleDateString('it-IT')}</span>
                                </div>
                                <div class="col-sm-6 mb-3">
                                    <strong>Stato:</strong><br>
                                    <span class="badge ${this.userData.status === 'active' ? 'bg-success' : 'bg-secondary'}">
                                        ${this.userData.status === 'active' ? 'Attivo' : 'Inattivo'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Sezione quote associative (solo per tesorieri e admin) -->
                    ${this.currentUser?.role === 'treasurer' || this.currentUser?.role === 'admin' ? `
                        <div class="card mt-3">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="fas fa-euro-sign"></i> Situazione Quote Associative
                                </h5>
                            </div>
                            <div class="card-body">
                                <div id="payment-status-${this.userData.id}">
                                    <div class="text-center">
                                        <div class="spinner-border" role="status">
                                            <span class="visually-hidden">Caricamento...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Carica lo stato dei pagamenti se l'utente corrente è tesoriere o admin
        if (this.currentUser?.role === 'treasurer' || this.currentUser?.role === 'admin') {
            this.loadPaymentStatus();
        }

        // Aggiungi funzioni globali
        window.sendMessage = (userId, username) => {
            navigateTo(`/messages?to=${userId}&username=${encodeURIComponent(username)}`);
        };
    }

    async loadPaymentStatus() {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`http://localhost:3000/api/fees/user-status/${this.userData.id}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const status = data.data?.status;
                const fees = data.data?.fees || [];

                const statusContainer = document.getElementById(`payment-status-${this.userData.id}`);
                if (statusContainer) {
                    statusContainer.innerHTML = `
                        <div class="row">
                            <div class="col-md-6">
                                <div class="alert ${status?.payment_status === 'overdue' ? 'alert-danger' : 
                                                       status?.payment_status === 'pending' ? 'alert-warning' : 
                                                       'alert-success'}">
                                    <h6 class="alert-heading">
                                        <i class="fas fa-${status?.payment_status === 'overdue' ? 'exclamation-triangle' : 
                                                             status?.payment_status === 'pending' ? 'clock' : 
                                                             'check-circle'}"></i>
                                        Stato Pagamenti
                                    </h6>
                                    <strong>${status?.payment_status === 'overdue' ? 'In Ritardo' : 
                                              status?.payment_status === 'pending' ? 'In Sospeso' : 
                                              status?.payment_status === 'up_to_date' ? 'In Regola' : 
                                              'Nessuna Quota'}</strong>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card bg-light">
                                    <div class="card-body">
                                        <h6>Riepilogo</h6>
                                        <p class="mb-1"><strong>Totale quote:</strong> €${(status?.total_fees || 0).toFixed(2)}</p>
                                        <p class="mb-1"><strong>Pagate:</strong> €${(status?.paid_fees || 0).toFixed(2)}</p>
                                        <p class="mb-1"><strong>In sospeso:</strong> €${(status?.pending_fees || 0).toFixed(2)}</p>
                                        <p class="mb-0"><strong>Scadute:</strong> €${(status?.overdue_fees || 0).toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        ${fees.length > 0 ? `
                            <div class="mt-3">
                                <h6>Quote Recenti</h6>
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
                                            ${fees.slice(0, 6).map(fee => `
                                                <tr>
                                                    <td>${(() => {
                                                        const date = new Date(fee.due_date);
                                                        const month = (date.getMonth() + 1).toString().padStart(2, '0');
                                                        const year = date.getFullYear();
                                                        return `${month}/${year}`;
                                                    })()}</td>
                                                    <td>€${parseFloat(fee.amount).toFixed(2)}</td>
                                                    <td>
                                                        <span class="badge ${fee.status === 'paid' ? 'bg-success' : 
                                                                         fee.status === 'overdue' ? 'bg-danger' : 
                                                                         'bg-warning text-dark'}">
                                                            ${fee.status === 'paid' ? 'Pagato' : 
                                                              fee.status === 'overdue' ? 'Scaduto' : 
                                                              'In sospeso'}
                                                        </span>
                                                    </td>
                                                    <td>${fee.paid_date ? new Date(fee.paid_date).toLocaleDateString() : '-'}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ` : ''}
                    `;
                }
            }
        } catch (error) {
            console.error('Error loading payment status:', error);
        }
    }

    async getHtml() {
        if (!this.isAuthenticated) {
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
            <div class="container mt-4">
                <div id="profile-container">
                    <div class="text-center">
                        <div class="spinner-border" role="status">
                            <span class="visually-hidden">Caricamento...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
