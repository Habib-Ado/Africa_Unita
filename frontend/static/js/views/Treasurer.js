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
    }

    async init() {
        try {
            await Promise.all([
                this.loadFees(),
                this.loadFundBalance(),
                this.loadTransactions()
            ]);

            this.initializeEventListeners();
        } catch (error) {
            console.error('Error initializing treasurer:', error);
        }
    }

    async loadFees() {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('http://localhost:3000/api/fees?limit=100', {
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
            const response = await fetch('http://localhost:3000/api/fees/fund/balance', {
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
            const response = await fetch('http://localhost:3000/api/fees/fund/transactions?limit=50', {
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
        if (!tbody) return;

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

    initializeEventListeners() {
        // Conferma pagamento
        document.addEventListener('click', async (e) => {
            if (e.target.closest('.confirm-payment')) {
                const feeId = e.target.closest('.confirm-payment').dataset.feeId;
                await this.confirmPayment(feeId);
            }
        });

        // Genera quote mensili
        const generateBtn = document.getElementById('generate-fees-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', async () => {
                await this.generateMonthlyFees();
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
    }

    async confirmPayment(feeId) {
        if (!confirm('Confermare il pagamento di questa quota?')) return;

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`http://localhost:3000/api/fees/${feeId}/confirm`, {
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
                alert('Pagamento confermato con successo!');
                await this.loadFees();
                await this.loadFundBalance();
                this.filterFees(); // Reinizializza i filtri
            } else {
                const data = await response.json();
                alert(data.message || 'Errore nella conferma del pagamento');
            }
        } catch (error) {
            console.error('Error confirming payment:', error);
            alert('Errore nella conferma del pagamento');
        }
    }

    async generateMonthlyFees() {
        if (!confirm('Generare le quote per il mese corrente per tutti i membri attivi?')) return;

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('http://localhost:3000/api/fees/generate-monthly', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });

            if (response.ok) {
                const data = await response.json();
                alert(data.message);
                await this.loadFees();
                this.filterFees(); // Reinizializza i filtri
            } else {
                const data = await response.json();
                alert(data.message || 'Errore nella generazione delle quote');
            }
        } catch (error) {
            console.error('Error generating fees:', error);
            alert('Errore nella generazione delle quote');
        }
    }

    async addTransaction(e) {
        const formData = new FormData(e.target);
        const payload = {
            type: formData.get('type'),
            amount: parseFloat(formData.get('amount')),
            description: formData.get('description')
        };

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('http://localhost:3000/api/fees/fund/transaction', {
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

    async getHtml() {
        return `
            <div class="container mt-4">
                <h1 class="mb-4">Gestione Tesoreria</h1>

                <!-- Saldo Fondo -->
                <div class="row mb-4">
                    <div class="col-md-4">
                        <div class="card bg-primary text-white">
                            <div class="card-body text-center">
                                <h5>Saldo Fondo Associazione</h5>
                                <h2 class="display-4" id="fund-balance">€0.00</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card bg-success text-white">
                            <div class="card-body text-center">
                                <h5>Entrate Anno Corrente</h5>
                                <h2 class="display-4" id="total-income">€0.00</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card bg-danger text-white">
                            <div class="card-body text-center">
                                <h5>Uscite Anno Corrente</h5>
                                <h2 class="display-4" id="total-expense">€0.00</h2>
                            </div>
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
}
