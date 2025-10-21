import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
    constructor() {
        super();
        this.setTitle("I Miei Prestiti - Africa Unita");
        this.loans = [];
        this.loanStats = null;
    }

    async init() {
        try {
            await Promise.all([
                this.loadMyLoans(),
                this.loadLoanStats()
            ]);
            
            this.initializeEventListeners();
        } catch (error) {
            console.error('Error initializing my loans:', error);
        }
    }

    async loadMyLoans() {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/loans/my', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.loans = data.data?.loans || [];
                this.updateLoansDisplay();
            }
        } catch (error) {
            console.error('Error loading my loans:', error);
        }
    }

    async loadLoanStats() {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/loans/my/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.loanStats = data.data?.stats;
                this.updateStatsDisplay();
            }
        } catch (error) {
            console.error('Error loading loan stats:', error);
        }
    }

    updateStatsDisplay() {
        if (!this.loanStats) return;

        const totalBorrowedEl = document.getElementById('total-borrowed');
        const totalRepaidEl = document.getElementById('total-repaid');
        const totalRemainingEl = document.getElementById('total-remaining');
        const activeLoansEl = document.getElementById('active-loans-count');

        if (totalBorrowedEl) totalBorrowedEl.textContent = `€${parseFloat(this.loanStats.total_borrowed || 0).toFixed(2)}`;
        if (totalRepaidEl) totalRepaidEl.textContent = `€${parseFloat(this.loanStats.total_repaid || 0).toFixed(2)}`;
        if (totalRemainingEl) totalRemainingEl.textContent = `€${parseFloat(this.loanStats.total_remaining || 0).toFixed(2)}`;
        if (activeLoansEl) activeLoansEl.textContent = this.loanStats.active_loans || 0;
    }

    updateLoansDisplay() {
        const loansContainer = document.getElementById('loans-container');
        if (!loansContainer) return;

        if (this.loans.length === 0) {
            loansContainer.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    Non hai ancora richiesto prestiti.
                </div>
            `;
            return;
        }

        loansContainer.innerHTML = this.loans.map(loan => `
            <div class="card mb-3">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">
                        Prestito di €${parseFloat(loan.amount).toFixed(2)}
                    </h5>
                    <span class="badge ${
                        loan.status === 'pending' ? 'bg-warning text-dark' :
                        loan.status === 'active' ? 'bg-info' :
                        loan.status === 'completed' ? 'bg-success' :
                        loan.status === 'rejected' ? 'bg-danger' :
                        'bg-secondary'
                    }">
                        ${loan.status === 'pending' ? 'In Attesa di Approvazione' :
                          loan.status === 'active' ? 'Attivo' :
                          loan.status === 'completed' ? 'Completato' :
                          loan.status === 'rejected' ? 'Rifiutato' :
                          loan.status}
                    </span>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Motivazione:</strong><br>${loan.reason}</p>
                            <p class="mb-1"><strong>Data Richiesta:</strong> ${new Date(loan.created_at).toLocaleDateString()}</p>
                            ${loan.start_date ? `<p class="mb-1"><strong>Data Inizio:</strong> ${new Date(loan.start_date).toLocaleDateString()}</p>` : ''}
                            ${loan.end_date ? `<p class="mb-1"><strong>Fine Prevista:</strong> ${new Date(loan.end_date).toLocaleDateString()}</p>` : ''}
                        </div>
                        <div class="col-md-6">
                            ${loan.status === 'active' || loan.status === 'completed' ? `
                                <div class="progress mb-2" style="height: 30px;">
                                    <div class="progress-bar bg-success" 
                                         style="width: ${(loan.paid_installments / loan.total_installments) * 100}%">
                                        ${loan.paid_installments}/${loan.total_installments} rate pagate
                                    </div>
                                </div>
                                <p class="mb-1"><strong>Rate Mensili:</strong> €${parseFloat(loan.installment_amount).toFixed(2)}</p>
                                <p class="mb-1"><strong>Rimanente:</strong> <span class="text-danger">€${parseFloat(loan.remaining_amount).toFixed(2)}</span></p>
                            ` : ''}
                            ${loan.overdue_count > 0 ? `
                                <div class="alert alert-warning mb-0 mt-2">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    <strong>${loan.overdue_count}</strong> rate scadute!
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    ${(loan.status === 'active' || loan.status === 'completed') && loan.installments ? `
                        <hr>
                        <button class="btn btn-primary btn-sm view-installments" data-loan-id="${loan.id}">
                            <i class="fas fa-list"></i> Vedi Rate
                        </button>
                    ` : ''}
                    ${loan.status === 'rejected' && loan.notes ? `
                        <hr>
                        <div class="alert alert-danger mb-0">
                            <strong>Motivo Rifiuto:</strong> ${loan.notes}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    initializeEventListeners() {
        // Visualizza rate - usando event delegation
        const installmentsHandler = (e) => {
            if (e.target.closest('.view-installments')) {
                const button = e.target.closest('.view-installments');
                const loanId = button.dataset.loanId;
                this.showInstallmentsModal(loanId);
            }
        };
        
        // Rimuovi listener precedenti se esistono per evitare duplicati
        if (this.installmentsHandler) {
            document.removeEventListener('click', this.installmentsHandler);
        }
        this.installmentsHandler = installmentsHandler;
        document.addEventListener('click', this.installmentsHandler);
    }

    async handleLoanRequest(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const amount = parseFloat(formData.get('amount'));
        const reason = formData.get('reason');
        const installments = parseInt(formData.get('installments')) || 10;

        // Validazione
        if (!amount || amount <= 0) {
            alert('Inserisci un importo valido');
            return;
        }

        if (!reason || reason.trim().length < 10) {
            alert('La motivazione deve contenere almeno 10 caratteri');
            return;
        }

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/loans', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount,
                    reason,
                    total_installments: installments
                })
            });

            if (response.ok) {
                alert('Richiesta di prestito inviata con successo! Attendi l\'approvazione del tesoriere.');
                e.target.reset();
                
                // Chiudi il modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('requestLoanModal'));
                modal.hide();
                
                // Ricarica i prestiti
                await this.loadMyLoans();
                await this.loadLoanStats();
            } else {
                const data = await response.json();
                alert(data.message || 'Errore nella richiesta del prestito');
            }
        } catch (error) {
            console.error('Error requesting loan:', error);
            alert('Errore nella richiesta del prestito');
        }
    }

    showInstallmentsModal(loanId) {
        const loan = this.loans.find(l => l.id == loanId);
        if (!loan || !loan.installments) return;

        const modalHtml = `
            <div class="modal fade" id="installmentsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-calendar-alt"></i> Piano di Rimborso
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-info">
                                <strong>Importante:</strong> Porta i pagamenti al tesoriere entro la data di scadenza di ogni rata.
                            </div>
                            <div class="table-responsive">
                                <table class="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>Rata</th>
                                            <th>Scadenza</th>
                                            <th>Importo</th>
                                            <th>Stato</th>
                                            <th>Data Pagamento</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${loan.installments.map(inst => `
                                            <tr class="${inst.status === 'overdue' ? 'table-danger' : ''}">
                                                <td>${inst.installment_number}</td>
                                                <td>${new Date(inst.due_date).toLocaleDateString()}</td>
                                                <td>€${parseFloat(inst.amount).toFixed(2)}</td>
                                                <td>
                                                    <span class="badge ${
                                                        inst.status === 'paid' ? 'bg-success' :
                                                        inst.status === 'overdue' ? 'bg-danger' :
                                                        'bg-warning text-dark'
                                                    }">
                                                        ${inst.status === 'paid' ? 'Pagato' :
                                                          inst.status === 'overdue' ? 'Scaduto' :
                                                          'In Sospeso'}
                                                    </span>
                                                </td>
                                                <td>${inst.paid_date ? new Date(inst.paid_date).toLocaleDateString() : '-'}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Rimuovi modal esistente se presente
        const existingModal = document.getElementById('installmentsModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Aggiungi e mostra il modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalElement = document.getElementById('installmentsModal');
        const modal = new bootstrap.Modal(modalElement);
        modal.show();

        // Rimuovi il modal quando viene chiuso
        modalElement.addEventListener('hidden.bs.modal', () => {
            modalElement.remove();
        });
    }

    async getHtml() {
        return `
            <div class="container mt-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1><i class="fas fa-hand-holding-usd"></i> I Miei Prestiti</h1>
                    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#requestLoanModal">
                        <i class="fas fa-plus"></i> Richiedi Prestito
                    </button>
                </div>

                <!-- Statistiche -->
                <div class="row mb-4">
                    <div class="col-md-3">
                        <div class="card bg-primary text-white">
                            <div class="card-body text-center">
                                <h6>Prestiti Attivi</h6>
                                <h3 id="active-loans-count">0</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-info text-white">
                            <div class="card-body text-center">
                                <h6>Totale Ricevuto</h6>
                                <h3 id="total-borrowed">€0.00</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-success text-white">
                            <div class="card-body text-center">
                                <h6>Totale Rimborsato</h6>
                                <h3 id="total-repaid">€0.00</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-warning text-dark">
                            <div class="card-body text-center">
                                <h6>Da Rimborsare</h6>
                                <h3 id="total-remaining">€0.00</h3>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Informazioni Sistema Prestiti -->
                <div class="alert alert-info">
                    <h5><i class="fas fa-info-circle"></i> Come Funziona</h5>
                    <ul class="mb-0">
                        <li>Puoi richiedere un prestito dall'associazione per motivi validi (mutuo casa, emergenze, ecc.)</li>
                        <li>Il prestito verrà rimborsato in <strong>10 rate mensili</strong> (o meno, se preferisci)</li>
                        <li>Porta i pagamenti mensili al tesoriere entro la data di scadenza</li>
                        <li>Puoi avere <strong>un solo prestito attivo</strong> alla volta</li>
                        <li>Il tesoriere deve approvare la tua richiesta prima dell'erogazione</li>
                    </ul>
                </div>

                <!-- Lista Prestiti -->
                <h3 class="mb-3">I Tuoi Prestiti</h3>
                <div id="loans-container">
                    <!-- Popolato dinamicamente -->
                </div>

                <!-- Modal Richiesta Prestito -->
                <div class="modal fade" id="requestLoanModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title">
                                    <i class="fas fa-hand-holding-usd"></i> Richiedi Prestito
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="loan-request-form">
                                    <div class="mb-3">
                                        <label class="form-label">Importo Richiesto (€) *</label>
                                        <input type="number" step="0.01" class="form-control" name="amount" required min="50" max="5000">
                                        <small class="text-muted">Importo minimo: €50 - Importo massimo: €5000</small>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Numero di Rate Mensili *</label>
                                        <select class="form-select" name="installments" required>
                                            <option value="6">6 mesi</option>
                                            <option value="8">8 mesi</option>
                                            <option value="10" selected>10 mesi (consigliato)</option>
                                            <option value="12">12 mesi</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Motivazione *</label>
                                        <textarea class="form-control" name="reason" rows="4" required minlength="10" 
                                                  placeholder="Spiega per quale motivo hai bisogno del prestito (es. pagamento mutuo casa, spese mediche, ecc.)"></textarea>
                                        <small class="text-muted">Minimo 10 caratteri</small>
                                    </div>
                                    <div class="alert alert-warning">
                                        <i class="fas fa-exclamation-triangle"></i>
                                        <strong>Importante:</strong> Il prestito deve essere approvato dal tesoriere. Assicurati di fornire una motivazione valida.
                                    </div>
                                    <button type="submit" class="btn btn-primary w-100">
                                        <i class="fas fa-paper-plane"></i> Invia Richiesta
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async afterRender() {
        await this.init();
        
        // Event listener per il form richiesta prestito (una sola volta qui)
        const loanRequestForm = document.getElementById('loan-request-form');
        if (loanRequestForm) {
            loanRequestForm.addEventListener('submit', (e) => this.handleLoanRequest(e));
        }
    }
}

