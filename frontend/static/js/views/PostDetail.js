import AbstractView from "./AbstractView.js";
import { API_BASE } from "../index.js";
import { apiFetch } from "../index.js";
import { shareToSocial, copyToClipboard, showCopySuccess } from "../utils/share.js";

export default class extends AbstractView {
    constructor(params) {
        super();
        this.itemId = params.id;
        this.type = params.type; // 'post' or 'content'
        this.data = null;
        this.files = []; // File allegati (solo per content)
        this.comments = [];
        this.currentUser = null;
        this.setTitle("Caricamento...");
    }

    async init() {
        // Check authentication
        const token = localStorage.getItem('auth_token');
        if (token) {
            try {
                const response = await apiFetch('/api/auth/me');
                if (response.ok) {
                    const data = await response.json();
                    this.currentUser = data.data?.user;
                }
            } catch (error) {
                console.error('Error checking auth:', error);
            }
        }

        await this.loadData();
        await this.loadComments();
        
        // Dopo aver caricato i dati, aggiorna la vista
        await this.updateView();
    }
    
    async updateView() {
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = await this.getHtml();
            await this.afterRender();
        }
    }

    async loadData() {
        try {
            const endpoint = this.type === 'content' ? `/api/content/${this.itemId}` : `/api/posts/${this.itemId}`;
            const response = await apiFetch(endpoint);
            
            if (response.ok) {
                const result = await response.json();
                this.data = this.type === 'content' ? result.data.content : result.data.post;
                
                // Carica i file allegati (sia per content che per post)
                if (result.data.files) {
                    this.files = result.data.files;
                    console.log('📎 Files loaded:', this.files.length);
                }
                
                console.log('📝 Post/Content data loaded:', this.data);
                console.log('👤 Author avatar URL:', this.data.author_avatar);
                this.setTitle(this.data.title);
                
                // Traccia la visualizzazione (solo una volta per utente)
                this.trackView();
            } else {
                this.data = null;
            }
        } catch (error) {
            console.error('Error loading data:', error);
            this.data = null;
        }
    }
    
    async trackView() {
        // Sistema di tracking: conta solo una visualizzazione per utente per contenuto
        const viewKey = `viewed_${this.type}_${this.itemId}`;
        const hasViewed = localStorage.getItem(viewKey);
        
        if (!hasViewed) {
            // Marca come visualizzato prima di fare la chiamata
            localStorage.setItem(viewKey, Date.now().toString());
            
            // Incrementa il contatore delle visualizzazioni sul backend
            try {
                const endpoint = this.type === 'content' 
                    ? `/api/content/${this.itemId}/view`
                    : `/api/posts/${this.itemId}/view`;
                
                await apiFetch(endpoint, { method: 'POST' });
            } catch (error) {
                console.error('Error tracking view:', error);
            }
        }
    }

    async loadComments() {
        try {
            const endpoint = this.type === 'content' 
                ? `/api/comments/content/${this.itemId}`
                : `/api/comments/post/${this.itemId}`;
            
            const response = await apiFetch(endpoint);
            if (response.ok) {
                const data = await response.json();
                this.comments = data.data?.comments || [];
                console.log('💬 Comments loaded:', this.comments.length);
                if (this.comments.length > 0) {
                    console.log('First comment avatar:', this.comments[0].avatar_url);
                }
            }
        } catch (error) {
            console.error('Error loading comments:', error);
            this.comments = [];
        }
    }

    async getHtml() {
        // Mostra loading se i dati non sono ancora stati caricati
        if (!this.data) {
            return `
                <div class="container mt-5">
                    <div class="text-center">
                        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                            <span class="visually-hidden">Caricamento...</span>
                        </div>
                        <p class="mt-3">Caricamento ${this.type === 'content' ? 'contenuto' : 'post'}...</p>
                    </div>
                </div>
            `;
        }

        const shareUrl = `${window.location.origin}/${this.type}/${this.itemId}`;
        
        return `
            <div class="container mt-4 mb-5">
                <div class="row">
                    <!-- Main Content -->
                    <div class="col-lg-8">
                        <!-- Article Header -->
                        <article class="blog-post">
                            <h1 class="display-5 fw-bold mb-3">${this.data.title}</h1>
                            
                            <div class="d-flex align-items-center text-muted mb-4">
                                <img src="${this.data.author_avatar ? `${API_BASE}${this.data.author_avatar}?t=${Date.now()}` : '/static/img/avatar.png'}" 
                                     alt="${this.data.author_username || 'Autore'}" 
                                     class="rounded-circle me-2" 
                                     width="40" height="40"
                                     style="object-fit: cover;">
                                <div>
                                    <div class="fw-bold">${(`${this.data.author_first_name || this.data.author_name || ''} ${this.data.author_last_name || this.data.author_surname || ''}`).trim() || 'Autore'}</div>
                                    <small>${new Date(this.data.published_at || this.data.created_at).toLocaleDateString('it-IT', { 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}</small>
                                </div>
                                ${this.data.view_count ? `
                                    <span class="ms-auto">
                                        <i class="fas fa-eye"></i> ${this.data.view_count} visualizzazioni
                                    </span>
                                ` : ''}
                            </div>

                            ${(this.data.featured_image_url || this.data.image_url || this.data.image) ? `
                                <img src="${this.data.featured_image_url || this.data.image_url || this.data.image}" 
                                     alt="${this.data.title}" 
                                     class="img-fluid rounded mb-4">
                            ` : ''}

                            <div class="blog-content">
                                <p class="lead">${this.data.content || this.data.description || ''}</p>
                            </div>

                            ${this.data.tags && this.data.tags.length > 0 ? `
                                <div class="mt-4">
                                    <strong>Tags:</strong>
                                    ${this.data.tags.map(tag => `<span class="badge bg-secondary me-1">${tag}</span>`).join('')}
                                </div>
                            ` : ''}

                            <!-- File Allegati -->
                            ${this.files && this.files.length > 0 ? `
                                <div class="card mt-4">
                                    <div class="card-header bg-light">
                                        <h5 class="mb-0">
                                            <i class="fas fa-paperclip"></i> File Allegati (${this.files.length})
                                        </h5>
                                    </div>
                                    <div class="card-body">
                                        <div class="list-group list-group-flush">
                                            ${this.files.map(file => `
                                                <a href="${API_BASE}${file.file_path}" 
                                                   target="_blank" 
                                                   class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                                                    <div class="d-flex align-items-center">
                                                        <i class="fas fa-${this.getFileIcon(file.mime_type)} fa-2x me-3 text-primary"></i>
                                                        <div>
                                                            <div class="fw-bold">${file.file_name}</div>
                                                            <small class="text-muted">
                                                                ${this.formatFileSize(file.file_size)} • 
                                                                ${new Date(file.uploaded_at).toLocaleDateString('it-IT')}
                                                            </small>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <i class="fas fa-download"></i>
                                                    </div>
                                                </a>
                                            `).join('')}
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        </article>

                        <!-- Comments Section -->
                        <div class="comments-section mt-5">
                            <h3 class="mb-4">
                                <i class="fas fa-comments"></i> Commenti (${this.comments.length})
                            </h3>

                            ${this.currentUser ? `
                                <div class="card mb-4">
                                    <div class="card-body">
                                        <h5>Lascia un commento</h5>
                                        <form id="comment-form">
                                            <div class="mb-3">
                                                <textarea class="form-control" id="comment-content" rows="3" 
                                                          placeholder="Scrivi il tuo commento..." required></textarea>
                                            </div>
                                            <button type="submit" class="btn btn-primary">
                                                <i class="fas fa-paper-plane"></i> Invia Commento
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            ` : `
                                <div class="alert alert-info">
                                    <i class="fas fa-info-circle"></i>
                                    <a href="/login" data-link>Accedi</a> per lasciare un commento
                                </div>
                            `}

                            <div id="comments-list">
                                ${this.renderComments()}
                            </div>
                        </div>
                    </div>

                    <!-- Sidebar -->
                    <div class="col-lg-4">
                        <div class="sticky-top" style="top: 20px;">
                            <!-- Share Buttons -->
                            <div class="card mb-4">
                                <div class="card-body">
                                    <h5 class="card-title"><i class="fas fa-share-alt"></i> Condividi</h5>
                                    <div class="d-grid gap-2">
                                        <button class="btn btn-primary share-btn" data-platform="facebook">
                                            <i class="fab fa-facebook-f"></i> Facebook
                                        </button>
                                        <button class="btn btn-info share-btn" data-platform="twitter">
                                            <i class="fab fa-twitter"></i> Twitter
                                        </button>
                                        <button class="btn btn-success share-btn" data-platform="whatsapp">
                                            <i class="fab fa-whatsapp"></i> WhatsApp
                                        </button>
                                        <button class="btn btn-primary share-btn" data-platform="linkedin">
                                            <i class="fab fa-linkedin-in"></i> LinkedIn
                                        </button>
                                        <button class="btn btn-secondary" id="copy-link-btn">
                                            <i class="fas fa-link"></i> Copia Link
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Author Info -->
                            <div class="card mb-4">
                                <div class="card-body text-center">
                                    <img src="${this.data.author_avatar ? `${API_BASE}${this.data.author_avatar}?t=${Date.now()}` : '/static/img/avatar.png'}" 
                                         alt="${this.data.author_username || 'Autore'}" 
                                         class="rounded-circle mb-3" 
                                         width="80" height="80"
                                         style="object-fit: cover;">
                                    <h5>${(`${this.data.author_first_name || this.data.author_name || ''} ${this.data.author_last_name || this.data.author_surname || ''}`).trim() || 'Autore'}</h5>
                                    <p class="text-muted">@${this.data.author_username || this.data.username || 'user'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getFileIcon(mimeType) {
        if (!mimeType) return 'file';
        
        if (mimeType.includes('pdf')) return 'file-pdf';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'file-word';
        if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'file-excel';
        if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'file-powerpoint';
        if (mimeType.includes('image')) return 'file-image';
        if (mimeType.includes('video')) return 'file-video';
        if (mimeType.includes('audio')) return 'file-audio';
        if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'file-archive';
        if (mimeType.includes('text')) return 'file-alt';
        
        return 'file';
    }

    formatFileSize(bytes) {
        if (!bytes) return '0 B';
        
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    renderComments() {
        if (this.comments.length === 0) {
            return `
                <p class="text-muted">
                    <i class="fas fa-comment-slash"></i> Nessun commento. Sii il primo a commentare!
                </p>
            `;
        }

        return this.comments.map(comment => {
            // Costruisci l'URL dell'avatar con cache busting
            const avatarUrl = comment.avatar_url 
                ? `${API_BASE}${comment.avatar_url}?t=${Date.now()}` 
                : '/static/img/avatar.png';
            
            return `
            <div class="card mb-3 comment-card" data-comment-id="${comment.id}">
                <div class="card-body">
                    <div class="d-flex align-items-start">
                        <img src="${avatarUrl}" 
                             alt="${comment.username}" 
                             class="rounded-circle me-3" 
                             width="40" height="40"
                             style="object-fit: cover;">
                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <strong>${comment.first_name || ''} ${comment.last_name || ''}</strong>
                                <small class="text-muted">
                                    ${new Date(comment.created_at).toLocaleString('it-IT')}
                                </small>
                            </div>
                            <p class="mb-2">${comment.content}</p>
                            ${this.currentUser && (this.currentUser.id === comment.user_id || this.currentUser.role === 'admin') ? `
                                <button class="btn btn-sm btn-outline-danger delete-comment-btn" 
                                        data-comment-id="${comment.id}">
                                    <i class="fas fa-trash"></i> Elimina
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `}).join('');
    }

    async afterRender() {
        // Share buttons event listeners
        document.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const platform = btn.dataset.platform;
                const url = `${window.location.origin}/${this.type}/${this.itemId}`;
                shareToSocial(platform, url, this.data.title);
            });
        });

        // Copy link button
        const copyLinkBtn = document.getElementById('copy-link-btn');
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', async () => {
                const url = `${window.location.origin}/${this.type}/${this.itemId}`;
                const success = await copyToClipboard(url);
                if (success) {
                    showCopySuccess('Link copiato negli appunti!');
                }
            });
        }

        // Comment form
        const commentForm = document.getElementById('comment-form');
        if (commentForm) {
            commentForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.submitComment();
            });
        }

        // Event delegation per i pulsanti elimina commento (evita duplicati)
        const commentsList = document.getElementById('comments-list');
        if (commentsList) {
            commentsList.addEventListener('click', async (e) => {
                if (e.target.closest('.delete-comment-btn')) {
                    const commentId = e.target.closest('.delete-comment-btn').dataset.commentId;
                    await this.handleDeleteComment(commentId);
                }
            });
        }
    }

    async submitComment() {
        if (this._submittingComment) return;
        const contentEl = document.getElementById('comment-content');
        const submitBtn = document.querySelector('#comment-form button[type="submit"]');
        const content = contentEl?.value?.trim();
        if (!content) return;

        this._submittingComment = true;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Invio...';
        }

        try {
            const endpoint = this.type === 'content' 
                ? `/api/comments/content/${this.itemId}`
                : `/api/comments/post/${this.itemId}`;
            
            const response = await apiFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify({ content })
            });

            if (response.ok) {
                if (contentEl) contentEl.value = '';
                await this.loadComments();
                const listEl = document.getElementById('comments-list');
                if (listEl) listEl.innerHTML = this.renderComments();
            } else {
                const error = await response.json();
                alert('Errore: ' + (error.message || 'Impossibile aggiungere il commento'));
            }
        } catch (error) {
            console.error('Error submitting comment:', error);
            alert('Errore nell\'invio del commento');
        } finally {
            this._submittingComment = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Invia Commento';
            }
        }
    }
    
    async handleDeleteComment(commentId) {
        if (!confirm('Sei sicuro di voler eliminare questo commento?')) return;

        try {
            const response = await apiFetch(`/api/comments/${commentId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await this.loadComments();
                document.getElementById('comments-list').innerHTML = this.renderComments();
                // Non serve ri-inizializzare listener, usiamo event delegation!
            } else {
                const error = await response.json();
                alert('Errore: ' + (error.message || 'Impossibile eliminare il commento'));
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
            alert('Errore nell\'eliminazione del commento');
        }
    }
}

