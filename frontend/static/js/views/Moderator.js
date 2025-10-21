import AbstractView from "./AbstractView.js";
import { apiFetch } from "../index.js";

export default class extends AbstractView {
    constructor() {
        super();
        this.setTitle("Gestione Contenuti - Africa Unita");
        this.content = [];
        this.filteredContent = [];
        this.currentUser = null;
        this.isAuthenticated = null;
        this.editingContentId = null; // Traccia ID contenuto in modifica
    }

    async init() {
        try {
            // Verifica autenticazione
            const token = localStorage.getItem('auth_token');
            if (!token) {
                this.isAuthenticated = false;
                window.location.href = '/login';
                return;
            }

            const response = await apiFetch('/api/auth/me');
            
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.data?.user;
                this.isAuthenticated = true;
                
                // Verifica che l'utente sia moderatore o admin
                if (!['moderator', 'admin'].includes(this.currentUser.role)) {
                    this.isAuthenticated = false;
                    window.location.href = '/';
                    return;
                }
                
                await this.loadContent();
                this.updateView();
            } else {
                this.isAuthenticated = false;
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Error in init:', error);
            this.isAuthenticated = false;
            window.location.href = '/login';
        }
    }

    async updateView() {
        const app = document.getElementById('app');
        if (app) {
            const html = await this.getHtml();
            app.innerHTML = html;
            this.initializeEventListeners();
        }
    }

    async loadContent() {
        try {
            const response = await apiFetch('/api/content/my');
            if (response.ok) {
                const data = await response.json();
                this.content = data.data?.content || [];
                this.filteredContent = [...this.content];
                this.updateContentList();
            }
        } catch (error) {
            console.error('Error loading content:', error);
        }
    }

    async getHtml() {
        if (this.isAuthenticated === null) {
            return `
                <div class="container mt-4">
                    <div class="text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Caricamento...</span>
                        </div>
                        <p class="mt-2">Caricamento contenuti...</p>
                    </div>
                </div>
            `;
        }
        
        if (this.isAuthenticated === false) {
            return `
                <div class="container mt-4">
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        Devi essere autenticato come moderatore per accedere a questa pagina.
                    </div>
                </div>
            `;
        }

        return `
            <div class="container mt-4">
                <div class="row">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <h2><i class="fas fa-edit"></i> Gestione Contenuti</h2>
                            <button class="btn btn-primary" id="create-content-btn">
                                <i class="fas fa-plus"></i> Nuovo Contenuto
                            </button>
                        </div>
                        
                        <!-- Filtri -->
                        <div class="card mb-4">
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-4">
                                        <label class="form-label">Cerca contenuti</label>
                                        <input type="text" class="form-control" id="search-content" placeholder="Cerca per titolo o contenuto...">
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Tipo</label>
                                        <select class="form-select" id="filter-content-type">
                                            <option value="">Tutti i tipi</option>
                                            <option value="post">Post</option>
                                            <option value="photo">Foto</option>
                                            <option value="video">Video</option>
                                            <option value="document">Documento</option>
                                            <option value="announcement">Annuncio</option>
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Stato</label>
                                        <select class="form-select" id="filter-content-status">
                                            <option value="">Tutti gli stati</option>
                                            <option value="draft">Bozza</option>
                                            <option value="published">Pubblicato</option>
                                            <option value="archived">Archiviato</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <label class="form-label">&nbsp;</label>
                                        <button class="btn btn-outline-secondary w-100" id="clear-filters">
                                            <i class="fas fa-times"></i> Pulisci
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Lista contenuti -->
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">I Miei Contenuti</h5>
                            </div>
                            <div class="card-body">
                                <div id="content-list">
                                    <!-- Contenuti verranno caricati qui -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Modal per creare/modificare contenuto -->
            <div class="modal fade" id="contentModal" tabindex="-1" aria-labelledby="contentModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="contentModalLabel">Nuovo Contenuto</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="content-form" enctype="multipart/form-data">
                                <div class="mb-3">
                                    <label class="form-label">Titolo *</label>
                                    <input type="text" class="form-control" id="content-title" required>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Tipo di Contenuto *</label>
                                    <select class="form-select" id="content-type" required>
                                        <option value="">Seleziona tipo...</option>
                                        <option value="post">Post di testo</option>
                                        <option value="photo">Foto/Galleria</option>
                                        <option value="video">Video</option>
                                        <option value="document">Documento</option>
                                        <option value="announcement">Annuncio</option>
                                    </select>
                                    <div class="form-text" id="type-help-text"></div>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Contenuto</label>
                                    <textarea class="form-control" id="content-text" rows="6" placeholder="Descrizione o testo del contenuto..."></textarea>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">
                                        Immagine in evidenza
                                        <span class="text-danger" id="image-required" style="display: none;">*</span>
                                    </label>
                                    <input type="file" class="form-control" id="content-featured-image" accept="image/*">
                                    <div class="form-text">
                                        Carica un'immagine dal tuo computer (JPG, PNG, GIF, WebP)
                                    </div>
                                    <div id="image-preview" class="mt-2" style="display: none;">
                                        <img id="preview-img" src="" alt="Anteprima" class="img-fluid rounded" style="max-height: 200px;">
                                        <button type="button" class="btn btn-sm btn-danger mt-2" id="remove-image-btn">
                                            <i class="fas fa-times"></i> Rimuovi immagine
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Tag (separati da virgola)</label>
                                    <input type="text" class="form-control" id="content-tags" placeholder="tag1, tag2, tag3">
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Stato</label>
                                    <select class="form-select" id="content-status">
                                        <option value="draft">Bozza</option>
                                        <option value="published">Pubblicato</option>
                                        <option value="archived">Archiviato</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>
                            <button type="button" class="btn btn-primary" id="save-content">Salva Contenuto</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    updateContentList() {
        const contentList = document.getElementById('content-list');
        if (!contentList) return;

        if (this.filteredContent.length === 0) {
            contentList.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-file-alt fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">Nessun contenuto trovato</h5>
                    <p class="text-muted">Crea il tuo primo contenuto cliccando su "Nuovo Contenuto"</p>
                </div>
            `;
            return;
        }

