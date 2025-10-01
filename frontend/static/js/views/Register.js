import AbstractView from "./AbstractView.js";
import {navigateTo, apiFetch} from "../index.js";

export default class extends AbstractView {
    constructor() {
        super();
        this.setTitle("Registrazione");
        //   this.csrfToken = this.generateCSRFToken();
    }

    generateCSRFToken() {
        const token = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem('csrfToken', token);
        return token;
    }
    async init() {
        const registerForm = document.getElementById("registerForm");
        if (registerForm) {
            registerForm.addEventListener("submit", async (event) => {
                event.preventDefault();
                const formfield = new FormData(registerForm)

                try {
                    const payload = {
                        username: `${document.getElementById('name').value.trim()}_${document.getElementById('surname').value.trim()}`.toLowerCase(),
                        email: document.getElementById('email').value.trim(),
                        password: document.getElementById('password').value,
                        first_name: document.getElementById('name').value.trim(),
                        last_name: document.getElementById('surname').value.trim(),
                        phone: document.getElementById('phone').value.trim() || null,
                        country_of_origin: ''
                    }

                    const response = await apiFetch("/api/auth/register", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    })
                    const data = await response.json()

                    // Mostra il messaggio usando Bootstrap alert
                    const formFeedback = document.getElementById("formFeedback");
                    formFeedback.innerHTML = `
                        <div class="alert alert-${data.type} alert-dismissible fade show" role="alert">
                            ${data.message}
                            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                        </div>
                    `;

                    if (response.ok) {
                        // Reindirizza dopo 3 secondi in caso di successo
                        setTimeout(() => {
                            navigateTo("/login");
                        }, 3000);
                    }
                } catch (error) {
                    const formFeedback = document.getElementById("formFeedback");
                    formFeedback.innerHTML = `
                        <div class="alert alert-danger alert-dismissible fade show" role="alert">
                            Si è verificato un errore. Per favore, riprova.
                            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                        </div>
                    `;
                }
            })
        }

        // Aggiungi effetto ondulazione al focus degli input
        const inputs = document.querySelectorAll('.form-control, .form-select');
        inputs.forEach(input => {
            input.addEventListener('focus', function () {
                this.style.animation = 'focusAnimation 1.5s infinite';
            });

            input.addEventListener('blur', function () {
                this.style.animation = '';
            });
        });

        // Anteprima dell'avatar
        const avatarInput = document.getElementById('avatar');
        const avatarPreview = document.getElementById('avatarPreview');

