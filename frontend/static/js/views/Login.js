import { navigateTo, apiFetch } from "../index.js";
import { initInactivityLogout } from "../inactivityLogout.js";
import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
    constructor() {
        super();
        this.setTitle("Login");
    }

    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('reason') === 'inactivity') {
            this.showSuccess('Sessione scaduta per inattività. Effettua nuovamente l\'accesso.');
            window.history.replaceState({}, '', '/login');
        }

        const form = document.getElementById("login-form");
        const togglePassword = document.getElementById("togglePassword");
        const passwordInput = document.getElementById("password");
        const emailInput = document.getElementById("email");

        // Toggle password visibility
        if (togglePassword && passwordInput) {
            togglePassword.addEventListener("click", function() {
                const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
                passwordInput.setAttribute("type", type);
                this.classList.toggle("fa-eye");
                this.classList.toggle("fa-eye-slash");
            });
        }

        // Validazione in tempo reale
        if (emailInput) {
            emailInput.addEventListener('input', () => {
                if (!emailInput.value) {
                    this.showError('email', 'Lo username è obbligatorio');
                } else if (!emailInput.value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                    this.showError('email', 'Inserisci un username valido (formato email)');
                } else {
                    this.clearError('email');
                }
            });
        }

        if (passwordInput) {
            passwordInput.addEventListener('input', () => {
                if (!passwordInput.value) {
                    this.showError('password', 'La password è obbligatoria');
                } else {
                    this.clearError('password');
                }
            });
        }

        // Form submission
        if (form) {
            form.addEventListener("submit", async (event) => {
                event.preventDefault();
                
                // Validazione prima dell'invio
                if (!emailInput.value || !passwordInput.value) {
                    if (!emailInput.value) this.showError('email', 'Lo username è obbligatorio');
                    if (!passwordInput.value) this.showError('password', 'La password è obbligatoria');
                    return;
                }

                const submitButton = form.querySelector("button[type='submit']");
                const spinner = submitButton.querySelector(".spinner-border");
                
                // Disable button and show spinner
                submitButton.disabled = true;
                spinner.classList.remove("d-none");

                const formData = {
                    email: emailInput.value.trim(),
                    password: passwordInput.value
                };

                try {
                    const response = await apiFetch("/api/auth/login", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(formData)
                    });

                    const data = await response.json();
                    
                    if (response.ok) {
                        // Salva JWT
                        if (data?.data?.token) {
                            localStorage.setItem('auth_token', data.data.token)
                            initInactivityLogout();
                        }
                        
                        // Se deve cambiare la password, reindirizza alla pagina di cambio password
                        if (data?.data?.mustChangePassword) {
                            this.showSuccess('Login effettuato! Devi cambiare la password al primo accesso.');
                            setTimeout(() => {
                                navigateTo("/change-password");
                            }, 2000);
                        } else {
                            this.showSuccess('Login effettuato con successo! Reindirizzamento in corso...');
                            setTimeout(() => {
                                navigateTo("/");
                                window.location.reload();
                            }, 2000);
                        }
                    } else {
                        if (data.field) {
                            // Errore specifico per un campo
                            this.showError(data.field, data.message);
                        } else {
                            // Errore generale
                            this.showError('general', data.message || 'Credenziali non valide');
                        }
                    }
                } catch (error) {
                    console.error(error);
                    this.showError('general', 'Si è verificato un errore. Riprova più tardi.');
                } finally {
                    // Re-enable button and hide spinner
                    submitButton.disabled = false;
                    spinner.classList.add("d-none");
                }
            });
        }
    }

    showError(field, message) {
        const errorDiv = document.getElementById(`${field}Error`) || document.getElementById('login-feedback');
        if (errorDiv) {
            errorDiv.innerHTML = `
                <div class="alert alert-danger alert-dismissible fade show mt-2" role="alert">
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
            
            // Aggiungi classe di errore all'input
            const input = document.getElementById(field);
            if (input) {
                input.classList.add('is-invalid');
            }
        }
    }

    clearError(field) {
        const errorDiv = document.getElementById(`${field}Error`);
        const input = document.getElementById(field);
        if (errorDiv) {
            errorDiv.innerHTML = '';
        }
        if (input) {
            input.classList.remove('is-invalid');
        }
    }

    showSuccess(message) {
        const feedbackDiv = document.getElementById('login-feedback');
        if (feedbackDiv) {
            feedbackDiv.innerHTML = `
                <div class="alert alert-success alert-dismissible fade show" role="alert">
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `;
        }
    }

    async getHtml() {
        return `
        <style>
            .login-container {
                min-height: 100vh;
                background-color: #f4d03f;
                padding: 2rem 0;
                background-image: linear-gradient(135deg, #f4d03f 0%, #f5ab2e 100%);
            }

            .login-card {
                background-color: #2c3e50;
                border-radius: 15px;
                box-shadow: 0 15px 35px rgba(244, 208, 63, 0.3);
                padding: 2.5rem;
                color: #ecf0f1;
                max-width: 450px;
                margin: 0 auto;
                border: 1px solid rgba(255,255,255,0.1);
                backdrop-filter: blur(5px);
            }

            .login-header {
                text-align: center;
                margin-bottom: 2rem;
            }

            .login-header h1 {
                color: #ecf0f1;
                font-size: 2rem;
                margin-bottom: 0.5rem;
            }

            .login-header p {
                color: rgba(236, 240, 241, 0.7);
                font-size: 1rem;
            }

            .form-floating {
                margin-bottom: 1.5rem;
            }

            .form-control, .form-select {
                background-color: #f5f6f7 !important;
                color: #2c3e50 !important;
                border: 1px solid #bdc3c7 !important;
                transition: all 0.3s ease-in-out;
            }

            .form-control:hover, .form-select:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                border-color: #3498db !important;
            }

            .form-control:focus, .form-select:focus {
                transform: translateY(-2px);
                box-shadow: 0 6px 12px rgba(52,152,219,0.2) !important;
                border-color: #3498db !important;
            }

            .form-floating label {
                color: #7f8c8d;
                transition: all 0.3s ease;
            }

            .form-control:focus ~ label {
                color: #3498db !important;
            }

            .btn-login {
                background-color: #3498db !important;
                color: white !important;
                padding: 0.8rem;
                border-radius: 8px;
                width: 100%;
                font-weight: 500;
                margin-top: 1rem;
                transition: all 0.4s ease-in-out;
                position: relative;
                overflow: hidden;
            }

            .btn-login:hover {
                background-color: #2ecc71 !important;
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(46, 204, 113, 0.4);
            }

            .btn-login:active {
                transform: translateY(1px);
            }

            .btn-login::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(120deg, transparent, rgba(255,255,255,0.2), transparent);
                transition: 0.5s;
            }

            .btn-login:hover::before {
                left: 100%;
            }

            .forgot-password {
                text-align: right;
                margin: 1rem 0;
            }

            .forgot-password a {
                color: #3498db;
                text-decoration: none;
                font-size: 0.9rem;
                transition: all 0.3s ease;
            }

            .forgot-password a:hover {
                color: #2ecc71;
                text-decoration: underline;
            }

            .login-footer {
                text-align: center;
                margin-top: 2rem;
                color: rgba(236, 240, 241, 0.7);
            }

            .login-footer a {
                color: #3498db;
                text-decoration: none;
                transition: all 0.3s ease;
            }

            .login-footer a:hover {
                color: #2ecc71;
                text-decoration: underline;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .login-card {
                animation: fadeIn 0.5s ease-out;
            }

            .form-control.is-invalid {
                border-color: #dc3545 !important;
                background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' width='12' height='12' fill='none' stroke='%23dc3545'%3e%3ccircle cx='6' cy='6' r='4.5'/%3e%3cpath stroke-linejoin='round' d='M5.8 3.6h.4L6 6.5z'/%3e%3ccircle cx='6' cy='8.2' r='.6' fill='%23dc3545' stroke='none'/%3e%3c/svg%3e");
                background-repeat: no-repeat;
                background-position: right calc(0.375em + 0.1875rem) center;
                background-size: calc(0.75em + 0.375rem) calc(0.75em + 0.375rem);
            }

            .invalid-feedback {
                display: block;
                color: #dc3545;
                font-size: 0.875em;
                margin-top: 0.25rem;
            }
        </style>

        <div class="login-container">
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-md-6">
                        <div class="login-card">
                            <div class="login-header">
                                <h1>Bentornato</h1>
                                <p>Accedi al tuo account</p>
                            </div>

                            <form id="login-form" novalidate>
                                <div class="form-floating mb-3">
                                    <input type="email" autocomplete="off" class="form-control" id="email" name="email" placeholder="Username (es: mtoure@africaunita.it)" required>
                                    <label for="email">Username (Email di accesso)</label>
                                    <div class="invalid-feedback" id="emailError"></div>
                                </div>

                                <div class="form-floating mb-3 password-toggle">
                                    <input type="password" autocomplete="off" class="form-control" id="password" name="password" placeholder="Password" required>
                                    <label for="password">Password</label>
                                    <div class="invalid-feedback" id="passwordError"></div>
                                <!--    <i class="fas fa-eye toggle-password" id="togglePassword"></i> -->
                                </div>

                                <div class="forgot-password">
                                    <a href="/reset-password" data-link>Password dimenticata?</a>
                                </div>

                                <button type="submit" class="btn btn-login">
                                    <span class="spinner-border spinner-border-sm d-none me-2" role="status"></span>
                                    Accedi
                                </button>

                                <div class="login-footer">
                                    <p>Non hai un account? <a href="/register" data-link>Registrati</a></p>
                                </div>

                                <div id="login-feedback" class="mt-3"></div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }
}