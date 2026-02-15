import AbstractView from "./AbstractView.js";
import { apiFetch, API_BASE } from "../index.js";

export default class extends AbstractView {
    constructor() {
        super();
        this.setTitle("Home - Africa Unita");
        this.posts = [];
        this.siteContent = [];
        this.meetings = [];
        this.stats = {
            members: 0,
            events: 0,
            opportunities: 0,
            countries: 54
        };
    }

    async loadStats() {
        try {
            const response = await apiFetch('/api/stats');
            if (response.ok) {
                const payload = await response.json();
                const data = payload?.data || {};
                this.stats.members = parseInt(data.members, 10) || 0;
                this.stats.events = parseInt(data.events, 10) || 0;
            }
        } catch (error) {
            console.error('Errore caricamento statistiche:', error);
        }
    }

    async loadPosts() {
        try {
            const params = new URLSearchParams(window.location.search);
            const search = params.get('search');
            const query = search ? `?search=${encodeURIComponent(search)}` : '';
            const response = await apiFetch(`/api/posts${query}`);
            if (!response.ok) throw new Error('Errore nel caricamento dei post');
            const payload = await response.json();
            this.posts = payload?.data?.posts || [];
        } catch (error) {
            console.error('Errore caricamento post:', error);
            this.posts = [];
        }
    }

    async loadSiteContent() {
        try {
            const params = new URLSearchParams(window.location.search);
            const search = params.get('search');
            
            // Se c'è una ricerca, cerca anche nei contenuti
            let query = '';
            if (search) {
                query = `?search=${encodeURIComponent(search)}`;
            } else {
                query = '?limit=6';
            }
            
            const response = await apiFetch(`/api/content${query}`);
            if (response.ok) {
                const data = await response.json();
                this.siteContent = data.data?.content || [];
            }
        } catch (error) {
            console.error('Errore caricamento contenuti:', error);
            this.siteContent = [];
        }
    }

    async loadMeetings() {
        try {
            // Carica solo le riunioni future programmate
            const response = await apiFetch('/api/meetings?status=scheduled');
            if (response.ok) {
                const data = await response.json();
                // Prendi solo le prossime 3 riunioni
                this.meetings = (data.data?.meetings || [])
                    .filter(m => new Date(m.meeting_date) >= new Date())
                    .slice(0, 3);
            }
        } catch (error) {
            console.error('Errore caricamento riunioni:', error);
            this.meetings = [];
        }
    }

    getContentTypeBadge(type) {
        const badges = {
            'post': '<span class="badge bg-primary"><i class="fas fa-newspaper"></i> Post</span>',
            'photo': '<span class="badge bg-success"><i class="fas fa-image"></i> Foto</span>',
            'video': '<span class="badge bg-danger"><i class="fas fa-video"></i> Video</span>',
            'document': '<span class="badge bg-info"><i class="fas fa-file-pdf"></i> Documento</span>',
            'announcement': '<span class="badge bg-warning text-dark"><i class="fas fa-bullhorn"></i> Annuncio</span>'
        };
        return badges[type] || '<span class="badge bg-secondary">Altro</span>';
    }

