import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
    constructor() {
        super();
        this.setTitle("Gestione Tesoreria - Africa Unita");
        this.fees = [];
        this.filteredFees = [];
        this.fundBalance = 0;
        this.fundStats = null;
        this.transactions = [];
        this.filteredTransactions = [];
        this.loans = [];
        this.filteredLoans = [];
        this.loansSummary = null;
        this._generatingFees = false;
        this._listenersInitialized = false;
        this._confirmingPayment = false;
        this._approvingLoan = false;
    }

    async init() {
        try {
            await Promise.all([
                this.loadFees(),
                this.loadFundBalance(),
                this.loadTransactions(),
                this.loadLoans(),
                this.loadLoansSummary()
            ]);

            this.initializeEventListeners();
        } catch (error) {
            console.error('Error initializing treasurer:', error);
        }
    }

    async loadFees() {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/fees?limit=100', {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.fees = data.data?.fees || [];
                this.filteredFees = [...this.fees];
                this.updateFeesTable();
            }
        } catch (error) {
            console.error('Error loading fees:', error);
        }
    }

    async loadFundBalance() {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/fees/fund/balance', {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.fundBalance = data.data?.balance || 0;
                this.fundStats = data.data?.stats;
                this.updateFundDisplay();
            }
        } catch (error) {
            console.error('Error loading fund balance:', error);
        }
    }

    async loadTransactions() {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/fees/fund/transactions?limit=50', {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.transactions = data.data?.transactions || [];
                this.filteredTransactions = [...this.transactions];
                this.updateTransactionsTable();
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    }

    async loadLoans() {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/loans?limit=100', {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.loans = data.data?.loans || [];
                this.filteredLoans = [...this.loans];
                this.updateLoansTable();
            }
        } catch (error) {
            console.error('Error loading loans:', error);
        }
    }

    async loadLoansSummary() {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/loans/stats/summary', {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.loansSummary = data.data?.summary;
                this.updateLoansSummaryDisplay();
            }
        } catch (error) {
            console.error('Error loading loans summary:', error);
        }
    }

    updateFundDisplay() {
        const balanceEl = document.getElementById('fund-balance');
        if (balanceEl) {
            balanceEl.textContent = `€${parseFloat(this.fundBalance).toFixed(2)}`;
        }

        if (this.fundStats) {
            const incomeEl = document.getElementById('total-income');
            const expenseEl = document.getElementById('total-expense');
            if (incomeEl) incomeEl.textContent = `€${parseFloat(this.fundStats.total_income_amount).toFixed(2)}`;
            if (expenseEl) expenseEl.textContent = `€${parseFloat(this.fundStats.total_expense_amount).toFixed(2)}`;
        }
    }

    updateFeesTable() {
        const tbody = document.querySelector('#fees-table tbody');
        if (!tbody) {
            console.log('Fees table tbody not found');
            return;
        }

        console.log('Updating fees table with', this.filteredFees.length, 'fees');
        tbody.innerHTML = this.filteredFees.map(fee => `
            <tr>
                <td>${fee.first_name} ${fee.last_name}</td>
                <td>${(() => {
                    const date = new Date(fee.due_date);
                    const month = (date.getMonth() ).toString().padStart(2, '0');
                    const year = date.getFullYear();
                    return `${month}/${year}`;
                })()}</td>
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
                <td>${fee.paid_date ? new Date(fee.paid_date).toLocaleDateString() : '-'}</td>
                <td>
                    ${fee.status !== 'paid' ? `
                        <button class="btn btn-sm btn-success confirm-payment" data-fee-id="${fee.id}">
                            <i class="fas fa-check"></i> Conferma Pagamento
                        </button>
                    ` : `
                        <span class="text-success"><i class="fas fa-check-circle"></i> Confermato</span>
                    `}
                </td>
            </tr>
        `).join('');
        
        // Debug: controlla se i pulsanti sono stati generati
        const confirmButtons = document.querySelectorAll('.confirm-payment');
        console.log('Generated confirm buttons:', confirmButtons.length);
        confirmButtons.forEach((btn, index) => {
            console.log(`Button ${index}:`, btn.dataset.feeId, btn.textContent.trim());
        });
    }

    updateTransactionsTable() {
        const tbody = document.querySelector('#transactions-table tbody');
        if (!tbody) return;

        tbody.innerHTML = this.filteredTransactions.map(tx => `
            <tr>
                <td>${new Date(tx.transaction_date).toLocaleDateString()}</td>
                <td>
                    <span class="badge ${tx.transaction_type === 'income' ? 'bg-success' : 'bg-danger'}">
                        ${tx.transaction_type === 'income' ? 'Entrata' : 'Uscita'}
                    </span>
                </td>
                <td>${tx.description}</td>
                <td>${tx.treasurer_username || '-'}</td>
                <td class="${tx.transaction_type === 'income' ? 'text-success' : 'text-danger'}">
                    ${tx.transaction_type === 'income' ? '+' : '-'}€${parseFloat(tx.amount).toFixed(2)}
                </td>
            </tr>
        `).join('');
    }

    updateLoansSummaryDisplay() {
        if (!this.loansSummary) return;

        const pendingEl = document.getElementById('pending-loans');
        const activeEl = document.getElementById('active-loans');
        const totalRemainingEl = document.getElementById('total-remaining-loans');
        const alertEl = document.getElementById('pending-loans-alert');

        if (pendingEl) pendingEl.textContent = this.loansSummary.pending_loans || 0;
        if (activeEl) activeEl.textContent = this.loansSummary.active_loans || 0;
        if (totalRemainingEl) totalRemainingEl.textContent = `€${parseFloat(this.loansSummary.total_remaining || 0).toFixed(2)} rimanenti`;
        
        // Mostra/nascondi alert prestiti pendenti
        if (alertEl) {
            if (parseInt(this.loansSummary.pending_loans) > 0) {
                alertEl.style.display = 'block';
            } else {
                alertEl.style.display = 'none';
            }
        }
    }

    updateLoansTable() {
        const tbody = document.querySelector('#loans-table tbody');
        if (!tbody) return;

        tbody.innerHTML = this.filteredLoans.map(loan => `
            <tr>
                <td>${loan.first_name} ${loan.last_name}</td>
                <td>€${parseFloat(loan.amount).toFixed(2)}</td>
                <td>${loan.reason.substring(0, 50)}${loan.reason.length > 50 ? '...' : ''}</td>
                <td>
                    <span class="badge ${
                        loan.status === 'pending' ? 'bg-warning text-dark' :
                        loan.status === 'active' ? 'bg-info' :
                        loan.status === 'completed' ? 'bg-success' :
                        loan.status === 'rejected' ? 'bg-danger' :
                        'bg-secondary'
                    }">
                        ${loan.status === 'pending' ? 'In Attesa' :
                          loan.status === 'active' ? 'Attivo' :
                          loan.status === 'completed' ? 'Completato' :
                          loan.status === 'rejected' ? 'Rifiutato' :
                          loan.status}
                    </span>
                </td>
                <td>${loan.paid_installments || 0}/${loan.total_installments || 10}</td>
                <td>€${parseFloat(loan.remaining_amount || loan.amount).toFixed(2)}</td>
                <td>${loan.created_at ? new Date(loan.created_at).toLocaleDateString() : '-'}</td>
                <td>
                    ${loan.status === 'pending' ? `
                        <button class="btn btn-sm btn-success approve-loan" data-loan-id="${loan.id}">
                            <i class="fas fa-check"></i> Approva
                        </button>
                        <button class="btn btn-sm btn-danger reject-loan" data-loan-id="${loan.id}">
                            <i class="fas fa-times"></i> Rifiuta
                        </button>
                    ` : loan.status === 'active' ? `
                        <button class="btn btn-sm btn-primary view-loan-details" data-loan-id="${loan.id}">
                            <i class="fas fa-eye"></i> Dettagli
                        </button>
                    ` : `
                        <button class="btn btn-sm btn-secondary view-loan-details" data-loan-id="${loan.id}">
                            <i class="fas fa-info-circle"></i> Info
                        </button>
                    `}
                </td>
            </tr>
        `).join('');
    }

    // Metodi di filtro per le quote
    filterFees() {
        const searchTerm = document.getElementById('search-fees')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('filter-status')?.value || '';
        const monthFilter = document.getElementById('filter-month')?.value || '';

        this.filteredFees = this.fees.filter(fee => {
            // Filtro per testo (nome, cognome, email)
            const matchesSearch = !searchTerm || 
                fee.first_name?.toLowerCase().includes(searchTerm) ||
                fee.last_name?.toLowerCase().includes(searchTerm) ||
                fee.email?.toLowerCase().includes(searchTerm);

            // Filtro per stato
            const matchesStatus = !statusFilter || fee.status === statusFilter;

            // Filtro per mese
            const matchesMonth = !monthFilter || 
                (new Date(fee.due_date).getMonth() ) === parseInt(monthFilter);

            return matchesSearch && matchesStatus && matchesMonth;
        });

        this.updateFeesTable();
    }

    // Metodi di filtro per le transazioni
    filterTransactions() {
        const searchTerm = document.getElementById('search-transactions')?.value.toLowerCase() || '';
        const typeFilter = document.getElementById('filter-transaction-type')?.value || '';
        const dateFilter = document.getElementById('filter-transaction-date')?.value || '';

        this.filteredTransactions = this.transactions.filter(tx => {
            // Filtro per testo (descrizione)
            const matchesSearch = !searchTerm || 
                tx.description?.toLowerCase().includes(searchTerm);

            // Filtro per tipo
            const matchesType = !typeFilter || tx.transaction_type === typeFilter;

            // Filtro per data
            const matchesDate = !dateFilter || 
                new Date(tx.transaction_date).toISOString().split('T')[0] === dateFilter;

            return matchesSearch && matchesType && matchesDate;
        });

        this.updateTransactionsTable();
    }

    // Metodi di filtro per i prestiti
    filterLoans() {
        const searchTerm = document.getElementById('search-loans')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('filter-loan-status')?.value || '';

        this.filteredLoans = this.loans.filter(loan => {
            // Filtro per testo (nome, cognome, motivo)
            const matchesSearch = !searchTerm || 
                loan.first_name?.toLowerCase().includes(searchTerm) ||
                loan.last_name?.toLowerCase().includes(searchTerm) ||
                loan.reason?.toLowerCase().includes(searchTerm);

            // Filtro per stato
            const matchesStatus = !statusFilter || loan.status === statusFilter;

            return matchesSearch && matchesStatus;
        });

        this.updateLoansTable();
    }

    initializeEventListeners() {
        // Conferma pagamento
        document.addEventListener('click', async (e) => {
            if (e.target.closest('.confirm-payment')) {
                const button = e.target.closest('.confirm-payment');
                const feeId = button.dataset.feeId;
                if (feeId) {
                    await this.confirmPayment(feeId);
                }
            }
            
            // Approva prestito
            if (e.target.closest('.approve-loan')) {
                const button = e.target.closest('.approve-loan');
                const loanId = button.dataset.loanId;
                if (loanId) {
                    await this.approveLoan(loanId);
                }
            }
            
            // Rifiuta prestito
            if (e.target.closest('.reject-loan')) {
                const button = e.target.closest('.reject-loan');
                const loanId = button.dataset.loanId;
                if (loanId) {
                    await this.rejectLoan(loanId);
                }
            }
            
            // Visualizza dettagli prestito
            if (e.target.closest('.view-loan-details')) {
                const button = e.target.closest('.view-loan-details');
                const loanId = button.dataset.loanId;
                if (loanId) {
                    await this.viewLoanDetails(loanId);
                }
            }
            
            // Conferma pagamento rata
            if (e.target.closest('.confirm-installment')) {
                const button = e.target.closest('.confirm-installment');
                const installmentId = button.dataset.installmentId;
                if (installmentId) {
                    await this.confirmInstallmentPayment(installmentId);
                }
            }
        });

        // Genera quote mensili (delegazione: un solo listener, niente doppia conferma)
        if (!this._listenersInitialized) {
            this._listenersInitialized = true;
            document.addEventListener('click', (e) => {
                if (e.target.closest('#generate-fees-btn')) {
                    e.preventDefault();
                    this.generateMonthlyFees();
                }
            });
        }

        // Aggiungi transazione
        const addTxForm = document.getElementById('add-transaction-form');
        if (addTxForm) {
            addTxForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.addTransaction(e);
            });
        }

        // Event listener per filtri quote
        const searchFees = document.getElementById('search-fees');
        const filterStatus = document.getElementById('filter-status');
        const filterMonth = document.getElementById('filter-month');
        
        if (searchFees) {
            searchFees.addEventListener('input', () => this.filterFees());
        }
        if (filterStatus) {
            filterStatus.addEventListener('change', () => this.filterFees());
        }
        if (filterMonth) {
            filterMonth.addEventListener('change', () => this.filterFees());
        }

        // Event listener per filtri transazioni
        const searchTransactions = document.getElementById('search-transactions');
        const filterTransactionType = document.getElementById('filter-transaction-type');
        const filterTransactionDate = document.getElementById('filter-transaction-date');
        
        if (searchTransactions) {
            searchTransactions.addEventListener('input', () => this.filterTransactions());
        }
        if (filterTransactionType) {
            filterTransactionType.addEventListener('change', () => this.filterTransactions());
        }
        if (filterTransactionDate) {
            filterTransactionDate.addEventListener('change', () => this.filterTransactions());
        }

        // Event listener per filtri prestiti
        const searchLoans = document.getElementById('search-loans');
        const filterLoanStatus = document.getElementById('filter-loan-status');
        
        if (searchLoans) {
            searchLoans.addEventListener('input', () => this.filterLoans());
        }
        if (filterLoanStatus) {
            filterLoanStatus.addEventListener('change', () => this.filterLoans());
        }
    }

    async confirmPayment(feeId) {
        if (this._confirmingPayment) return;
        const fee = this.fees.find(f => f.id == feeId);
        if (!fee) {
            this.showErrorNotification('Quota non trovata');
            return;
        }

        const confirmed = await this.showConfirmPaymentModal(fee);
        if (!confirmed) return;

        this._confirmingPayment = true;
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`/api/fees/${feeId}/confirm`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    notes: 'Pagamento confermato dal tesoriere'
                })
            });

            if (response.ok) {
                this.showSuccessNotification('Pagamento confermato con successo!');
                await this.loadFees();
                await this.loadFundBalance();
                await this.loadTransactions();
                this.filterFees();
                this.filterTransactions();
            } else {
                const data = await response.json();
                this.showErrorNotification(data.message || 'Errore nella conferma del pagamento');
            }
        } catch (error) {
            console.error('Error confirming payment:', error);
            this.showErrorNotification('Errore durante la conferma del pagamento');
        } finally {
            this._confirmingPayment = false;
        }
    }

    async generateMonthlyFees() {
        if (this._generatingFees) return;
        if (!confirm('Generare le quote per il mese corrente per tutti i membri attivi?')) return;

        this._generatingFees = true;
        const btn = document.getElementById('generate-fees-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Generazione...';
        }

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/fees/generate-monthly', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccessNotification(data.message || 'Quote mensili generate con successo');
                await this.loadFees();
                this.filterFees();
            } else {
                this.showErrorNotification(data.message || 'Errore nella generazione delle quote');
            }
        } catch (error) {
            console.error('Error generating fees:', error);
            this.showErrorNotification('Errore nella generazione delle quote');
        } finally {
            this._generatingFees = false;
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-plus"></i> Genera Quote Mese Corrente';
            }
        }
    }

    async addTransaction(e) {
        const formData = new FormData(e.target);
        const payload = {
            transaction_type: formData.get('type'),
            amount: parseFloat(formData.get('amount')),
            description: formData.get('description')
        };

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/fees/fund/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert('Transazione registrata con successo!');
                e.target.reset();
                bootstrap.Modal.getInstance(document.getElementById('addTransactionModal')).hide();
                await this.loadFundBalance();
                await this.loadTransactions();
                this.filterTransactions(); // Reinizializza i filtri
            } else {
                const data = await response.json();
                alert(data.message || 'Errore nella registrazione della transazione');
            }
        } catch (error) {
            console.error('Error adding transaction:', error);
            alert('Errore nella registrazione della transazione');
        }
    }

    async approveLoan(loanId) {
        if (this._approvingLoan) return;
        const confirmed = confirm('Sei sicuro di voler approvare questo prestito? Il denaro verrà prelevato dal fondo associazione.');
        if (!confirmed) return;

        this._approvingLoan = true;
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`/api/loans/${loanId}/approve`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccessNotification('Prestito approvato con successo!');
                await this.loadLoans();
                await this.loadLoansSummary();
                await this.loadFundBalance();
                this.filterLoans();
            } else {
                this.showErrorNotification(data.message || 'Errore nell\'approvazione del prestito');
            }
        } catch (error) {
            console.error('Error approving loan:', error);
            this.showErrorNotification('Errore nell\'approvazione del prestito');
        } finally {
            this._approvingLoan = false;
        }
    }

    async rejectLoan(loanId) {
        const reason = prompt('Motivo del rifiuto (opzionale):');
        if (reason === null) return; // Annullato

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`/api/loans/${loanId}/reject`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ notes: reason })
            });

            if (response.ok) {
                this.showSuccessNotification('Prestito rifiutato');
                await this.loadLoans();
                await this.loadLoansSummary();
                this.filterLoans();
            } else {
                const data = await response.json();
                this.showErrorNotification(data.message || 'Errore nel rifiuto del prestito');
            }
        } catch (error) {
            console.error('Error rejecting loan:', error);
            this.showErrorNotification('Errore nel rifiuto del prestito');
        }
    }

    async viewLoanDetails(loanId) {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`/api/loans/${loanId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const loan = data.data.loan;
                const installments = data.data.installments;
                
                this.showLoanDetailsModal(loan, installments);
            } else {
                const data = await response.json();
                this.showErrorNotification(data.message || 'Errore nel recupero dei dettagli');
            }
        } catch (error) {
            console.error('Error loading loan details:', error);
            this.showErrorNotification('Errore nel recupero dei dettagli');
        }
    }

    async confirmInstallmentPayment(installmentId) {
        const confirmed = confirm('Confermi di aver ricevuto il pagamento di questa rata?');
        if (!confirmed) return;

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`/api/loans/installments/${installmentId}/confirm`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });

            if (response.ok) {
                this.showSuccessNotification('Pagamento rata confermato!');
                // Chiudi e riapri il modal per aggiornare i dati
                const modal = document.getElementById('loanDetailsModal');
                const loanId = modal.dataset.loanId;
                bootstrap.Modal.getInstance(modal).hide();
                
                // Ricarica i dati
                await this.loadLoans();
                await this.loadLoansSummary();
                await this.loadFundBalance();
                this.filterLoans();
                
                // Riapri il modal con i dati aggiornati
                setTimeout(() => this.viewLoanDetails(loanId), 300);
            } else {
                const data = await response.json();
                this.showErrorNotification(data.message || 'Errore nella conferma del pagamento');
            }
        } catch (error) {
            console.error('Error confirming installment:', error);
            this.showErrorNotification('Errore nella conferma del pagamento');
        }
    }

    showLoanDetailsModal(loan, installments) {
        const modalHtml = `
            <div class="modal fade" id="loanDetailsModal" tabindex="-1" data-loan-id="${loan.id}">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-info text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-hand-holding-usd"></i> Dettagli Prestito
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <h6>Informazioni Prestito</h6>
                                    <table class="table table-sm">
                                        <tr>
                                            <td><strong>Richiedente:</strong></td>
                                            <td>${loan.first_name || ''} ${loan.last_name || ''}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Importo Totale:</strong></td>
                                            <td>€${parseFloat(loan.amount).toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Importo Rimanente:</strong></td>
                                            <td>€${parseFloat(loan.remaining_amount || loan.amount).toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Rate Pagate:</strong></td>
                                            <td>${loan.paid_installments || 0}/${loan.total_installments || 10}</td>
                                        </tr>
                                    </table>
                                </div>
                                <div class="col-md-6">
                                    <h6>Stato e Date</h6>
                                    <table class="table table-sm">
                                        <tr>
                                            <td><strong>Stato:</strong></td>
                                            <td>
                                                <span class="badge ${
                                                    loan.status === 'active' ? 'bg-info' :
                                                    loan.status === 'completed' ? 'bg-success' :
                                                    loan.status === 'pending' ? 'bg-warning' :
                                                    'bg-secondary'
                                                }">
                                                    ${loan.status === 'active' ? 'Attivo' :
                                                      loan.status === 'completed' ? 'Completato' :
                                                      loan.status === 'pending' ? 'In Attesa' :
                                                      loan.status}
                                                </span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><strong>Data Richiesta:</strong></td>
                                            <td>${loan.created_at ? new Date(loan.created_at).toLocaleDateString() : '-'}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Data Inizio:</strong></td>
                                            <td>${loan.start_date ? new Date(loan.start_date).toLocaleDateString() : '-'}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Data Fine Prevista:</strong></td>
                                            <td>${loan.end_date ? new Date(loan.end_date).toLocaleDateString() : '-'}</td>
                                        </tr>
                                    </table>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <h6>Motivazione</h6>
                                <div class="alert alert-light">
                                    ${loan.reason || 'Nessuna motivazione fornita'}
                                </div>
                            </div>
                            
                            <h6>Rate Mensili</h6>
                            <div class="table-responsive">
                                <table class="table table-sm table-bordered">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Scadenza</th>
                                            <th>Importo</th>
                                            <th>Stato</th>
                                            <th>Data Pagamento</th>
                                            <th>Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${installments.map(inst => `
                                            <tr>
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
                                                <td>
                                                    ${inst.status === 'pending' || inst.status === 'overdue' ? `
                                                        <button class="btn btn-xs btn-success confirm-installment" 
                                                                data-installment-id="${inst.id}">
                                                            <i class="fas fa-check"></i>
                                                        </button>
                                                    ` : `
                                                        <i class="fas fa-check-circle text-success"></i>
                                                    `}
                                                </td>
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
        const existingModal = document.getElementById('loanDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Aggiungi il nuovo modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Mostra il modal
        const modalElement = document.getElementById('loanDetailsModal');
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
        // Rimuovi il modal dal DOM quando viene chiuso
        modalElement.addEventListener('hidden.bs.modal', () => {
            modalElement.remove();
        });
    }

    async getHtml() {
        return `
            <div class="container mt-4">
                <h1 class="mb-4">Gestione Tesoreria</h1>

                <!-- Saldo Fondo -->
                <div class="row mb-4">
                    <div class="col-md-3">
                        <div class="card bg-primary text-white">
                            <div class="card-body text-center">
                                <h6>Saldo Fondo Associazione</h6>
                                <h3 class="display-6" id="fund-balance">€0.00</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-success text-white">
                            <div class="card-body text-center">
                                <h6>Entrate Anno Corrente</h6>
                                <h3 class="display-6" id="total-income">€0.00</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-danger text-white">
                            <div class="card-body text-center">
                                <h6>Uscite Anno Corrente</h6>
                                <h3 class="display-6" id="total-expense">€0.00</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-info text-white">
                            <div class="card-body text-center">
                                <h6>Prestiti Attivi</h6>
                                <h3 class="display-6" id="active-loans">0</h3>
                                <small id="total-remaining-loans">€0.00 rimanenti</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Prestiti in Attesa -->
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="alert alert-warning" id="pending-loans-alert" style="display: none;">
                            <i class="fas fa-exclamation-circle"></i>
                            <strong id="pending-loans">0</strong> richieste di prestito in attesa di approvazione
                        </div>
                    </div>
                </div>

                <!-- Azioni rapide -->
                <div class="mb-4">
                    <button class="btn btn-primary me-2" id="generate-fees-btn">
                        <i class="fas fa-plus"></i> Genera Quote Mese Corrente
                    </button>
                    <button class="btn btn-success" data-bs-toggle="modal" data-bs-target="#addTransactionModal">
                        <i class="fas fa-coins"></i> Aggiungi Transazione
                    </button>
                </div>

                <!-- Tabs -->
                <ul class="nav nav-tabs mb-3" role="tablist">
                    <li class="nav-item">
                        <a class="nav-link active" data-bs-toggle="tab" href="#fees">Quote Associative</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" data-bs-toggle="tab" href="#loans">Prestiti</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" data-bs-toggle="tab" href="#transactions">Movimenti Fondo</a>
                    </li>
                </ul>

                <div class="tab-content">
                <!-- Tab Quote -->
                <div class="tab-pane fade show active" id="fees">
                    <!-- Barra di ricerca -->
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <div class="input-group">
                                <span class="input-group-text">
                                    <i class="fas fa-search"></i>
                                </span>
                                <input type="text" class="form-control" id="search-fees" placeholder="Cerca per nome, cognome o email...">
                            </div>
                        </div>
                        <div class="col-md-3">
                            <select class="form-select" id="filter-status">
                                <option value="">Tutti gli stati</option>
                                <option value="pending">In sospeso</option>
                                <option value="paid">Pagato</option>
                                <option value="overdue">Scaduto</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <select class="form-select" id="filter-month">
                                <option value="">Tutti i mesi</option>
                                <option value="1">Gennaio</option>
                                <option value="2">Febbraio</option>
                                <option value="3">Marzo</option>
                                <option value="4">Aprile</option>
                                <option value="5">Maggio</option>
                                <option value="6">Giugno</option>
                                <option value="7">Luglio</option>
                                <option value="8">Agosto</option>
                                <option value="9">Settembre</option>
                                <option value="10">Ottobre</option>
                                <option value="11">Novembre</option>
                                <option value="12">Dicembre</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="table-responsive">
                        <table class="table table-striped" id="fees-table">
                                <thead>
                                    <tr>
                                        <th>Membro</th>
                                        <th>Mese/Anno</th>
                                        <th>Importo</th>
                                        <th>Stato</th>
                                        <th>Data Pagamento</th>
                                        <th>Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <!-- Popolato dinamicamente -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Tab Prestiti -->
                    <div class="tab-pane fade" id="loans">
                        <!-- Barra di ricerca prestiti -->
                        <div class="row mb-3">
                            <div class="col-md-8">
                                <div class="input-group">
                                    <span class="input-group-text">
                                        <i class="fas fa-search"></i>
                                    </span>
                                    <input type="text" class="form-control" id="search-loans" placeholder="Cerca per nome, cognome o motivazione...">
                                </div>
                            </div>
                            <div class="col-md-4">
                                <select class="form-select" id="filter-loan-status">
                                    <option value="">Tutti gli stati</option>
                                    <option value="pending">In Attesa</option>
                                    <option value="active">Attivi</option>
                                    <option value="completed">Completati</option>
                                    <option value="rejected">Rifiutati</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="table-responsive">
                            <table class="table table-striped" id="loans-table">
                                <thead>
                                    <tr>
                                        <th>Richiedente</th>
                                        <th>Importo</th>
                                        <th>Motivazione</th>
                                        <th>Stato</th>
                                        <th>Rate Pagate</th>
                                        <th>Rimanente</th>
                                        <th>Data Richiesta</th>
                                        <th>Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <!-- Popolato dinamicamente -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Tab Transazioni -->
                    <div class="tab-pane fade" id="transactions">
                        <!-- Barra di ricerca transazioni -->
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <div class="input-group">
                                    <span class="input-group-text">
                                        <i class="fas fa-search"></i>
                                    </span>
                                    <input type="text" class="form-control" id="search-transactions" placeholder="Cerca per descrizione...">
                                </div>
                            </div>
                            <div class="col-md-3">
                                <select class="form-select" id="filter-transaction-type">
                                    <option value="">Tutti i tipi</option>
                                    <option value="income">Entrate</option>
                                    <option value="expense">Uscite</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <input type="date" class="form-control" id="filter-transaction-date" placeholder="Filtra per data">
                            </div>
                        </div>
                        
                        <div class="table-responsive">
                            <table class="table table-striped" id="transactions-table">
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Tipo</th>
                                        <th>Descrizione</th>
                                        <th>Categoria</th>
                                        <th>Importo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <!-- Popolato dinamicamente -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Modal Aggiungi Transazione -->
                <div class="modal fade" id="addTransactionModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Aggiungi Transazione</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="add-transaction-form">
                                    <div class="mb-3">
                                        <label class="form-label">Tipo</label>
                                        <select class="form-select" name="type" required>
                                            <option value="income">Entrata</option>
                                            <option value="expense">Uscita</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Importo (€)</label>
                                        <input type="number" step="0.01" class="form-control" name="amount" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Descrizione</label>
                                        <textarea class="form-control" name="description" rows="2" required></textarea>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Categoria</label>
                                        <select class="form-select" name="category">
                                            <option value="quote">Quote</option>
                                            <option value="donazioni">Donazioni</option>
                                            <option value="eventi">Eventi</option>
                                            <option value="affitto">Affitto</option>
                                            <option value="forniture">Forniture</option>
                                            <option value="altro">Altro</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Note</label>
                                        <textarea class="form-control" name="notes" rows="2"></textarea>
                                    </div>
                                    <button type="submit" class="btn btn-primary">Salva</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Modal di conferma per il pagamento
    async showConfirmPaymentModal(fee) {
        console.log('showConfirmPaymentModal called with fee:', fee);
        return new Promise((resolve) => {
            console.log('Creating modal HTML...');
            // Crea il modal HTML
            const modalHtml = `
                <div class="modal fade" id="confirmPaymentModal" tabindex="-1" aria-labelledby="confirmPaymentModalLabel" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-warning text-dark">
                                <h5 class="modal-title" id="confirmPaymentModalLabel">
                                    <i class="fas fa-exclamation-triangle"></i> Conferma Pagamento
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-warning">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    <strong>Attenzione!</strong> Stai per confermare un pagamento. Questa azione non può essere annullata.
                                </div>
                                
                                <div class="card">
                                    <div class="card-header">
                                        <h6 class="mb-0">Dettagli Quota</h6>
                                    </div>
                                    <div class="card-body">
                                        <div class="row">
                                            <div class="col-sm-6">
                                                <strong>Membro:</strong><br>
                                                <span class="text-muted">${fee.username || 'N/A'}</span>
                                            </div>
                                            <div class="col-sm-6">
                                                <strong>Importo:</strong><br>
                                                <span class="text-muted">€${parseFloat(fee.amount || 0).toFixed(2)}</span>
                                            </div>
                                            <div class="col-sm-6">
                                                <strong>Mese/Anno:</strong><br>
                                                <span class="text-muted">${fee.due_date ? new Date(fee.due_date).toLocaleDateString('it-IT', { month: '2-digit', year: 'numeric' }) : 'N/A'}</span>
                                            </div>
                                            <div class="col-sm-6">
                                                <strong>Stato Attuale:</strong><br>
                                                <span class="badge ${fee.status === 'paid' ? 'bg-success' : fee.status === 'overdue' ? 'bg-danger' : 'bg-warning text-dark'}">
                                                    ${fee.status === 'paid' ? 'Pagato' : fee.status === 'overdue' ? 'Scaduto' : 'In sospeso'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="form-check mt-3">
                                    <input class="form-check-input" type="checkbox" id="confirmCheckbox" required>
                                    <label class="form-check-label" for="confirmCheckbox">
                                        <strong>Confermo di aver ricevuto il pagamento e di voler procedere con la conferma</strong>
                                    </label>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="fas fa-times"></i> Annulla
                                </button>
                                <button type="button" class="btn btn-success" id="confirmPaymentBtn" disabled>
                                    <i class="fas fa-check"></i> Conferma Pagamento
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Aggiungi il modal al DOM
            console.log('Adding modal to DOM...');
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // Mostra il modal
            console.log('Creating Bootstrap modal...');
            const modalElement = document.getElementById('confirmPaymentModal');
            console.log('Modal element found:', modalElement);
            
            const modal = new bootstrap.Modal(modalElement);
            console.log('Bootstrap modal created:', modal);
            
            console.log('Showing modal...');
            modal.show();

            // Gestisci la checkbox
            console.log('Setting up checkbox event listener...');
            const checkbox = document.getElementById('confirmCheckbox');
            const confirmBtn = document.getElementById('confirmPaymentBtn');
            console.log('Checkbox found:', checkbox);
            console.log('Confirm button found:', confirmBtn);
            
            checkbox.addEventListener('change', () => {
                console.log('Checkbox changed:', checkbox.checked);
                confirmBtn.disabled = !checkbox.checked;
            });

            // Gestisci i pulsanti
            console.log('Setting up confirm button event listener...');
            document.getElementById('confirmPaymentBtn').addEventListener('click', () => {
                console.log('Confirm button clicked');
                modal.hide();
                resolve(true);
            });

            // Gestisci la chiusura del modal
            console.log('Setting up modal close event listener...');
            document.getElementById('confirmPaymentModal').addEventListener('hidden.bs.modal', () => {
                console.log('Modal closed');
                document.getElementById('confirmPaymentModal').remove();
                resolve(false);
            });
        });
    }

    // Notifica di successo
    showSuccessNotification(message) {
        this.showNotification(message, 'success');
    }

    // Notifica di errore
    showErrorNotification(message) {
        this.showNotification(message, 'danger');
    }

    // Mostra notifica
    showNotification(message, type = 'info') {
        const notificationHtml = `
            <div class="toast-container position-fixed top-0 end-0 p-3">
                <div class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="d-flex">
                        <div class="toast-body">
                            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'danger' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
                            ${message}
                        </div>
                        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', notificationHtml);
        
        const toastElement = document.querySelector('.toast:last-child');
        const toast = new bootstrap.Toast(toastElement);
        toast.show();

        // Rimuovi il toast dopo che è stato nascosto
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }
}