        if (avatarInput && avatarPreview) {
            avatarInput.addEventListener('change', function (e) {
                if (this.files && this.files[0]) {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        avatarPreview.src = e.target.result;
                        avatarPreview.style.animation = 'fadeIn 0.5s';
                    };
                    reader.readAsDataURL(this.files[0]);
                }
            });
        }

        // Gestione della password strength in tempo reale
        const passwordInput = document.getElementById('password');
        const strengthBar = document.querySelector('.strength-bar');

        if (passwordInput && strengthBar) {
            passwordInput.addEventListener('input', function () {
                let strength = 0;
                const password = this.value;

                // Calcola la forza della password
                if (password.length >= 8) strength += 20;
                if (password.match(/[A-Z]/)) strength += 20;
                if (password.match(/[a-z]/)) strength += 20;
                if (password.match(/[0-9]/)) strength += 20;
                if (password.match(/[^A-Za-z0-9]/)) strength += 20;

                // Aggiorna la barra con animazione
                strengthBar.style.width = strength + '%';

                // Cambia il colore in base alla forza
                if (strength <= 40) {
                    strengthBar.style.backgroundColor = '#e74c3c';
                } else if (strength <= 80) {
                    strengthBar.style.backgroundColor = '#f1c40f';
                } else {
                    strengthBar.style.backgroundColor = '#2ecc71';
                }
            });
        }
    }

    async getHtml() {
        return `
        <style>
            .form-control, .form-select {
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

            .avatar-upload {
                transition: all 0.3s ease-in-out;
            }

            .avatar-upload:hover {
                transform: scale(1.05);
            }

            .avatar-edit label {
                transition: all 0.3s ease-in-out;
            }

            .avatar-edit label:hover {
                transform: scale(1.1);
                background-color: #2980b9 !important;
            }

            .btn-register {
                background-color: #3498db !important;
                transition: all 0.4s ease-in-out !important;
                position: relative;
                overflow: hidden;
            }

            .btn-register:hover {
                background-color: #2ecc71 !important;
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(46, 204, 113, 0.4);
            }

            .btn-register:active {
                transform: translateY(1px);
                box-shadow: 0 2px 8px rgba(46, 204, 113, 0.4);
            }

            .btn-register::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(
                    120deg,
                    transparent,
                    rgba(255, 255, 255, 0.2),
                    transparent
                );
                transition: 0.5s;
            }

            .btn-register:hover::before {
                left: 100%;
            }

            .form-floating label {
                transition: all 0.3s ease;
            }

            .form-control:focus ~ label, .form-select:focus ~ label {
                color: #3498db !important;
            }

            .password-strength-meter {
                transition: all 0.3s ease;
            }

            .strength-bar {
                transition: width 0.5s ease-in-out, background-color 0.3s ease;
            }

            @keyframes focusAnimation {
                0% { border-color: #bdc3c7; }
                50% { border-color: #3498db; }
                100% { border-color: #bdc3c7; }
            }

            .form-control:focus::placeholder {
                opacity: 0.7;
                transform: translateX(10px);
                transition: all 0.3s ease;
            }
        </style>

        <div class="container py-5" style="background-color: #e6f3ff;">
            <div class="row justify-content-center">
                <div class="col-md-8 col-lg-6">
                    <div class="card shadow-lg" style="background-color: #2c3e50; color: #ecf0f1;">
                        <div class="card-body p-5">
                            <div class="text-center mb-4">
                                <h1 class="h3 text-light">Crea il tuo account</h1>
                                <p class="text-light opacity-75">Entra a far parte della nostra community di artigiani e clienti</p>
                            </div>

                            <form id="registerForm" class="needs-validation" enctype="multipart/form-data" novalidate>
                                <div class="text-center mb-4">
                                    <div class="avatar-upload position-relative mx-auto" style="width: 120px; height: 120px;">
                                        <div class="avatar-preview rounded-circle border border-light" style="width: 120px; height: 120px; overflow: hidden;">
                                            <img id="avatarPreview" src="/static/img/avatar.png" class="w-100 h-100" style="object-fit: cover;">
                                        </div>
                                        <div class="avatar-edit position-absolute bottom-0 end-0">
                                            <label for="avatar" class="btn btn-sm btn-info rounded-circle" style="width: 32px; height: 32px;">
                                                <i class="fas fa-camera"></i>
                                            </label>
                                            <input type="file" id="avatar" name="avatar" class="d-none" accept="image/*">
                                        </div>
                                    </div>
                                </div>

                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <div class="form-floating mb-3">
                                            <input type="text" autocomplete="off" class="form-control" style="background-color: #f5f6f7; color: #2c3e50; border: 1px solid #bdc3c7;" id="name" name="name" placeholder="Nome" required minlength="2" maxlength="50">
                                            <label for="name" style="color: #7f8c8d">Nome</label>
                                            <div class="invalid-feedback text-warning" id="nameError"></div>
                                        </div>
            </div>
            
                                    <div class="col-md-6">
                                        <div class="form-floating mb-3">
                                            <input type="text"  autocomplete="off" class="form-control" style="background-color: #f5f6f7; color: #2c3e50; border: 1px solid #bdc3c7;" id="surname" name="surname" placeholder="Cognome" required minlength="2" maxlength="50">
                                            <label for="surname" style="color: #7f8c8d">Cognome</label>
                                            <div class="invalid-feedback text-warning" id="surnameError"></div>
                                        </div>
                                    </div>
                                    
            </div>
            
                                <div class="form-floating mb-3">
                                    <input type="date" autocomplete="off" class="form-control" style="background-color: #f5f6f7; color: #2c3e50; border: 1px solid #bdc3c7;" id="birthdate" name="birthdate" required>
                                    <label for="birthdate" style="color: #7f8c8d">Data di nascita</label>
                                    <div class="invalid-feedback text-warning" id="birthdateError"></div>
            </div>
            
                                <div class="form-floating mb-3">
                                    <input type="tel" autocomplete="off" class="form-control" style="background-color: #f5f6f7; color: #2c3e50; border: 1px solid #bdc3c7;" id="phone" name="phone" placeholder="Telefono" required pattern="\\+?[0-9]{10,15}">
                                    <label for="phone" style="color: #7f8c8d">Telefono</label>
                                    <div class="invalid-feedback text-warning" id="phoneError"></div>
            </div>
            
                                <div class="form-floating mb-3">
                                    <input type="text" autocomplete="off" class="form-control" style="background-color: #f5f6f7; color: #2c3e50; border: 1px solid #bdc3c7;" id="address" name="address" placeholder="Indirizzo" required minlength="5" maxlength="100">
                                    <label for="address" style="color: #7f8c8d">Indirizzo</label>
                                    <div class="invalid-feedback text-warning" id="addressError"></div>
                    </div>

                                <div class="form-floating mb-3">
                                    <input type="email" autocomplete="off" class="form-control" style="background-color: #f5f6f7; color: #2c3e50; border: 1px solid #bdc3c7;" id="email" name="email" placeholder="Email" required>
                                    <label for="email" style="color: #7f8c8d">Email</label>
                                    <div class="invalid-feedback text-warning" id="emailError"></div>
            </div>
            
                                <div class="form-floating mb-3">
                                    <input type="password" autocomplete="off" class="form-control" style="background-color: #f5f6f7; color: #2c3e50; border: 1px solid #bdc3c7;" id="password" name="password" placeholder="Password" required minlength="8">
                                    <label for="password" style="color: #7f8c8d">Password</label>
                                    <div class="password-strength-meter progress mt-1" style="height: 5px; background-color: #34495e;">
                                        <div class="strength-bar progress-bar" role="progressbar" style="width: 0%"></div>
                </div>
                                    <small class="text-light opacity-75 password-requirements">
                    La password deve contenere almeno 8 caratteri, un numero e un carattere speciale
                                    </small>
                                    <div class="invalid-feedback text-warning" id="passwordError"></div>
            </div>
            
                                <div class="form-floating mb-4">
                                    <input type="password" autocomplete="off" class="form-control" style="background-color: #f5f6f7; color: #2c3e50; border: 1px solid #bdc3c7;" id="confirmPassword" name="confirmPassword" placeholder="Conferma Password" required>
                                    <label for="confirmPassword" style="color: #7f8c8d">Conferma Password</label>
                                    <div class="invalid-feedback text-warning" id="confirmPasswordError"></div>
            </div>
            
                                <button type="submit" class="btn btn-register w-100 py-2 mb-3 text-white">
                                    <span class="spinner-border spinner-border-sm d-none me-2" role="status"></span>
                                    Registrati
                                </button>

                                <div class="text-center">
                                    <p class="text-light opacity-75">
                                        Hai già un account? <a href="/login" data-link class="text-info text-decoration-none">Accedi</a>
                                    </p>
                                </div>

                                <div id="formFeedback" class="mt-3"></div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    }
}