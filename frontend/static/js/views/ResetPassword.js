import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
    constructor() {
        super();
        this.setTitle("Recupero Password - Africa Unita");
    }

    async init() {
        // Handle request password reset form
        const requestForm = document.getElementById("request-reset-form");
        if (requestForm) {
            requestForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const email = document.getElementById("email").value;

                try {
                    const response = await fetch("/api/auth/forgot-password", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ email })
                    });

                    const data = await response.json();
                    
                    if (response.ok) {
                        this.showAlert("Se l'email è registrata, riceverai le istruzioni per reimpostare la password", "success");
                        setTimeout(() => {
                            window.location.href = "/login";
                        }, 3000);
                    } else {
                        this.showAlert(data.message || "Errore durante la richiesta di reset password", "error");
                    }
                } catch (error) {
                    console.error("Errore:", error);
                    this.showAlert("Si è verificato un errore durante la richiesta di reset password", "error");
                }
            });
        }

        // Handle reset password form
        const resetForm = document.getElementById("reset-password-form");
        if (resetForm) {
            resetForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const urlParams = new URLSearchParams(window.location.search);
                const token = urlParams.get('token');
                
                if (!token) {
                    this.showAlert("Token di reset non valido", "error");
                    return;
                }

                const password = document.getElementById("new-password").value;
                const confirmPassword = document.getElementById("confirm-password").value;

                if (password !== confirmPassword) {
                    this.showAlert("Le password non coincidono", "error");
                    return;
                }

                if (password.length < 8) {
                    this.showAlert("La password deve essere di almeno 8 caratteri", "error");
                    return;
                }

                try {
                    const response = await fetch("/api/auth/reset-password", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ token, password })
                    });

                    const data = await response.json();
                    
                    if (response.ok) {
                        this.showAlert("Password reimpostata con successo!", "success");
                        setTimeout(() => {
                            window.location.href = "/login";
                        }, 2000);
                    } else {
                        this.showAlert(data.message || "Errore durante il reset della password", "error");
                    }
                } catch (error) {
                    console.error("Errore:", error);
                    this.showAlert("Si è verificato un errore durante il reset della password", "error");
                }
            });
        }
    }

    showAlert(message, type) {
        const alertContainer = document.getElementById("alert-container");
        if (!alertContainer) return;

        const alert = document.createElement("div");
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        alertContainer.appendChild(alert);
        
        setTimeout(() => {
            alert.classList.remove("show");
            setTimeout(() => alert.remove(), 150);
        }, 5000);
    }

    async getHtml() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        return `
            <div class="container py-5">
                <div id="alert-container"></div>
                <div class="row justify-content-center">
                    <div class="col-md-6">
                        <div class="card shadow">
                            <div class="card-body p-5">
                                ${token ? `
                                    <h1 class="text-center mb-4">Reimposta Password</h1>
                                    <form id="reset-password-form" class="needs-validation" novalidate>
                                        <div class="mb-3">
                                            <label for="new-password" class="form-label">Nuova Password</label>
                                            <input type="password" class="form-control" id="new-password" required minlength="8">
                                            <div class="form-text">La password deve essere di almeno 8 caratteri</div>
                                        </div>
                                        <div class="mb-4">
                                            <label for="confirm-password" class="form-label">Conferma Password</label>
                                            <input type="password" class="form-control" id="confirm-password" required minlength="8">
                                        </div>
                                        <div class="d-grid">
                                            <button type="submit" class="btn btn-primary">Reimposta Password</button>
                                        </div>
                                    </form>
                                ` : `
                                    <h1 class="text-center mb-4">Recupero Password</h1>
                                    <p class="text-center mb-4">Inserisci il tuo indirizzo email per ricevere le istruzioni per reimpostare la password.</p>
                                    <form id="request-reset-form" class="needs-validation" novalidate>
                                        <div class="mb-4">
                                            <label for="email" class="form-label">Email</label>
                                            <input type="email" class="form-control" id="email" required>
                                        </div>
                                        <div class="d-grid">
                                            <button type="submit" class="btn btn-primary">Richiedi Reset Password</button>
                                        </div>
                                    </form>
                                    <div class="text-center mt-4">
                                        <a href="/login" class="text-decoration-none">Torna al Login</a>
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
} 