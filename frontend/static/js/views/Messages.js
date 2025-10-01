import AbstractView from "./AbstractView.js";
import { navigateTo } from "../index.js";

export default class extends AbstractView {
    constructor() {
        super();
        this.setTitle("Messaggi - Africa Unita");
        this.messages = [];
        this.isAuthenticated = false;
        this.currentUser = null;
        this.conversations = new Map();
    }

    async init() {
        try {
            // Verifica sessione via JWT
            const token = localStorage.getItem('auth_token');
            const response = await fetch("http://localhost:3000/api/auth/me", {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            const me = response.ok ? await response.json() : null;
            console.log("Session check response:", me);

            if (!me || !me.data || !me.data.user || !me.data.user.id) {
                console.log("Session invalid:", me);
                this.isAuthenticated = false;
                this.currentUser = null;
                document.querySelector("#app").innerHTML = `
                    <div class="container mt-4">
                        <div class="alert alert-warning">
                            Devi effettuare l'accesso per visualizzare i messaggi.
                        </div>
                    </div>
                `;
                return;
            }

            // Imposta i dati dell'utente
            this.isAuthenticated = true;
            this.currentUser = me.data.user;
            console.log("User authenticated:", this.currentUser);

            // Check for URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const artisanId = null; // non usato: rimozione contesto artigiano
            const artisanName = null;

            // Prima imposta l'HTML
            document.querySelector("#app").innerHTML = await this.getHtml();
            
            // Attendi un momento per assicurarsi che il DOM sia completamente caricato
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Poi carica i messaggi e inizializza gli event listener
            await this.loadMessages();
            this.initializeEventListeners();
            this.updateMessagesList();

            // If we have artisan parameters, show the message form
            if (artisanId && artisanName) {
                this.showNewMessageForm({
                    userId: parseInt(artisanId),
                    name: decodeURIComponent(artisanName)
                });
            }
            
            // Imposta un intervallo per aggiornare i messaggi ogni 10 secondi
            const updateInterval = setInterval(async () => {
                if (document.getElementById("messages-list")) {
                    await this.loadMessages();
                    this.updateMessagesList();
                } else {
                    // Se l'elemento non esiste più, ferma l'intervallo
                    clearInterval(updateInterval);
                }
            }, 10000);

            // Pulisci l'intervallo quando si lascia la pagina
            window.addEventListener('beforeunload', () => clearInterval(updateInterval));
            
        } catch (error) {
            console.error("Error in init:", error);
            this.isAuthenticated = false;
            this.currentUser = null;
            document.querySelector("#app").innerHTML = `
                <div class="container mt-4">
                    <div class="alert alert-danger">
                        Errore durante il caricamento dei messaggi. Riprova più tardi.
                    </div>
                </div>
            `;
        }
    }

    async loadMessages() {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch("http://localhost:3000/api/messages", {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            if (!response.ok) {
                throw new Error("Failed to load messages");
            }
            const messages = await response.json();
            console.log("Loaded messages:", messages);
            // Ordina i messaggi dal più vecchio al più nuovo
            this.messages = messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            this.groupMessagesByUser();
        } catch (error) {
            console.error("Error loading messages:", error);
            throw error;
        }
    }

    groupMessagesByUser() {
        if (!this.currentUser || !this.currentUser.id) {
            console.error("Cannot group messages: no current user");
            return;
        }

        this.conversations.clear();
        
        // I messaggi sono già ordinati per data in loadMessages()
        this.messages.forEach(message => {
            const otherUserId = message.sender_id === this.currentUser.id ? message.receiver_id : message.sender_id;
            const otherUserName = message.sender_id === this.currentUser.id ? message.receiver_name : message.sender_name;
            
            if (!this.conversations.has(otherUserId)) {
                this.conversations.set(otherUserId, {
                    userId: otherUserId,
                    name: otherUserName,
                    messages: []
                });
            }
            this.conversations.get(otherUserId).messages.push(message);
        });
    }

    initializeEventListeners() {
        document.addEventListener("click", async (e) => {
            if (e.target.classList.contains("reply-button")) {
                const userId = e.target.dataset.userId;
                const conversation = this.conversations.get(parseInt(userId));
                if (conversation) {
                    this.showReplyModal(conversation);
                }
            }
        });

        const replyForm = document.getElementById("reply-form");
        if (replyForm) {
            replyForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                await this.handleReply(e);
            });
        }
    }

    async handleReply(e) {
        e.preventDefault();
        const form = e.target;
        const receiverId = form.receiver_id.value;
        const subject = form.subject.value;
        const message = form.message.value;

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch("http://localhost:3000/api/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    recipient_id: parseInt(receiverId),
                    subject,
                    content: message
                })
            });

            const result = await response.json();

            if (response.ok) {
                // Aggiungi il nuovo messaggio alla fine dell'array
                if (result.data) {
                    this.messages.push(result.data);
                    this.groupMessagesByUser();
                    this.updateMessagesList();
                }
                
                const modal = document.getElementById("replyModal");
                modal.style.display = "none";
                form.reset();
                
                // Mostra un messaggio di successo
                const messagesContainer = document.querySelector("#messages-list");
                const alertDiv = document.createElement("div");
                alertDiv.className = "alert alert-success alert-dismissible fade show";
                alertDiv.innerHTML = `
                    ${result.message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                `;
                messagesContainer.insertBefore(alertDiv, messagesContainer.firstChild);
                
                // Rimuovi l'alert dopo 3 secondi
                setTimeout(() => {
                    alertDiv.remove();
                }, 3000);
            } else {
                alert(result.message || "Errore nell'invio del messaggio");
            }
        } catch (error) {
            console.error("Errore nell'invio del messaggio:", error);
            alert("Si è verificato un errore durante l'invio del messaggio");
        }
    }

    showReplyModal(conversation) {
        const modal = document.getElementById("replyModal");
        const form = document.getElementById("reply-form");
        if (modal && form) {
            form.receiver_id.value = conversation.userId;
            document.getElementById("recipient-name").textContent = conversation.name;
            modal.style.display = "block";
        }
    }

    showNewMessageForm(recipient) {
        const modal = document.getElementById("replyModal");
        const form = document.getElementById("reply-form");
        if (modal && form) {
            form.receiver_id.value = recipient.userId;
            document.getElementById("recipient-name").textContent = recipient.name;
            modal.style.display = "block";
        }
    }

    updateMessagesList() {
        const messagesList = document.getElementById("messages-list");
        if (!messagesList) {
            console.error("Messages list element not found");
            return;
        }

        let html = '';
        if (this.conversations.size === 0) {
            html = '<div class="alert alert-info">Non hai ancora messaggi.</div>';
        } else {
            // Converti la Map in array e ordina le conversazioni per data del primo messaggio
            const sortedConversations = Array.from(this.conversations.values())
                .sort((a, b) => {
                    // Prendi il primo messaggio (più vecchio) di ogni conversazione
                    const firstMessageA = a.messages[0];
                    const firstMessageB = b.messages[0];
                    return new Date(a.messages[0].created_at) - new Date(b.messages[0].created_at);
                });

            html = sortedConversations.map(conversation => `
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="mb-0">Conversazione con ${conversation.name}</h5>
                        <small class="text-muted">Iniziata il: ${new Date(conversation.messages[0].created_at).toLocaleString()}</small>
                    </div>
                    <div class="card-body">
                        <div class="conversation-messages">
                            ${conversation.messages.map(message => `
                                <div class="message ${message.sender_id === this.currentUser.id ? 'sent' : 'received'} mb-3">
                                    <div class="message-content">
                                        <div class="message-header">
                                            <strong>${message.sender_id === this.currentUser.id ? 'Tu' : message.sender_name}</strong>
                                            <small class="text-muted">${new Date(message.created_at).toLocaleString()}</small>
                                        </div>
                                        <div class="message-subject"><strong>Oggetto:</strong> ${message.subject}</div>
                                        <div class="message-text">${message.message}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <button class="btn btn-primary reply-button" data-user-id="${conversation.userId}">
                            Rispondi a ${conversation.name}
                        </button>
                    </div>
                </div>
            `).join('');
        }

        messagesList.innerHTML = html;
    }

    async getHtml() {
        return `
            <div class="container mt-4">
                <h1>I tuoi messaggi</h1>
                <div id="messages-list" class="mt-4"></div>

                <div class="modal" id="replyModal" tabindex="-1" style="display: none;">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Messaggio per <span id="recipient-name"></span></h5>
                                <button type="button" class="btn-close" onclick="document.getElementById('replyModal').style.display='none'"></button>
                            </div>
                            <div class="modal-body">
                                <form id="reply-form">
                                    <input type="hidden" id="receiver_id" name="receiver_id">
                                    <div class="mb-3">
                                        <label for="subject" class="form-label">Oggetto</label>
                                        <input type="text" class="form-control" id="subject" name="subject" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="message" class="form-label">Messaggio</label>
                                        <textarea class="form-control" id="message" name="message" rows="4" required></textarea>
                                    </div>
                                    <button type="submit" class="btn btn-primary">Invia messaggio</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                <style>
                    .conversation-messages {
                        max-height: 400px;
                        overflow-y: auto;
                        margin-bottom: 1rem;
                        padding: 15px;
                        border-left: 4px solid #9e9e9e;
                        border-right: 4px solid #9e9e9e;
                    }
                    .message {
                        padding: 12px;
                        border-radius: 10px;
                        margin-bottom: 15px;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    }
                    .message.sent {
                        background-color: #e3f2fd;
                        margin-left: 20%;
                        border-left: 3px solid #90caf9;
                    }
                    .message.received {
                        background-color: #f5f5f5;
                        margin-right: 20%;
                        border-right: 3px solid #e0e0e0;
                    }
                    .message-header {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 8px;
                        padding-bottom: 5px;
                        border-bottom: 1px solid rgba(0,0,0,0.1);
                    }
                    .message-subject {
                        margin-bottom: 8px;
                        font-weight: 500;
                    }
                    .message-text {
                        line-height: 1.5;
                    }
                    .modal {
                        background-color: rgba(0,0,0,0.5);
                    }
                    .modal.show {
                        display: block;
                    }
                        /*Finestrino modale */
                    .modal-content {
                        border-radius: 12px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        border-left: 14px solid #9e9e9e;
                        border-right: 14px solid #9e9e9e;
                    }
                    .modal-header {
                        background-color: #f8f9fa;
                        border-bottom: 2px solid #e9ecef;
                        border-radius: 12px 12px 0 0;
                        padding: 15px 20px;
                    }
                    .modal-body {
                        padding: 25px;
                        background-color: #ffffff;
                    }
                    .form-control {
                        border: 1px solid #ced4da;
                        border-radius: 8px;
                        padding: 12px;
                        transition: all 0.3s ease;
                        background-color: #f8f9fa;
                    }
                    .form-control:focus {
                        border-color: #80bdff;
                        box-shadow: 0 0 0 0.2rem rgba(0,123,255,0.15);
                        background-color: #ffffff;
                    }
                    .form-label {
                        font-weight: 500;
                        color: #495057;
                        margin-bottom: 8px;
                    }
                    .btn-primary {
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-weight: 500;
                        transition: all 0.3s ease;
                        background-color: #007bff;
                        border: none;
                        margin-top: 10px;
                    }
                    .btn-primary:hover {
                        background-color: #0056b3;
                        transform: translateY(-1px);
                    }
                    .modal-dialog {
                        max-width: 500px;
                        margin: 1.75rem auto;
                    }
                    #message {
                        min-height: 120px;
                        resize: vertical;
                    }
                    .btn-close {
                        opacity: 0.75;
                        transition: opacity 0.2s ease;
                    }
                    .btn-close:hover {
                        opacity: 1;
                    }
                    .modal-title {
                        color: #2c3e50;
                        font-weight: 600;
                    }
                    #recipient-name {
                        color: #007bff;
                        font-weight: 500;
                    }
                </style>
            </div>
        `;
    }
} 