import AbstractView from "./AbstractView.js";
import { apiFetch } from "../index.js";

export default class extends AbstractView {
    constructor() {
        super();
        this.setTitle("I Miei Annunci - Africa Unita");
        this.posts = [];
        this.filteredPosts = [];
        this.currentUser = null;
        this.isAuthenticated = null;
        this.editingPostId = null;
        this.existingImageUrl = null;
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
                
                await this.loadPosts();
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

    async loadPosts() {
        try {
            const response = await apiFetch('/api/posts/my');
            if (response.ok) {
                const data = await response.json();
                this.posts = data.data?.posts || [];
                this.filteredPosts = [...this.posts];
            }
        } catch (error) {
            console.error('Error loading posts:', error);
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
                        <p class="mt-2">Caricamento annunci...</p>
                    </div>
                </div>
            `;
        }
        
        if (this.isAuthenticated === false) {
            return `
                <div class="container mt-4">
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        Devi essere autenticato per accedere a questa pagina.
                    </div>
                </div>
            `;
        }

        return `
            <div class="container mt-4">
                <div class="row">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <h2><i class="fas fa-bullhorn"></i> I Miei Annunci</h2>
                            <button class="btn btn-primary" id="create-post-btn">
                                <i class="fas fa-plus"></i> Nuovo Annuncio
                            </button>
                        </div>
                        
                        <!-- Filtri -->
                        <div class="card mb-4">
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-4">
                                        <label class="form-label">Cerca annunci</label>
                                        <input type="text" class="form-control" id="search-posts" placeholder="Cerca per titolo o descrizione...">
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Categoria</label>
                                        <select class="form-select" id="filter-category">
                                            <option value="">Tutte le categorie</option>
                                            <option value="alloggio">🏠 Alloggio</option>
                                            <option value="lavoro">💼 Lavoro</option>
                                            <option value="formazione">📚 Formazione</option>
                                            <option value="servizi">🔧 Servizi</option>
                                            <option value="eventi">🎉 Eventi</option>
                                            <option value="altro">📌 Altro</option>
                                        </select>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">&nbsp;</label>
                                        <button class="btn btn-outline-secondary w-100" id="clear-filters">
                                            <i class="fas fa-times"></i> Pulisci Filtri
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Lista annunci -->
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">I Tuoi Annunci</h5>
                            </div>
                            <div class="card-body">
                                <div id="posts-list">
                                    <!-- Annunci verranno caricati qui -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Modal per creare/modificare annuncio -->
            <div class="modal fade" id="postModal" tabindex="-1" aria-labelledby="postModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="postModalLabel">Nuovo Annuncio</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="post-form" enctype="multipart/form-data">
                                <div class="mb-3">
                                    <label class="form-label">Titolo *</label>
                                    <input type="text" class="form-control" id="post-title" required placeholder="Es: Stanza disponibile a Varese">
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Categoria *</label>
                                    <select class="form-select" id="post-category" required>
                                        <option value="">Seleziona categoria...</option>
                                        <option value="alloggio">🏠 Alloggio</option>
                                        <option value="lavoro">💼 Lavoro</option>
                                        <option value="formazione">📚 Formazione</option>
                                        <option value="servizi">🔧 Servizi</option>
                                        <option value="eventi">🎉 Eventi</option>
                                        <option value="altro">📌 Altro</option>
                                    </select>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Descrizione *</label>
                                    <textarea class="form-control" id="post-description" rows="6" required placeholder="Descrivi il tuo annuncio in dettaglio..."></textarea>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Località</label>
                                    <input type="text" class="form-control" id="post-location" placeholder="Es: Varese, Italia">
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Informazioni di Contatto</label>
                                    <textarea class="form-control" id="post-contact" rows="2" placeholder="Come contattarti (es: email, telefono, WhatsApp)"></textarea>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Immagine</label>
                                    <input type="file" class="form-control" id="post-image" accept="image/*">
                                    <div class="form-text">Carica un'immagine (opzionale)</div>
                                    <div id="image-preview" class="mt-2" style="display: none;">
                                        <img id="preview-img" src="" alt="Anteprima" class="img-fluid rounded" style="max-height: 200px;">
                                        <button type="button" class="btn btn-sm btn-danger mt-2" id="remove-image-btn">
                                            <i class="fas fa-times"></i> Rimuovi immagine
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">
                                        <i class="fas fa-paperclip"></i> File Allegati
                                    </label>
                                    <input type="file" class="form-control" id="post-files" multiple 
                                           accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.jpg,.jpeg,.png">
                                    <div class="form-text">
                                        Puoi allegare fino a 10 file (PDF, Word, Excel, immagini, etc.) - Max 50MB per file
                                    </div>
                                    <div id="files-preview" class="mt-2"></div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>
                            <button type="button" class="btn btn-primary" id="save-post">Pubblica Annuncio</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    updatePostsList() {
        const postsList = document.getElementById('posts-list');
        if (!postsList) return;

        if (this.filteredPosts.length === 0) {
            postsList.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-bullhorn fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">Nessun annuncio trovato</h5>
                    <p class="text-muted">Crea il tuo primo annuncio cliccando su "Nuovo Annuncio"</p>
                </div>
            `;
            return;
        }

        postsList.innerHTML = this.filteredPosts.map(post => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h6 class="card-title">${post.title}</h6>
                            <p class="card-text text-muted">${post.description ? post.description.substring(0, 150) + '...' : 'Nessuna descrizione'}</p>
                            <div class="d-flex gap-2 mb-2">
                                <span class="badge ${this.getCategoryBadgeClass(post.category)}">${this.getCategoryDisplay(post.category)}</span>
                                ${post.location ? `<span class="badge bg-secondary"><i class="fas fa-map-marker-alt"></i> ${post.location}</span>` : ''}
                            </div>
                            <small class="text-muted">
                                <i class="fas fa-eye"></i> ${post.views_count || 0} visualizzazioni
                                <span class="ms-3"><i class="fas fa-calendar"></i> ${new Date(post.created_at).toLocaleDateString()}</span>
                            </small>
                        </div>
                        <div class="col-md-4 text-end">
                            <div class="btn-group-vertical w-100">
                                <a href="/post/${post.id}" class="btn btn-outline-info btn-sm" data-link>
                                    <i class="fas fa-eye"></i> Visualizza
                                </a>
                                <button class="btn btn-outline-primary btn-sm edit-post" data-post-id="${post.id}">
                                    <i class="fas fa-edit"></i> Modifica
                                </button>
                                <button class="btn btn-outline-danger btn-sm delete-post" data-post-id="${post.id}">
                                    <i class="fas fa-trash"></i> Elimina
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getCategoryDisplay(category) {
        const categories = {
            'alloggio': '🏠 Alloggio',
            'lavoro': '💼 Lavoro',
            'formazione': '📚 Formazione',
            'servizi': '🔧 Servizi',
            'eventi': '🎉 Eventi',
            'altro': '📌 Altro'
        };
        return categories[category] || category;
    }

    getCategoryBadgeClass(category) {
        const classes = {
            'alloggio': 'bg-primary',
            'lavoro': 'bg-success',
            'formazione': 'bg-info',
            'servizi': 'bg-warning text-dark',
            'eventi': 'bg-danger',
            'altro': 'bg-secondary'
        };
        return classes[category] || 'bg-secondary';
    }

    filterPosts() {
        const searchTerm = document.getElementById('search-posts')?.value.toLowerCase() || '';
        const categoryFilter = document.getElementById('filter-category')?.value || '';

        this.filteredPosts = this.posts.filter(post => {
            const matchesSearch = !searchTerm || 
                post.title.toLowerCase().includes(searchTerm) ||
                (post.description && post.description.toLowerCase().includes(searchTerm));
            
            const matchesCategory = !categoryFilter || post.category === categoryFilter;
            
            return matchesSearch && matchesCategory;
        });

        this.updatePostsList();
    }

    initializeEventListeners() {
        // Pulsante nuovo annuncio
        const createBtn = document.getElementById('create-post-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.showPostModal();
            });
        }

        // Filtri
        const searchInput = document.getElementById('search-posts');
        const categoryFilter = document.getElementById('filter-category');
        const clearFilters = document.getElementById('clear-filters');

        if (searchInput) searchInput.addEventListener('input', () => this.filterPosts());
        if (categoryFilter) categoryFilter.addEventListener('change', () => this.filterPosts());
        if (clearFilters) {
            clearFilters.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                if (categoryFilter) categoryFilter.value = '';
                this.filterPosts();
            });
        }

        // Event delegation per i pulsanti
        document.addEventListener('click', async (e) => {
            if (e.target.closest('.edit-post')) {
                const postId = e.target.closest('.edit-post').dataset.postId;
                await this.editPost(postId);
            }
            
            if (e.target.closest('.delete-post')) {
                const postId = e.target.closest('.delete-post').dataset.postId;
                await this.deletePost(postId);
            }
        });

        // Salva annuncio
        const saveBtn = document.getElementById('save-post');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.savePost();
            });
        }

        // Mostra la lista degli annunci caricata (altrimenti resterebbe vuota al primo caricamento)
        this.updatePostsList();
    }

    showPostModal(post = null) {
        const modal = new bootstrap.Modal(document.getElementById('postModal'));
        const form = document.getElementById('post-form');
        
        if (post) {
            // Modifica annuncio esistente
            this.editingPostId = post.id;
            document.getElementById('postModalLabel').textContent = 'Modifica Annuncio';
            document.getElementById('post-title').value = post.title || '';
            document.getElementById('post-category').value = post.category || '';
            document.getElementById('post-description').value = post.description || '';
            document.getElementById('post-location').value = post.location || '';
            document.getElementById('post-contact').value = post.contact_info || '';
            
            // Mostra anteprima se c'è un'immagine esistente
            if (post.image_url) {
                const preview = document.getElementById('image-preview');
                const img = document.getElementById('preview-img');
                img.src = post.image_url;
                preview.style.display = 'block';
                this.existingImageUrl = post.image_url;
            } else {
                this.existingImageUrl = null;
            }
        } else {
            // Nuovo annuncio
            this.editingPostId = null;
            this.existingImageUrl = null;
            document.getElementById('postModalLabel').textContent = 'Nuovo Annuncio';
            form.reset();
            document.getElementById('image-preview').style.display = 'none';
        }
        
        this.setupModalListeners();
        modal.show();
    }
    
    setupModalListeners() {
        const imageInput = document.getElementById('post-image');
        if (imageInput) {
            imageInput.removeEventListener('change', this.handleImageChange);
            imageInput.addEventListener('change', this.handleImageChange.bind(this));
        }
        
        // Event listener per anteprima file allegati
        const filesInput = document.getElementById('post-files');
        if (filesInput) {
            filesInput.removeEventListener('change', this.handleFilesChange);
            filesInput.addEventListener('change', this.handleFilesChange.bind(this));
        }
    }
    
    handleFilesChange(e) {
        const preview = document.getElementById('files-preview');
        if (!preview) return;
        
        const files = e.target.files;
        if (files.length === 0) {
            preview.innerHTML = '';
            return;
        }
        
        let html = '<div class="alert alert-info mt-2"><strong>File selezionati:</strong><ul class="mb-0 mt-2">';
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const size = (file.size / 1024).toFixed(2);
            html += `<li><i class="fas fa-file"></i> ${file.name} (${size} KB)</li>`;
        }
        html += '</ul></div>';
        preview.innerHTML = html;
    }
    
    handleImageChange(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const preview = document.getElementById('image-preview');
            const img = document.getElementById('preview-img');
            const removeBtn = document.getElementById('remove-image-btn');
            
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
            
            if (removeBtn) {
                removeBtn.onclick = () => {
                    document.getElementById('post-image').value = '';
                    preview.style.display = 'none';
                };
            }
        } else {
            document.getElementById('image-preview').style.display = 'none';
        }
    }

    async editPost(postId) {
        const post = this.posts.find(p => p.id == postId);
        if (post) {
            this.showPostModal(post);
        }
    }

    async deletePost(postId) {
        if (!confirm('Sei sicuro di voler eliminare questo annuncio?')) return;
        
        try {
            const response = await apiFetch(`/api/posts/${postId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                alert('Annuncio eliminato con successo!');
                await this.loadPosts();
                this.filterPosts();
            } else {
                const error = await response.json();
                alert('Errore nell\'eliminazione: ' + (error.message || 'Errore sconosciuto'));
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            alert('Errore nell\'eliminazione dell\'annuncio');
        }
    }

    async savePost() {
        const title = document.getElementById('post-title').value.trim();
        const category = document.getElementById('post-category').value;
        const description = document.getElementById('post-description').value.trim();
        const location = document.getElementById('post-location').value.trim();
        const contactInfo = document.getElementById('post-contact').value.trim();
        const imageFile = document.getElementById('post-image').files[0];
        
        if (!title) {
            alert('Il titolo è obbligatorio');
            return;
        }
        
        if (!category) {
            alert('La categoria è obbligatoria');
            return;
        }
        
        if (!description) {
            alert('La descrizione è obbligatoria');
            return;
        }
        
        const isEditing = this.editingPostId !== null;
        const formData = new FormData();
        
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('location', location);
        formData.append('contact_info', contactInfo);
        
        if (imageFile) {
            formData.append('image', imageFile);
        }
        
        // Aggiungi file allegati multipli
        const filesInput = document.getElementById('post-files');
        if (filesInput && filesInput.files) {
            for (let i = 0; i < filesInput.files.length; i++) {
                formData.append('files', filesInput.files[i]);
            }
        }
        
        try {
            const url = isEditing ? `/api/posts/${this.editingPostId}` : '/api/posts';
            const method = isEditing ? 'PUT' : 'POST';
            
            const response = await apiFetch(url, {
                method: method,
                body: formData
            });
            
            if (response.ok) {
                alert(isEditing ? 'Annuncio aggiornato con successo!' : 'Annuncio creato con successo!');
                
                // Chiudi il modal
                const modalElement = document.getElementById('postModal');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) {
                    modalInstance.hide();
                }
                
                // Ricarica i post e aggiorna la lista
                await this.loadPosts();
                
                // Reset dei filtri per mostrare tutti i post (incluso quello appena modificato)
                const searchInput = document.getElementById('search-posts');
                const categoryFilter = document.getElementById('filter-category');
                if (searchInput) searchInput.value = '';
                if (categoryFilter) categoryFilter.value = '';
                
                // Aggiorna la visualizzazione
                this.filterPosts();
            } else {
                const error = await response.json();
                alert('Errore: ' + (error.message || 'Errore sconosciuto'));
            }
        } catch (error) {
            console.error('Error saving post:', error);
            alert('Errore nel salvataggio dell\'annuncio');
        }
    }
}


