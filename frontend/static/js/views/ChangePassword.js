import { navigateTo, apiFetch } from "../index.js";
import AbstractView from "./AbstractView.js";

export default class ChangePassword extends AbstractView {
    constructor() {
        super();
        this.setTitle("Cambio Password - Africa Unita");
    }

    async init() {
        // Verifica autenticazione
        const token = localStorage.getItem('auth_token');
        if (!token) {
            navigateTo('/login');
            return;
        }

        // Gestisci il form di cambio password
        const changePasswordForm = document.getElementById("change-password-form");
        if (changePasswordForm) {
            changePasswordForm.addEventListener("submit", async (e) => {
                e.preventDefault();

                const currentPassword = document.getElementById("current-password")?.value;
                const newPassword = document.getElementById("new-password")?.value;
                const confirmPassword = document.getElementById("confirm-password")?.value;

                // Validazione
                if (!newPassword) {
                    this.showAlert("La nuova password è richiesta", "error");
                    return;
                }

                if (newPassword.length < 8) {
                    this.showAlert("La password deve essere di almeno 8 caratteri", "error");
                    return;
                }

                if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
                    this.showAlert("La password deve contenere almeno una lettera maiuscola, una minuscola e un numero", "error");
                    return;
                }

                if (newPassword !== confirmPassword) {
                    this.showAlert("Le password non corrispondono", "error");
                    return;
                }

                // Disabilita il pulsante durante l'invio
                const submitButton = changePasswordForm.querySelector('button[type="submit"]');
                const originalText = submitButton.textContent;
                submitButton.disabled = true;
                submitButton.textContent = "Caricamento...";

                try {
                    const response = await apiFetch("/api/users/change-password", {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            current_password: currentPassword || null,
                            new_password: newPassword
                        })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        this.showAlert(data.message || "Password cambiata con successo!", "success");
                        setTimeout(() => {
                            navigateTo("/");
                            window.location.reload();
                        }, 2000);
                    } else {
                        this.showAlert(data.message || "Errore durante il cambio password", "error");
                        submitButton.disabled = false;
                        submitButton.textContent = originalText;
                    }
                } catch (error) {
                    console.error("Errore:", error);
                    this.showAlert("Si è verificato un errore durante il cambio password", "error");
                    submitButton.disabled = false;
                    submitButton.textContent = originalText;
                }
            });
        }
    }

    showAlert(message, type) {
        const alertContainer = document.getElementById("alert-container");
        if (!alertContainer) return;

        const alertClass = type === "success" ? "alert-success" : "alert-danger";
        alertContainer.innerHTML = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;

        // Auto-dismiss dopo 5 secondi
        setTimeout(() => {
            const alert = alertContainer.querySelector('.alert');
            if (alert) {
                alert.classList.remove('show');
                setTimeout(() => alert.remove(), 150);
            }
        }, 5000);
    }

    async getHtml() {
        return `
            <div class="container py-5">
                <div id="alert-container"></div>
                <div class="row justify-content-center">
                    <div class="col-md-6">
                        <div class="card shadow">
                            <div class="card-body p-5">
                                <h1 class="text-center mb-4">🔐 Cambio Password</h1>
                                <p class="text-center text-muted mb-4">
                                    Questa è la password temporanea fornita dall'amministratore. 
                                    <strong>Devi cambiarla ora per continuare.</strong>
                                </p>
                                <form id="change-password-form" class="needs-validation" novalidate>
                                    <div class="mb-3">
                                        <label for="new-password" class="form-label">Nuova Password</label>
                                        <input type="password" class="form-control" id="new-password" required minlength="8">
                                        <div class="form-text">
                                            La password deve essere di almeno 8 caratteri e contenere almeno una lettera maiuscola, una minuscola e un numero.
                                        </div>
                                    </div>
                                    <div class="mb-4">
                                        <label for="confirm-password" class="form-label">Conferma Nuova Password</label>
                                        <input type="password" class="form-control" id="confirm-password" required minlength="8">
                                    </div>
                                    <div class="d-grid">
                                        <button type="submit" class="btn btn-primary btn-lg">Cambia Password</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