        contentList.innerHTML = this.filteredContent.map(content => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h6 class="card-title">${content.title}</h6>
                            <p class="card-text text-muted">${content.content ? content.content.substring(0, 150) + '...' : 'Nessun contenuto'}</p>
                            <div class="d-flex gap-2 mb-2">
                                <span class="badge ${this.getTypeBadgeClass(content.content_type)}">${this.getTypeDisplay(content.content_type)}</span>
                                <span class="badge ${this.getStatusBadgeClass(content.status)}">${this.getStatusDisplay(content.status)}</span>
                                ${content.tags && content.tags.length > 0 ? content.tags.map(tag => `<span class="badge bg-light text-dark">${tag}</span>`).join('') : ''}
                            </div>
                            <small class="text-muted">
                                <i class="fas fa-eye"></i> ${content.view_count || 0} visualizzazioni
                                <span class="ms-3"><i class="fas fa-calendar"></i> ${new Date(content.created_at).toLocaleDateString()}</span>
                            </small>
                        </div>
                        <div class="col-md-4 text-end">
                            <div class="btn-group-vertical w-100">
                                <button class="btn btn-outline-primary btn-sm edit-content" data-content-id="${content.id}">
                                    <i class="fas fa-edit"></i> Modifica
                                </button>
                                <button class="btn btn-outline-info btn-sm view-content" data-content-id="${content.id}">
                                    <i class="fas fa-eye"></i> Visualizza
                                </button>
                                <button class="btn btn-outline-danger btn-sm delete-content" data-content-id="${content.id}">
                                    <i class="fas fa-trash"></i> Elimina
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getTypeDisplay(type) {
        const types = {
            'post': 'Post',
            'photo': 'Foto',
            'video': 'Video',
            'document': 'Documento',
            'announcement': 'Annuncio'
        };
        return types[type] || type;
    }

    getTypeBadgeClass(type) {
        const classes = {
            'post': 'bg-primary',
            'photo': 'bg-success',
            'video': 'bg-warning text-dark',
            'document': 'bg-info',
            'announcement': 'bg-danger'
        };
        return classes[type] || 'bg-secondary';
    }

    getStatusDisplay(status) {
        const statuses = {
            'draft': 'Bozza',
            'published': 'Pubblicato',
            'archived': 'Archiviato'
        };
        return statuses[status] || status;
    }

    getStatusBadgeClass(status) {
        const classes = {
            'draft': 'bg-warning text-dark',
            'published': 'bg-success',
            'archived': 'bg-secondary'
        };
        return classes[status] || 'bg-secondary';
    }

    filterContent() {
        const searchTerm = document.getElementById('search-content')?.value.toLowerCase() || '';
        const typeFilter = document.getElementById('filter-content-type')?.value || '';
        const statusFilter = document.getElementById('filter-content-status')?.value || '';

        this.filteredContent = this.content.filter(content => {
            const matchesSearch = !searchTerm || 
                content.title.toLowerCase().includes(searchTerm) ||
                (content.content && content.content.toLowerCase().includes(searchTerm));
            
            const matchesType = !typeFilter || content.content_type === typeFilter;
            const matchesStatus = !statusFilter || content.status === statusFilter;
            
            return matchesSearch && matchesType && matchesStatus;
        });

        this.updateContentList();
    }

    initializeEventListeners() {
        // Pulsante nuovo contenuto
        const createBtn = document.getElementById('create-content-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.showContentModal();
            });
        }

