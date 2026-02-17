import AbstractView from "./AbstractView.js";
import { apiFetch } from "../index.js";

export default class extends AbstractView {
    constructor() {
        super();
        this.setTitle("Gestione Riunioni - Africa Unita");
        this.meetings = [];
        this.currentMeeting = null;
        this.attendanceList = [];
    }

    async init() {
        await this.loadMeetings();
        this.initializeEventListeners();
    }

    async loadMeetings() {
        try {
            const response = await apiFetch('/api/meetings');
            if (response.ok) {
                const data = await response.json();
                this.meetings = data.data?.meetings || [];
                this.updateMeetingsList();
            }
        } catch (error) {
            console.error('Error loading meetings:', error);
        }
    }

    updateMeetingsList() {
        const list = document.getElementById('meetings-list');
        if (!list) return;

        if (this.meetings.length === 0) {
            list.innerHTML = `
                <div class="no-meetings-placeholder">
                    <i class="fas fa-calendar-alt fa-3x mb-3"></i>
                    <h4>Nessuna riunione programmata</h4>
                    <p class="text-muted">Crea la prima riunione mensile</p>
                </div>
            `;
            return;
        }

        list.innerHTML = this.meetings.map(meeting => {
            const date = new Date(meeting.meeting_date);
            const statusClass = meeting.status === 'completed' ? 'success' : 
                               meeting.status === 'cancelled' ? 'danger' : 'primary';
            const statusLabel = meeting.status === 'completed' ? 'Completata' : 
                               meeting.status === 'cancelled' ? 'Annullata' : 'Programmata';
            
            return `
                <div class="meeting-item-card animate-fade-in">
                    <div class="meeting-header">
                        <div>
                            <h5 class="meeting-title">${meeting.title}</h5>
                            <p class="meeting-date">
                                <i class="fas fa-calendar"></i> 
                                ${date.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                ${meeting.meeting_time ? `alle ${meeting.meeting_time}` : ''}
                            </p>
                            ${meeting.location ? `<p class="meeting-location"><i class="fas fa-map-marker-alt"></i> ${meeting.location}</p>` : ''}
                        </div>
                        <span class="badge bg-${statusClass}">${statusLabel}</span>
                    </div>
                    <div class="meeting-body">
                        ${meeting.description ? `<p class="meeting-description">${meeting.description}</p>` : ''}
                        <div class="meeting-stats">
                            <span class="stat-badge stat-success">
                                <i class="fas fa-check"></i> ${meeting.present_count || 0} presenti
                            </span>
                            <span class="stat-badge stat-danger">
                                <i class="fas fa-times"></i> ${meeting.absent_count || 0} assenti
                            </span>
                            <span class="stat-badge stat-warning">
                                <i class="fas fa-file-medical"></i> ${meeting.justified_count || 0} giustificati
                            </span>
                        </div>
                    </div>
                    <div class="meeting-footer">
                        <button class="btn-meeting-action btn-primary" data-meeting-id="${meeting.id}" data-action="attendance">
                            <i class="fas fa-clipboard-check"></i> Presenze
                        </button>
                        <button class="btn-meeting-action btn-secondary" data-meeting-id="${meeting.id}" data-action="edit">
                            <i class="fas fa-edit"></i> Modifica
                        </button>
                        <button class="btn-meeting-action btn-danger" data-meeting-id="${meeting.id}" data-action="delete">
                            <i class="fas fa-trash"></i> Elimina
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    initializeEventListeners() {
        // Rimuovi listener precedenti se esistono per evitare duplicati
        if (this.meetingActionHandler) {
            document.removeEventListener('click', this.meetingActionHandler);
            this.meetingActionHandler = null;
        }

        // Pulsante nuova riunione - rimuovi vecchio listener se esiste
        const newMeetingBtn = document.getElementById('new-meeting-btn');
        if (newMeetingBtn && !newMeetingBtn.dataset.listenerAdded) {
            newMeetingBtn.addEventListener('click', () => this.showNewMeetingModal());
            newMeetingBtn.dataset.listenerAdded = 'true';
        }

        // Event delegation per azioni meeting - usa una funzione bound per poterla rimuovere
        this.meetingActionHandler = async (e) => {
            const actionBtn = e.target.closest('.btn-meeting-action');
            if (!actionBtn) return;
            
            // Previeni event bubbling per evitare chiamate multiple
            e.stopPropagation();
            
            const meetingId = actionBtn.dataset.meetingId;
            const action = actionBtn.dataset.action;
            
            if (!meetingId || !action) return;
            
            // Previeni click multipli rapidi sullo stesso pulsante
            if (actionBtn.dataset.processing === 'true') {
                console.log('Azione già in corso su questo pulsante');
                return;
            }
            
            actionBtn.dataset.processing = 'true';
            setTimeout(() => {
                actionBtn.dataset.processing = 'false';
            }, 1000);
            
            if (action === 'attendance') {
                await this.showAttendanceModal(meetingId);
            } else if (action === 'edit') {
                await this.showEditMeetingModal(meetingId);
            } else if (action === 'delete') {
                await this.deleteMeeting(meetingId);
            }
        };
        
        document.addEventListener('click', this.meetingActionHandler);
    }

    showNewMeetingModal() {
        const modal = document.getElementById('new-meeting-modal');
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('show');
        }
    }

    hideNewMeetingModal() {
        const modal = document.getElementById('new-meeting-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
    }

    async createMeeting(e) {
        if (this._creatingMeeting) return;
        this._creatingMeeting = true;
        
        const formData = new FormData(e.target);
        const data = {
            title: formData.get('title'),
            description: formData.get('description'),
            meeting_date: formData.get('meeting_date'),
            meeting_time: formData.get('meeting_time'),
            location: formData.get('location')
        };

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn?.innerHTML;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Creazione...';
        }

        try {
            const response = await apiFetch('/api/meetings', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert('Riunione creata con successo!');
                this.hideNewMeetingModal();
                e.target.reset();
                await this.loadMeetings();
            } else {
                const error = await response.json();
                alert('Errore: ' + (error.message || 'Impossibile creare la riunione'));
            }
        } catch (error) {
            console.error('Error creating meeting:', error);
            alert('Errore nella creazione della riunione');
        } finally {
            this._creatingMeeting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                if (originalText) submitBtn.innerHTML = originalText;
            }
        }
    }

    async showEditMeetingModal(meetingId) {
        try {
            const response = await apiFetch(`/api/meetings/${meetingId}`);
            if (response.ok) {
                const data = await response.json();
                const meeting = data.data.meeting;
                
                // Verifica che il modal esista
                const modal = document.getElementById('edit-meeting-modal');
                if (!modal) {
                    console.error('Modal di modifica non trovato nel DOM');
                    alert('Errore: modal di modifica non trovato. Ricarica la pagina.');
                    return;
                }
                
                // Popola il form con i dati della riunione
                const form = document.getElementById('edit-meeting-form');
                if (!form) {
                    console.error('Form di modifica non trovato');
                    alert('Errore: form di modifica non trovato');
                    return;
                }
                
                const idField = document.getElementById('edit-meeting-id');
                const titleField = document.getElementById('edit-meeting-title');
                const descriptionField = document.getElementById('edit-meeting-description');
                const dateField = document.getElementById('edit-meeting-date');
                const timeField = document.getElementById('edit-meeting-time');
                const locationField = document.getElementById('edit-meeting-location');
                
                if (idField) idField.value = meeting.id || '';
                if (titleField) titleField.value = meeting.title || '';
                if (descriptionField) descriptionField.value = meeting.description || '';
                
                // Formatta la data (potrebbe essere in formato ISO o YYYY-MM-DD)
                let meetingDate = '';
                if (meeting.meeting_date) {
                    if (meeting.meeting_date.includes('T')) {
                        meetingDate = meeting.meeting_date.split('T')[0];
                    } else if (meeting.meeting_date.includes(' ')) {
                        meetingDate = meeting.meeting_date.split(' ')[0];
                    } else {
                        meetingDate = meeting.meeting_date;
                    }
                }
                if (dateField) dateField.value = meetingDate;
                if (timeField) timeField.value = meeting.meeting_time || '';
                if (locationField) locationField.value = meeting.location || '';
                
                // Mostra il modal
                modal.style.display = 'block';
                modal.classList.add('show');
            } else {
                const error = await response.json();
                alert('Errore: ' + (error.message || 'Impossibile caricare la riunione'));
            }
        } catch (error) {
            console.error('Error loading meeting for edit:', error);
            alert('Errore nel caricamento della riunione');
        }
    }

    hideEditMeetingModal() {
        const modal = document.getElementById('edit-meeting-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
    }

    async updateMeeting(e) {
        if (this._updatingMeeting) return;
        this._updatingMeeting = true;
        
        const formData = new FormData(e.target);
        const meetingId = formData.get('meeting_id');
        const data = {
            title: formData.get('title'),
            description: formData.get('description'),
            meeting_date: formData.get('meeting_date'),
            meeting_time: formData.get('meeting_time'),
            location: formData.get('location')
        };

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn?.innerHTML;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Aggiornamento...';
        }

        try {
            console.log('Aggiornamento riunione:', { meetingId, data });
            const response = await apiFetch(`/api/meetings/${meetingId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert('Riunione aggiornata con successo!');
                this.hideEditMeetingModal();
                e.target.reset();
                await this.loadMeetings();
            } else {
                const error = await response.json();
                console.error('Errore risposta API:', error);
                alert('Errore: ' + (error.message || 'Impossibile aggiornare la riunione'));
            }
        } catch (error) {
            console.error('Error updating meeting:', error);
            alert('Errore nell\'aggiornamento della riunione: ' + (error.message || 'Errore sconosciuto'));
        } finally {
            this._updatingMeeting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                if (originalText) submitBtn.innerHTML = originalText;
            }
        }
    }


