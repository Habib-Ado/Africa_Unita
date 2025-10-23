import { navigateTo, apiFetch } from "../index.js";
import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
    constructor() {
        super();
        this.setTitle("Verifica Email");
    }

    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
            this.showError('Token di verifica non trovato');
            return;
        }

        await this.verifyEmail(token);
    }

    async verifyEmail(token) {
        try {
            const response = await apiFetch(`/api/auth/verify-email?token=${token}`, {
                method: 'GET'
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess(data.message);
                // Redirect alla pagina di login dopo 3 secondi
                setTimeout(() => {
                    navigateTo('/login');
                }, 3000);
            } else {
                this.showError(data.message || 'Errore durante la verifica email');
            }
        } catch (error) {
            console.error('Verification error:', error);
            this.showError('Errore di connessione. Riprova più tardi.');
        }
    }

    showSuccess(message) {
        const container = document.getElementById('app');
        container.innerHTML = `
            <div class="container mt-5">
                <div class="row justify-content-center">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body text-center">
                                <div class="mb-4">
                                    <i class="fas fa-check-circle text-success" style="font-size: 4rem;"></i>
                                </div>
                                <h2 class="card-title text-success">Email Verificata!</h2>
                                <p class="card-text">${message}</p>
                                <div class="mt-4">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Reindirizzamento...</span>
                                    </div>
                                    <p class="mt-2">Reindirizzamento alla pagina di login...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showError(message) {
        const container = document.getElementById('app');
        container.innerHTML = `
            <div class="container mt-5">
                <div class="row justify-content-center">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body text-center">
                                <div class="mb-4">
                                    <i class="fas fa-exclamation-triangle text-danger" style="font-size: 4rem;"></i>
                                </div>
                                <h2 class="card-title text-danger">Errore di Verifica</h2>
                                <p class="card-text">${message}</p>
                                <div class="mt-4">
                                    <a href="/login" class="btn btn-primary">Vai al Login</a>
                                    <a href="/register" class="btn btn-outline-secondary ms-2">Registrati di Nuovo</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
