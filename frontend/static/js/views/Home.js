import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
    constructor() {
        super();
        this.setTitle("Home - Africa Unita");
        this.posts = [];
    }

    async loadPosts() {
        try {
            const params = new URLSearchParams(window.location.search);
            const search = params.get('search');
            const query = search ? `?search=${encodeURIComponent(search)}` : '';
            const response = await fetch(`/api/posts${query}`);
            if (!response.ok) throw new Error('Errore nel caricamento dei post');
            const payload = await response.json();
            this.posts = payload?.data?.posts || [];
        } catch (error) {
            console.error('Errore caricamento post:', error);
            this.posts = [];
        }
    }

    async getHtml() {
        await this.loadPosts();

        const cards = this.posts.map(p => `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100 shadow-sm">
                    ${p.image_url ? `<img class=\"card-img-top\" src=\"${p.image_url}\" alt=\"${p.title}\">` : ''}
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${p.title}</h5>
                        <p class="card-text text-muted">${(p.description || '').slice(0, 140)}${(p.description||'').length>140?'...':''}</p>
                        <div class="mt-auto d-flex justify-content-between small text-muted">
                            <span><i class="fas fa-folder"></i> ${p.category}</span>
                            <span><i class="fas fa-clock"></i> ${new Date(p.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        return `
        <div class="container py-5">
            <div class="text-center mb-4">
                <h1 class="fw-bold">Africa Unita</h1>
                <p class="text-muted">Supporto a migranti africani: alloggio, formazione, lavoro, servizi, eventi.</p>
            </div>
            <div class="row g-4">
                ${cards || '<div class="col-12"><div class="alert alert-info">Nessun contenuto disponibile al momento.</div></div>'}
            </div>
        </div>`;
    }
}