        // Filtri
        const searchInput = document.getElementById('search-content');
        const typeFilter = document.getElementById('filter-content-type');
        const statusFilter = document.getElementById('filter-content-status');
        const clearFilters = document.getElementById('clear-filters');

        if (searchInput) searchInput.addEventListener('input', () => this.filterContent());
        if (typeFilter) typeFilter.addEventListener('change', () => this.filterContent());
        if (statusFilter) statusFilter.addEventListener('change', () => this.filterContent());
        if (clearFilters) {
            clearFilters.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                if (typeFilter) typeFilter.value = '';
                if (statusFilter) statusFilter.value = '';
                this.filterContent();
            });
        }

        // Event delegation per i pulsanti dei contenuti
        document.addEventListener('click', async (e) => {
            if (e.target.closest('.edit-content')) {
                const contentId = e.target.closest('.edit-content').dataset.contentId;
                await this.editContent(contentId);
            }
            
            if (e.target.closest('.view-content')) {
                const contentId = e.target.closest('.view-content').dataset.contentId;
                await this.viewContent(contentId);
            }
            
            if (e.target.closest('.delete-content')) {
                const contentId = e.target.closest('.delete-content').dataset.contentId;
                await this.deleteContent(contentId);
            }
        });

        // Salva contenuto
        const saveBtn = document.getElementById('save-content');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveContent();
            });
        }
    }

    showContentModal(content = null) {
        const modal = new bootstrap.Modal(document.getElementById('contentModal'));
        const form = document.getElementById('content-form');
        
        if (content) {
            // Modifica contenuto esistente
            this.editingContentId = content.id;
            document.getElementById('contentModalLabel').textContent = 'Modifica Contenuto';
            document.getElementById('content-title').value = content.title || '';
            document.getElementById('content-type').value = content.content_type || '';
            document.getElementById('content-text').value = content.content || '';
            document.getElementById('content-tags').value = content.tags ? content.tags.join(', ') : '';
            document.getElementById('content-status').value = content.status || 'draft';
            
            // Mostra anteprima se c'è un'immagine esistente
            if (content.featured_image_url) {
                const preview = document.getElementById('image-preview');
                const img = document.getElementById('preview-img');
                img.src = content.featured_image_url;
                preview.style.display = 'block';
                
                // Salva URL esistente per mantenerlo se non si carica una nuova immagine
                this.existingImageUrl = content.featured_image_url;
            } else {
                this.existingImageUrl = null;
            }
        } else {
            // Nuovo contenuto
            this.editingContentId = null;
            document.getElementById('contentModalLabel').textContent = 'Nuovo Contenuto';
            form.reset();
            document.getElementById('image-preview').style.display = 'none';
        }
        
        // Aggiungi event listeners per questo modal
        this.setupModalListeners();
        
        modal.show();
    }
    
    setupModalListeners() {
        // Gestisci cambio tipo contenuto
        const typeSelect = document.getElementById('content-type');
        if (typeSelect) {
            typeSelect.removeEventListener('change', this.handleTypeChange);
            typeSelect.addEventListener('change', this.handleTypeChange.bind(this));
        }
        
        // Gestisci anteprima immagine
        const imageInput = document.getElementById('content-featured-image');
        if (imageInput) {
            imageInput.removeEventListener('change', this.handleImageInput);
            imageInput.addEventListener('change', this.handleImageInput.bind(this));
        }
    }
    
    handleTypeChange(e) {
        const type = e.target.value;
        const helpText = document.getElementById('type-help-text');
        const imageRequired = document.getElementById('image-required');
        
        if (type === 'photo') {
            helpText.innerHTML = '<i class="fas fa-info-circle text-primary"></i> Per le foto, <strong>devi caricare un\'immagine</strong>.';
            imageRequired.style.display = 'inline';
        } else if (type === 'video') {
            helpText.innerHTML = '<i class="fas fa-info-circle text-info"></i> Per i video, carica un\'immagine di copertina.';
            imageRequired.style.display = 'none';
        } else {
            helpText.textContent = '';
            imageRequired.style.display = 'none';
        }
    }
    
    handleImageInput(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            this.showImagePreview(file);
        } else {
            document.getElementById('image-preview').style.display = 'none';
        }
    }
    
    showImagePreview(file) {
        const preview = document.getElementById('image-preview');
        const img = document.getElementById('preview-img');
        const removeBtn = document.getElementById('remove-image-btn');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
        
        // Gestisci rimozione immagine
        if (removeBtn) {
            removeBtn.onclick = () => {
                document.getElementById('content-featured-image').value = '';
                preview.style.display = 'none';
            };
        }
    }

    async editContent(contentId) {
        const content = this.content.find(c => c.id == contentId);
        if (content) {
            this.showContentModal(content);
        }
    }

    async viewContent(contentId) {
        try {
            const response = await apiFetch(`/api/content/${contentId}`);
            
            if (response.ok) {
                const data = await response.json();
                const content = data.data.content;
                
                // Crea modal per visualizzazione (SENZA onclick inline per CSP)
                const modalHtml = `
                    <div class="modal fade" id="viewContentModal" tabindex="-1">
                        <div class="modal-dialog modal-lg">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">${content.title}</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    <div class="mb-3">
                                        <span class="badge ${this.getTypeBadgeClass(content.content_type)}">${this.getTypeDisplay(content.content_type)}</span>
                                        <span class="badge ${this.getStatusBadgeClass(content.status)}">${this.getStatusDisplay(content.status)}</span>
                                    </div>
                                    ${content.featured_image_url ? `<img src="${content.featured_image_url}" class="img-fluid mb-3" alt="${content.title}">` : ''}
                                    <div class="mb-3">
                                        <h6>Contenuto:</h6>
                                        <p>${content.content || 'Nessun contenuto'}</p>
                                    </div>
                                    ${content.tags && content.tags.length > 0 ? `
                                        <div class="mb-3">
                                            <h6>Tag:</h6>
                                            ${content.tags.map(tag => `<span class="badge bg-light text-dark me-1">${tag}</span>`).join('')}
                                        </div>
                                    ` : ''}
                                    <div class="text-muted">
                                        <small><i class="fas fa-eye"></i> ${content.view_count || 0} visualizzazioni</small><br>
                                        <small><i class="fas fa-calendar"></i> Creato: ${new Date(content.created_at).toLocaleString()}</small><br>
                                        ${content.published_at ? `<small><i class="fas fa-check"></i> Pubblicato: ${new Date(content.published_at).toLocaleString()}</small>` : ''}
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>
                                    <button type="button" class="btn btn-primary" id="view-modal-edit-btn" data-content-id="${contentId}">
                                        <i class="fas fa-edit"></i> Modifica
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Rimuovi modal esistente se presente
                const existingModal = document.getElementById('viewContentModal');
                if (existingModal) {
                    existingModal.remove();
                }
                
                // Aggiungi nuovo modal
                document.body.insertAdjacentHTML('beforeend', modalHtml);
                
                // Aggiungi event listener per il pulsante modifica (NON inline per CSP)
                const editBtn = document.getElementById('view-modal-edit-btn');
                if (editBtn) {
                    editBtn.addEventListener('click', () => {
                        // Chiudi il modal di visualizzazione
                        const viewModal = bootstrap.Modal.getInstance(document.getElementById('viewContentModal'));
                        if (viewModal) {
                            viewModal.hide();
                        }
                        // Apri modal di modifica
                        this.editContent(contentId);
                    });
                }
                
                // Mostra modal
                const modal = new bootstrap.Modal(document.getElementById('viewContentModal'));
                modal.show();
                
                // Rimuovi modal dal DOM quando viene chiuso
                document.getElementById('viewContentModal').addEventListener('hidden.bs.modal', function() {
                    this.remove();
                });
            } else {
                const error = await response.json();
                alert('Errore nel caricamento: ' + (error.message || 'Errore sconosciuto'));
            }
        } catch (error) {
            console.error('Error viewing content:', error);
            alert('Errore nel caricamento del contenuto');
        }
    }

    async deleteContent(contentId) {
        if (!confirm('Sei sicuro di voler eliminare questo contenuto?')) return;
        
        try {
            const response = await apiFetch(`/api/content/${contentId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                alert('Contenuto eliminato con successo!');
                await this.loadContent();
                this.filterContent();
            } else {
                const error = await response.json();
                alert('Errore nell\'eliminazione: ' + (error.message || 'Errore sconosciuto'));
            }
        } catch (error) {
            console.error('Error deleting content:', error);
            alert('Errore nell\'eliminazione del contenuto');
        }
    }

    async saveContent() {
        const form = document.getElementById('content-form');
        
        // Validazione campi obbligatori
        const title = document.getElementById('content-title').value.trim();
        const contentType = document.getElementById('content-type').value;
        const imageFile = document.getElementById('content-featured-image').files[0];
        
        if (!title) {
            alert('Il titolo è obbligatorio');
            return;
        }
        
        if (!contentType) {
            alert('Il tipo di contenuto è obbligatorio');
            return;
        }
        
        // Validazione specifica per tipo "photo"
        if (contentType === 'photo' && !imageFile && !this.existingImageUrl) {
            alert('Per il tipo "Foto" devi caricare un\'immagine');
            document.getElementById('content-featured-image').focus();
            return;
        }
        
        const isEditing = this.editingContentId !== null;
        
        // Usa sempre FormData per supportare upload file
        if (isEditing) {
            const formData = new FormData();
            
            formData.append('title', title);
            formData.append('content', document.getElementById('content-text').value);
            formData.append('content_type', contentType);
            formData.append('tags', document.getElementById('content-tags').value);
            formData.append('status', document.getElementById('content-status').value);
            
            // Aggiungi immagine solo se è stata caricata una nuova
            if (imageFile) {
                formData.append('featured_image', imageFile);
            }
            
            try {
                const response = await apiFetch(`/api/content/${this.editingContentId}`, {
                    method: 'PUT',
                    body: formData
                });
                
                if (response.ok) {
                    alert('Contenuto aggiornato con successo!');
                    bootstrap.Modal.getInstance(document.getElementById('contentModal')).hide();
                    await this.loadContent();
                    this.filterContent();
                } else {
                    const error = await response.json();
                    alert('Errore nell\'aggiornamento: ' + (error.message || 'Errore sconosciuto'));
                }
            } catch (error) {
                console.error('Error updating content:', error);
                alert('Errore nell\'aggiornamento del contenuto');
            }
        } else {
            // Per nuovo contenuto, usa FormData per supportare file upload
        const formData = new FormData();
        
            formData.append('title', title);
        formData.append('content', document.getElementById('content-text').value);
            formData.append('content_type', contentType);
        formData.append('tags', document.getElementById('content-tags').value);
        formData.append('status', document.getElementById('content-status').value);
        
            // Aggiungi immagine in evidenza se presente
            if (imageFile) {
                formData.append('featured_image', imageFile);
        }
        
        try {
            const response = await apiFetch('/api/content', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                    alert('Contenuto creato con successo!');
                bootstrap.Modal.getInstance(document.getElementById('contentModal')).hide();
                await this.loadContent();
                this.filterContent();
            } else {
                const error = await response.json();
                    alert('Errore nella creazione: ' + (error.message || 'Errore sconosciuto'));
            }
        } catch (error) {
                console.error('Error creating content:', error);
                alert('Errore nella creazione del contenuto');
            }
        }
    }
}