    async getHtml() {
        await Promise.all([
            this.loadStats(),
            this.loadPosts(),
            this.loadSiteContent(),
            this.loadMeetings()
        ]);
        
        // Aggiorna statistiche dinamiche: membri e eventi da API, opportunità = numero post
        this.stats.opportunities = this.posts.length;
        
        // Controlla se c'è una ricerca attiva
        const params = new URLSearchParams(window.location.search);
        const searchTerm = params.get('search');

        // Cards per Site Content (News e Comunicazioni)
        const contentCards = this.siteContent.map(c => `
            <div class="col-md-6 col-lg-4">
                <a href="/content/${c.id}" data-link class="text-decoration-none">
                    <div class="card h-100 shadow-sm border-primary clickable-card">
                        ${c.featured_image_url ? `<img class="card-img-top" src="${c.featured_image_url}" alt="${c.title}" style="max-height: 200px; object-fit: cover;">` : ''}
                        <div class="card-body d-flex flex-column">
                            <div class="mb-2">${this.getContentTypeBadge(c.content_type)}</div>
                            <h5 class="card-title text-dark">${c.title}</h5>
                            <p class="card-text text-muted">${(c.content || '').slice(0, 120)}${(c.content||'').length>120?'...':''}</p>
                            <div class="mt-auto">
                                <div class="d-flex justify-content-between align-items-center small text-muted mb-2">
                                    <span><i class="fas fa-user"></i> ${c.author_name || c.author_first_name || ''} ${c.author_surname || c.author_last_name || ''}</span>
                                    <span><i class="fas fa-eye"></i> ${c.view_count || 0}</span>
                                </div>
                                <div class="small text-muted">
                                    <i class="fas fa-clock"></i> ${new Date(c.published_at || c.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>
                </a>
            </div>
        `).join('');

        // Cards per Posts (Opportunità e Servizi)
        const postCards = this.posts.map(p => `
            <div class="col-md-6 col-lg-4">
                <a href="/post/${p.id}" data-link class="text-decoration-none">
                    <div class="card h-100 shadow-sm clickable-card">
                        ${p.image_url || p.image ? `<img class="card-img-top" src="${p.image_url || p.image}" alt="${p.title}" style="max-height: 200px; object-fit: cover;">` : ''}
                    <div class="card-body d-flex flex-column">
                            <h5 class="card-title text-dark">${p.title}</h5>
                        <p class="card-text text-muted">${(p.description || '').slice(0, 140)}${(p.description||'').length>140?'...':''}</p>
                        <div class="mt-auto">
                            <div class="d-flex justify-content-between align-items-center small text-muted mb-1">
                                <span><i class="fas fa-user"></i> ${(`${p.author_name || ''} ${p.author_surname || ''}`).trim() || '—'}</span>
                                <span><i class="fas fa-folder"></i> ${p.category}</span>
                            </div>
                            <div class="small text-muted">
                                <i class="fas fa-clock"></i> ${new Date(p.created_at).toLocaleDateString()}
                            </div>
                        </div>
                                        </div>
                                                    </div>
                </a>
                                                </div>
        `).join('');

        return `
        <!-- Hero Carousel -->
        <div id="heroCarousel" class="carousel slide carousel-fade mb-5" data-bs-ride="carousel">
            <div class="carousel-indicators">
                <button type="button" data-bs-target="#heroCarousel" data-bs-slide-to="0" class="active"></button>
                <button type="button" data-bs-target="#heroCarousel" data-bs-slide-to="1"></button>
                <button type="button" data-bs-target="#heroCarousel" data-bs-slide-to="2"></button>
            </div>
            <div class="carousel-inner">
                <div class="carousel-item active">
                    <div class="carousel-slide" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <div class="carousel-content">
                            <h1 class="display-3 fw-bold text-white mb-4 animate-slide-up">Benvenuti in Africa Unita</h1>
                            <p class="lead text-white mb-4 animate-fade-in">UBUNTU - Io sono perché noi siamo</p>
                            <a href="/register" data-link class="btn btn-light btn-lg px-5 animate-scale">
                                <i class="fas fa-user-plus"></i> Diventa Membro
                            </a>
                        </div>
                    </div>
                </div>
                <div class="carousel-item">
                    <div class="carousel-slide" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                        <div class="carousel-content">
                            <h1 class="display-3 fw-bold text-white mb-4">Sostegno e Comunità</h1>
                            <p class="lead text-white mb-4">Supporto per alloggio, formazione, lavoro e servizi</p>
                            <a href="#opportunities" class="btn btn-light btn-lg px-5 scroll-to">
                                <i class="fas fa-briefcase"></i> Scopri le Opportunità
                            </a>
                        </div>
                    </div>
                </div>
                <div class="carousel-item">
                    <div class="carousel-slide" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                        <div class="carousel-content">
                            <h1 class="display-3 fw-bold text-white mb-4">Costruiamo Insieme</h1>
                            <p class="lead text-white mb-4">Una comunità di supporto e integrazione</p>
                            <a href="/my-posts" data-link class="btn btn-light btn-lg px-5">
                                <i class="fas fa-bullhorn"></i> Pubblica un Annuncio
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            <button class="carousel-control-prev" type="button" data-bs-target="#heroCarousel" data-bs-slide="prev">
                <span class="carousel-control-prev-icon"></span>
                <span class="visually-hidden">Previous</span>
            </button>
            <button class="carousel-control-next" type="button" data-bs-target="#heroCarousel" data-bs-slide="next">
                <span class="carousel-control-next-icon"></span>
                <span class="visually-hidden">Next</span>
            </button>
        </div>

        <div class="container py-5">
            <!-- Search Results Message -->
            ${searchTerm ? `
                <div class="alert alert-info shadow-sm mb-4 animate-fade-in">
                    <div class="d-flex align-items-center justify-content-between">
                        <div>
                            <i class="fas fa-search me-2"></i>
                            <strong>Risultati per:</strong> "${searchTerm}"
                            <span class="ms-3 text-muted">
                                (${this.siteContent.length + this.posts.length} risultati totali: 
                                ${this.siteContent.length} news/comunicazioni, ${this.posts.length} annunci)
                            </span>
                        </div>
                        <a href="/" data-link class="btn btn-sm btn-outline-secondary">
                            <i class="fas fa-times"></i> Cancella ricerca
                        </a>
                    </div>
                </div>
            ` : ''}
            
            <!-- Statistics Section -->
            <div class="stats-section mb-5 animate-on-scroll">
                <div class="row text-center g-4">
                    <div class="col-md-3 col-6">
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-users"></i>
                            </div>
                            <div class="stat-number" data-target="${this.stats.members}">0</div>
                            <div class="stat-label">Membri</div>
                        </div>
                    </div>
                    <div class="col-md-3 col-6">
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-calendar-check"></i>
                            </div>
                            <div class="stat-number" data-target="${this.stats.events}">0</div>
                            <div class="stat-label">Eventi Organizzati</div>
                        </div>
                    </div>
                    <div class="col-md-3 col-6">
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-briefcase"></i>
                            </div>
                            <div class="stat-number" data-target="${this.stats.opportunities}">0</div>
                            <div class="stat-label">Opportunità Attive</div>
                        </div>
                    </div>
                    <div class="col-md-3 col-6">
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-globe-africa"></i>
                            </div>
                            <div class="stat-number" data-target="${this.stats.countries}">0</div>
                            <div class="stat-label">Paesi Rappresentati</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sezione Prossime Riunioni -->
            ${this.meetings.length > 0 ? `
                <div class="mb-5 animate-on-scroll">
                    <div class="section-header text-center mb-5">
                        <span class="section-badge">📅 RIUNIONI</span>
                        <h2 class="section-title mt-3">Prossime Riunioni</h2>
                        <p class="section-subtitle">Partecipa agli incontri mensili dell'associazione</p>
                    </div>
                    <div class="row g-4">
                        ${this.meetings.map(meeting => {
                            const date = new Date(meeting.meeting_date);
                            const dateStr = date.toLocaleDateString('it-IT', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            });
                            return `
                                <div class="col-md-4">
                                    <div class="card h-100 shadow-sm border-primary">
                                        <div class="card-body">
                                            <div class="d-flex justify-content-between align-items-start mb-3">
                                                <span class="badge bg-primary">
                                                    <i class="fas fa-calendar-check"></i> Programmata
                                                </span>
                                                <div class="text-end">
                                                    <div class="fw-bold text-primary">${date.getDate()}</div>
                                                    <div class="small text-muted">${date.toLocaleDateString('it-IT', { month: 'short' })}</div>
                                                </div>
                                            </div>
                                            <h5 class="card-title text-dark">${meeting.title}</h5>
                                            <p class="card-text text-muted small mb-3">
                                                ${meeting.description ? (meeting.description.slice(0, 100) + (meeting.description.length > 100 ? '...' : '')) : 'Riunione mensile dell\'associazione'}
                                            </p>
                                            <div class="meeting-info">
                                                <p class="mb-2 small">
                                                    <i class="fas fa-calendar text-primary"></i> 
                                                    <strong>${dateStr}</strong>
                                                </p>
                                                ${meeting.meeting_time ? `
                                                    <p class="mb-2 small">
                                                        <i class="fas fa-clock text-primary"></i> 
                                                        ${meeting.meeting_time}
                                                    </p>
                                                ` : ''}
                                                ${meeting.location ? `
                                                    <p class="mb-2 small">
                                                        <i class="fas fa-map-marker-alt text-primary"></i> 
                                                        ${meeting.location}
                                                    </p>
                                                ` : ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    ${window.currentUser && ['moderator', 'admin'].includes(window.currentUser.role) ? `
                        <div class="text-center mt-4">
                            <a href="/meetings" data-link class="btn btn-outline-primary">
                                <i class="fas fa-cog"></i> Gestisci Riunioni
                            </a>
                        </div>
                    ` : ''}
                </div>
            ` : ''}

            <!-- Sezione News e Comunicazioni -->
            ${this.siteContent.length > 0 ? `
                <div class="mb-5 animate-on-scroll">
                    <div class="section-header text-center mb-5">
                        <span class="section-badge">📢 NEWS</span>
                        <h2 class="section-title mt-3">Ultime News e Comunicazioni</h2>
                        <p class="section-subtitle">Rimani aggiornato sulle novità dell'associazione</p>
                    </div>
                    <div class="row g-4">
                        ${contentCards}
                    </div>
                </div>
            ` : ''}

            <!-- Sezione Opportunità e Servizi -->
            <div class="mb-5 animate-on-scroll" id="opportunities">
                <div class="section-header text-center mb-5">
                    <span class="section-badge">💼 OPPORTUNITÀ</span>
                    <h2 class="section-title mt-3">Opportunità e Servizi</h2>
                    <p class="section-subtitle">Scopri annunci di lavoro, alloggio, formazione e molto altro</p>
                </div>
            <div class="row g-4">
                    ${postCards.length > 0 ? postCards : '<div class="col-12"><div class="alert alert-info"><i class="fas fa-info-circle"></i> Nessuna opportunità disponibile al momento.</div></div>'}
                </div>
            </div>
            
            <!-- Call to Action -->
            <div class="cta-section animate-on-scroll">
                <div class="cta-card">
                    <h3 class="cta-title">Vuoi contribuire alla comunità?</h3>
                    <p class="cta-text">Pubblica un annuncio, partecipa agli eventi o diventa volontario!</p>
                    <div class="cta-buttons">
                        <a href="/my-posts" data-link class="btn btn-primary btn-lg me-3">
                            <i class="fas fa-bullhorn"></i> Pubblica Annuncio
                        </a>
                        <a href="#about" class="btn btn-outline-primary btn-lg">
                            <i class="fas fa-info-circle"></i> Scopri di Più
                        </a>
                    </div>
                </div>
                            </div>
        </div>`;
    }
    
    async afterRender() {
        this.initAnimations();
        this.initStatCounters();
        this.initScrollToLinks();
    }
    
    initAnimations() {
        // Intersection Observer per animazioni on scroll
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);
        
        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            observer.observe(el);
        });
    }
    
    initStatCounters() {
        const counters = document.querySelectorAll('.stat-number');
        const animationDuration = 2000; // 2 secondi
        
        const observerOptions = {
            threshold: 0.5
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counter = entry.target;
                    const target = parseInt(counter.dataset.target);
                    const increment = target / (animationDuration / 16); // 60fps
                    let current = 0;
                    
                    const updateCounter = () => {
                        current += increment;
                        if (current < target) {
                            counter.textContent = Math.floor(current);
                            requestAnimationFrame(updateCounter);
                        } else {
                            counter.textContent = target;
                        }
                    };
                    
                    updateCounter();
                    observer.unobserve(counter);
                }
            });
        }, observerOptions);
        
        counters.forEach(counter => observer.observe(counter));
    }
    
    initScrollToLinks() {
        document.querySelectorAll('.scroll-to').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }
}
