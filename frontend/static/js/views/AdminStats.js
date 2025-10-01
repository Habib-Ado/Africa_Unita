import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
    constructor() {
        super();
        this.setTitle("Statistiche - Africa Unita");
        this.stats = null;
    }

    async init() {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            // TODO: implementare endpoint /api/admin/stats nel backend
            // Per ora mostra placeholder
            this.stats = {
                totalUsers: 0,
                totalPosts: 0,
                totalMessages: 0,
                activeUsers: 0
            };

            this.updateUI();
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    updateUI() {
        // Aggiorna le statistiche nella UI
        const statsContainer = document.getElementById('stats-container');
        if (statsContainer && this.stats) {
            statsContainer.innerHTML = `
                <div class="row g-4">
                    <div class="col-md-3">
                        <div class="card text-center">
                            <div class="card-body">
                                <h3>${this.stats.totalUsers}</h3>
                                <p>Utenti Totali</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-center">
                            <div class="card-body">
                                <h3>${this.stats.totalPosts}</h3>
                                <p>Post Pubblicati</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-center">
                            <div class="card-body">
                                <h3>${this.stats.totalMessages}</h3>
                                <p>Messaggi Scambiati</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-center">
                            <div class="card-body">
                                <h3>${this.stats.activeUsers}</h3>
                                <p>Utenti Attivi</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    async getHtml() {
        return `
            <div class="container mt-4">
                <h1 class="mb-4">Statistiche Associazione</h1>
                <div id="stats-container">
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