    async showAttendanceModal(meetingId) {
        try {
            const response = await apiFetch(`/api/meetings/${meetingId}`);
            if (response.ok) {
                const data = await response.json();
                this.currentMeeting = data.data.meeting;
                this.attendanceList = data.data.attendance;
                
                this.renderAttendanceModal();
            }
        } catch (error) {
            console.error('Error loading attendance:', error);
        }
    }

    renderAttendanceModal() {
        const modalContent = document.getElementById('attendance-modal-content');
        if (!modalContent) return;

        modalContent.innerHTML = `
            <div class="modal-header gradient-header">
                <h5 class="modal-title">
                    <i class="fas fa-clipboard-check"></i> 
                    Presenze - ${this.currentMeeting.title}
                </h5>
                <button type="button" class="btn-close btn-close-white" id="close-attendance-modal"></button>
            </div>
            <div class="modal-body">
                <form id="attendance-form">
                    <div class="attendance-list">
                        ${this.attendanceList.map(att => `
                            <div class="attendance-item">
                                <div class="member-info-compact">
                                    <span class="member-name-compact">
                                        ${att.first_name} ${att.last_name}
                                    </span>
                                    ${att.username ? `<span class="member-username-compact">@${att.username}</span>` : ''}
                                </div>
                                <div class="attendance-controls">
                                    <input type="hidden" name="user_id_${att.user_id}" value="${att.user_id}">
                                    <label class="attendance-radio">
                                        <input type="radio" name="status_${att.user_id}" value="present" 
                                               ${att.status === 'present' ? 'checked' : ''}>
                                        <span class="radio-label success">✓ Presente</span>
                                    </label>
                                    <label class="attendance-radio">
                                        <input type="radio" name="status_${att.user_id}" value="absent" 
                                               ${att.status === 'absent' ? 'checked' : ''}>
                                        <span class="radio-label danger">✗ Assente</span>
                                    </label>
                                    <label class="attendance-radio">
                                        <input type="radio" name="status_${att.user_id}" value="justified" 
                                               ${att.status === 'justified' ? 'checked' : ''}>
                                        <span class="radio-label warning">📝 Giustificato</span>
                                    </label>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" id="cancel-attendance">Chiudi</button>
                <button type="submit" form="attendance-form" class="btn btn-primary">
                    <i class="fas fa-save"></i> Salva Presenze
                </button>
            </div>
        `;

        // Mostra il modal
        const modal = document.getElementById('attendance-modal');
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('show');
        }

        // Event listeners per chiudere
        document.getElementById('close-attendance-modal')?.addEventListener('click', () => this.hideAttendanceModal());
        document.getElementById('cancel-attendance')?.addEventListener('click', () => this.hideAttendanceModal());

        // Event listener per il form
        const attendanceForm = document.getElementById('attendance-form');
        if (attendanceForm) {
            attendanceForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveAttendance(e);
            });
        }
    }

    hideAttendanceModal() {
        const modal = document.getElementById('attendance-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
    }

    async saveAttendance(e) {
        const formData = new FormData(e.target);
        const attendance = [];

        // Raccogli i dati delle presenze
        this.attendanceList.forEach(att => {
            const status = formData.get(`status_${att.user_id}`);
            if (status) {
                attendance.push({
                    user_id: att.user_id,
                    status: status
                });
            }
        });

        try {
            const response = await apiFetch(`/api/meetings/${this.currentMeeting.id}/attendance`, {
                method: 'POST',
                body: JSON.stringify({ attendance })
            });

            if (response.ok) {
                alert('Presenze salvate con successo!');
                this.hideAttendanceModal();
                await this.loadMeetings();
            } else {
                const error = await response.json();
                alert('Errore: ' + (error.message || 'Impossibile salvare le presenze'));
            }
        } catch (error) {
            console.error('Error saving attendance:', error);
            alert('Errore nel salvataggio delle presenze');
        }
    }

    async deleteMeeting(meetingId) {
        // Controlla il flag PRIMA del confirm per evitare doppie conferme
        if (this._deletingMeeting) {
            console.log('Eliminazione già in corso, ignoro la richiesta duplicata');
            return;
        }
        
        if (!confirm('Sei sicuro di voler eliminare questa riunione?')) return;
        
        // Imposta il flag subito dopo la conferma
        this._deletingMeeting = true;

        try {
            const response = await apiFetch(`/api/meetings/${meetingId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert('Riunione eliminata con successo!');
                await this.loadMeetings();
            } else {
                const error = await response.json();
                alert('Errore: ' + (error.message || 'Impossibile eliminare la riunione'));
            }
        } catch (error) {
            console.error('Error deleting meeting:', error);
            alert('Errore nell\'eliminazione della riunione');
        } finally {
            // Reset del flag dopo un breve delay per evitare race conditions
            setTimeout(() => {
                this._deletingMeeting = false;
            }, 500);
        }
    }

    async getHtml() {
        return `
            <div class="modern-meetings-container">
                <div class="container py-5">
                    <!-- Hero Header -->
                    <div class="meetings-hero-header mb-5 animate-fade-in">
                        <div class="hero-content">
                            <h1 class="hero-title">
                                <i class="fas fa-calendar-check"></i> 
                                Gestione Riunioni
                            </h1>
                            <p class="hero-subtitle">Organizza riunioni mensili e monitora le presenze</p>
                        </div>
                        <button class="btn-hero-action" id="new-meeting-btn">
                            <i class="fas fa-plus"></i> Nuova Riunione
                        </button>
                    </div>

                    <!-- Meetings List -->
                    <div id="meetings-list" class="meetings-grid">
                        <!-- Popolato dinamicamente -->
                    </div>
                </div>

                <!-- Modal Nuova Riunione -->
                <div class="modal" id="new-meeting-modal" tabindex="-1" style="display: none;">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content modern-modal">
                            <div class="modal-header gradient-header">
                                <h5 class="modal-title"><i class="fas fa-calendar-plus"></i> Nuova Riunione</h5>
                                <button type="button" class="btn-close btn-close-white" id="close-new-meeting-modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="new-meeting-form">
                                    <div class="mb-3">
                                        <label class="form-label">Titolo *</label>
                                        <input type="text" class="form-control modern-input" name="title" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Descrizione</label>
                                        <textarea class="form-control modern-input" name="description" rows="3"></textarea>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Data *</label>
                                            <input type="date" class="form-control modern-input" name="meeting_date" required>
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Ora</label>
                                            <input type="time" class="form-control modern-input" name="meeting_time">
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Luogo</label>
                                        <input type="text" class="form-control modern-input" name="location" placeholder="Es: Sede associazione, Via Roma 123">
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" id="cancel-new-meeting">Annulla</button>
                                <button type="submit" form="new-meeting-form" class="btn btn-primary btn-lg">
                                    <i class="fas fa-save"></i> Crea Riunione
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modal Presenze -->
                <div class="modal" id="attendance-modal" tabindex="-1" style="display: none;">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content modern-modal" id="attendance-modal-content">
                            <!-- Popolato dinamicamente -->
                        </div>
                    </div>
                </div>

                <!-- Modal Modifica Riunione -->
                <div class="modal" id="edit-meeting-modal" tabindex="-1" style="display: none;">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content modern-modal">
                            <div class="modal-header gradient-header">
                                <h5 class="modal-title"><i class="fas fa-edit"></i> Modifica Riunione</h5>
                                <button type="button" class="btn-close btn-close-white" id="close-edit-meeting-modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="edit-meeting-form">
                                    <input type="hidden" name="meeting_id" id="edit-meeting-id">
                                    <div class="mb-3">
                                        <label class="form-label">Titolo *</label>
                                        <input type="text" class="form-control modern-input" name="title" id="edit-meeting-title" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Descrizione</label>
                                        <textarea class="form-control modern-input" name="description" id="edit-meeting-description" rows="3"></textarea>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Data *</label>
                                            <input type="date" class="form-control modern-input" name="meeting_date" id="edit-meeting-date" required>
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Ora</label>
                                            <input type="time" class="form-control modern-input" name="meeting_time" id="edit-meeting-time">
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Luogo</label>
                                        <input type="text" class="form-control modern-input" name="location" id="edit-meeting-location" placeholder="Es: Sede associazione, Via Roma 123">
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" id="cancel-edit-meeting">Annulla</button>
                                <button type="submit" form="edit-meeting-form" class="btn btn-primary btn-lg">
                                    <i class="fas fa-save"></i> Salva Modifiche
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async afterRender() {
        // Carica i meeting senza ri-inizializzare i listener (per evitare duplicati)
        await this.loadMeetings();
        
        // Inizializza i listener solo se non sono già stati inizializzati
        if (!this._listenersInitialized) {
            this.initializeEventListeners();
            this._listenersInitialized = true;
        }
        
        // Rimuovi listener precedenti se esistono per evitare duplicati
        const closeBtn = document.getElementById('close-new-meeting-modal');
        const cancelBtn = document.getElementById('cancel-new-meeting');
        const newMeetingForm = document.getElementById('new-meeting-form');
        
        if (closeBtn && !closeBtn.dataset.listenerAdded) {
            closeBtn.addEventListener('click', () => this.hideNewMeetingModal());
            closeBtn.dataset.listenerAdded = 'true';
        }
        if (cancelBtn && !cancelBtn.dataset.listenerAdded) {
            cancelBtn.addEventListener('click', () => this.hideNewMeetingModal());
            cancelBtn.dataset.listenerAdded = 'true';
        }
        
        // Event listener per il form nuova riunione (solo se non già aggiunto)
        if (newMeetingForm && !newMeetingForm.dataset.listenerAdded) {
            newMeetingForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.createMeeting(e);
            });
            newMeetingForm.dataset.listenerAdded = 'true';
        }

        // Event listeners per il modal modifica riunione
        const closeEditBtn = document.getElementById('close-edit-meeting-modal');
        const cancelEditBtn = document.getElementById('cancel-edit-meeting');
        const editMeetingForm = document.getElementById('edit-meeting-form');
        
        if (closeEditBtn && !closeEditBtn.dataset.listenerAdded) {
            closeEditBtn.addEventListener('click', () => this.hideEditMeetingModal());
            closeEditBtn.dataset.listenerAdded = 'true';
        }
        if (cancelEditBtn && !cancelEditBtn.dataset.listenerAdded) {
            cancelEditBtn.addEventListener('click', () => this.hideEditMeetingModal());
            cancelEditBtn.dataset.listenerAdded = 'true';
        }
        if (editMeetingForm && !editMeetingForm.dataset.listenerAdded) {
            editMeetingForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.updateMeeting(e);
            });
            editMeetingForm.dataset.listenerAdded = 'true';
        }
    }
}

