import Home from "./views/Home.js";
import Login from "./views/Login.js";
import Profile from "./views/Profile.js";
import Register from "./views/Register.js";
import ResetPassword from "./views/ResetPassword.js";
import ChangePassword from "./views/ChangePassword.js";
import Messages from "./views/Messages.js";
import AdminUsers from "./views/AdminUsers.js";
import AdminStats from "./views/AdminStats.js";
import Treasurer from "./views/Treasurer.js";
import Users from "./views/Users.js";
import UserProfile from "./views/UserProfile.js";
import Moderator from "./views/Moderator.js";
import PostDetail from "./views/PostDetail.js";
import MyPosts from "./views/MyPosts.js";
import Meetings from "./views/Meetings.js";
import MyLoans from "./views/MyLoans.js";
import EmailVerification from "./views/EmailVerification.js";
import { initInactivityLogout } from "./inactivityLogout.js";

const pathToRegex = path => new RegExp("^" + path.replace(/\//g, "\\/").replace(/:\w+/g, "(.+)") + "$")
const getParams = match => {
    const values = match.result.slice(1)
    const keys = Array.from(match.route.path.matchAll(/:(\w+)/g)).map(result => result[1])
    return Object.fromEntries(keys.map((key, i) => {
        return [key, values[i]]
    }))
}

export const navigateTo = path => {
    history.pushState(null, null, path)
    router().then(_ => console.log)
}

// Backend API base URL - Railway production only
// Railway serve sia frontend che backend sullo stesso dominio
export const API_BASE = window.location.origin;

// Helper per chiamate API sempre verso il backend
export async function apiFetch(path, options = {}) {
    const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
    
    // Aggiungi automaticamente il token JWT se presente
    const token = localStorage.getItem('auth_token');
    if (token) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
    }
    
    // Aggiungi Content-Type per JSON se non è FormData
    if (options.body && !(options.body instanceof FormData)) {
        options.headers = {
            ...options.headers,
            'Content-Type': 'application/json'
        };
    }
    
    return fetch(url, options);
}

const router = async () => {
    const routes = [
        {
            path: "/",
            view: Home
        },
        {
            path: "/login",
            view: Login
        },
        {
            path: "/register",
            view: Register
        },
        {
            path: "/profile",
            view: Profile,
            requiresAuth: true
        },
        {
            path: "/reset-password",
            view: ResetPassword
        },
        {
            path: "/change-password",
            view: ChangePassword,
            requiresAuth: true
        },
        {
            path: "/verify-email",
            view: EmailVerification
        },
        {
            path: "/messages",
            view: Messages,
            requiresAuth: true
        },
        {
            path: "/my-posts",
            view: MyPosts,
            requiresAuth: true
        },
        {
            path: "/my-loans",
            view: MyLoans,
            requiresAuth: true
        },
        {
            path: "/admin/users",
            view: AdminUsers,
            requiresAuth: true,
            requiresAdmin: true
        },
        {
            path: "/admin/stats",
            view: AdminStats,
            requiresAuth: true,
            requiresAdmin: true
        },
        {
            path: "/treasurer",
            view: Treasurer,
            requiresAuth: true,
            requiresTreasurer: true
        },
        {
            path: "/users",
            view: Users,
            requiresAuth: true
        },
        {
            path: "/profile/:id",
            view: UserProfile,
            requiresAuth: true
        },
        {
            path: "/moderator",
            view: Moderator,
            requiresAuth: true,
            requiresModerator: true
        },
        {
            path: "/meetings",
            view: Meetings,
            requiresAuth: true,
            requiresModerator: true
        },
        {
            path: "/post/:id",
            view: PostDetail
        },
        {
            path: "/content/:id",
            view: PostDetail
        }
    ]

    // Test each route for potential match
    const potentialMatches = routes.map(route => {
        return {
            route: route,
            result: location.pathname.match(pathToRegex(route.path))
        }
    })

    let match = potentialMatches.find(potentialMatch => potentialMatch.result !== null)

    if (!match) {
        match = {
            route: routes[0],
            result: [location.pathname]
        }
    }

    // Check authentication for protected routes
    if (match.route.requiresAuth) {
        const session = await checkSession()
        console.log("Checking auth for protected route:", {
            path: match.route.path,
            authenticated: session.authenticated,
            user: session.user,
            isAdmin: session.isAdmin
        })

        if (!session.authenticated) {
            console.log("Access denied - redirecting to login")
            navigateTo("/login")
            return
        }

        // Check admin access for admin routes
        if (match.route.requiresAdmin && session.user.role !== 'admin' && session.user.role !== 'amministratore') {
            console.log("Admin access denied - redirecting to home")
            navigateTo("/")
            return
        }

        // Check treasurer access for treasurer routes
        if (match.route.requiresTreasurer && session.user.role !== 'treasurer' && session.user.role !== 'admin') {
            console.log("Treasurer access denied - redirecting to home")
            navigateTo("/")
            return
        }

        // Check moderator access for moderator routes
        if (match.route.requiresModerator && !['moderator', 'admin'].includes(session.user.role)) {
            console.log("Moderator access denied - redirecting to home")
            navigateTo("/")
            return
        }

        // Se l'utente è autenticato e ha i permessi necessari, procedi
        console.log("Access granted - proceeding to route")
    }

    const params = getParams(match);
    
    // Aggiungi il tipo per le route di dettaglio
    if (match.route.path === "/post/:id") {
        params.type = 'post';
    } else if (match.route.path === "/content/:id") {
        params.type = 'content';
    }
    
    const view = new match.route.view(params)
    
    // Clear the app container before loading new view
    const appContainer = document.querySelector("#app")
    appContainer.innerHTML = await view.getHtml()
    
    // Initialize the view
    if (typeof view.init === "function") {
        await view.init()
    }
    
    // Call afterRender if it exists
    if (typeof view.afterRender === "function") {
        await view.afterRender()
    }
}

document.addEventListener('DOMContentLoaded', function() {
    
});

window.addEventListener("popstate", () => router())

function closeNavbarCollapse() {
    const navbarCollapse = document.getElementById('navbarNav');
    if (navbarCollapse && window.bootstrap?.Collapse) {
        const instance = bootstrap.Collapse.getInstance(navbarCollapse);
        if (instance) instance.hide();
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    // Sposta qui l'inizializzazione del modal "Chi Siamo" (niente inline script per CSP)
    const aboutLinks = document.querySelectorAll('a[href="#about"]');
    const aboutModalEl = document.getElementById('aboutModal');
    if (aboutModalEl && window.bootstrap?.Modal) {
        aboutModalEl.addEventListener('hidden.bs.modal', () => {
            // Rimuovi l'hash #about dall'URL e aggiorna la vista così la pagina si aggiorna alla chiusura
            if (window.location.hash === '#about' || window.location.hash === '#') {
                history.replaceState(null, null, window.location.pathname + window.location.search);
            }
            router();
        });
    }
    aboutLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            closeNavbarCollapse();
            if (aboutModalEl && window.bootstrap?.Modal) {
                const aboutModal = bootstrap.Modal.getOrCreateInstance(aboutModalEl);
                aboutModal.show();
            }
        });
    });
    document.body.addEventListener("click", e => {
        const link = e.target.closest("[data-link]");
        if (link) {
            e.preventDefault();
            closeNavbarCollapse();
            navigateTo(link.href);
        }
    });

    // Search form handler
    const searchForm = document.getElementById("search-form");
    if (searchForm) {
        searchForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            closeNavbarCollapse();
            const searchInput = document.getElementById("search-input");
            const searchTerm = searchInput.value.trim();
            
            if (searchTerm) {
                navigateTo(`/?search=${encodeURIComponent(searchTerm)}`);
            }
        });
    }

    const logoutButton = document.getElementById("logout")
    const loginButton = document.getElementById("btnLogin")
    const profileButton = document.getElementById("profile-link")
    const registerButton = document.getElementById("btnRegister")
    const messagesButton = document.getElementById("btnMessages")
    const usersButton = document.getElementById("btnUsers")
    const myPostsButton = document.getElementById("btnMyPosts")
    const moderatorButton = document.getElementById("btnModerator")
    const meetingsButton = document.getElementById("btnMeetings")
    const adminLink = document.getElementById("admin-link")
    const treasurerLink = document.getElementById("treasurer-link")
    const notificationsDropdown = document.getElementById("notifications-dropdown")

    try {
        const token = localStorage.getItem('auth_token')
        
            // Se non c'è token, salta la chiamata API
            if (!token) {
                // User is not logged in
                if (profileButton) profileButton.style.display = "none"
                if (logoutButton) logoutButton.style.display = "none"
                if (messagesButton) messagesButton.style.display = "none"
                if (usersButton) usersButton.style.display = "none"
                if (myPostsButton) myPostsButton.style.display = "none"
                if (moderatorButton) moderatorButton.style.display = "none"
                if (meetingsButton) meetingsButton.style.display = "none"
                if (notificationsDropdown) notificationsDropdown.style.display = "none"
                if (loginButton) loginButton.style.display = "block"
                if (registerButton) registerButton.style.display = "block"
        } else {
            const response = await apiFetch("/api/auth/me", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const payload = await response.json()
                const data = { authenticated: true, user: payload.data?.user }
                console.log("✅ Utente autenticato:", data.user?.username)
                // User is logged in
                if (loginButton) loginButton.style.display = "none"
                if (registerButton) registerButton.style.display = "none"
                if (logoutButton) logoutButton.style.display = "block"
                if (profileButton) profileButton.style.display = "block"
                if (myPostsButton) myPostsButton.style.display = "block"
                if (messagesButton) messagesButton.style.display = "block"
                if (usersButton) usersButton.style.display = "block"
                // Mostra link moderatore e riunioni in base al ruolo
                if (moderatorButton && ['moderator', 'admin'].includes(data.user?.role)) moderatorButton.style.display = "block"
                if (meetingsButton && ['moderator', 'admin'].includes(data.user?.role)) meetingsButton.style.display = "block"
                // Mostra link admin/tesoriere in base al ruolo
                if (adminLink && data.user?.role === 'admin') adminLink.style.display = "block"
                if (treasurerLink && (data.user?.role === 'treasurer' || data.user?.role === 'admin')) treasurerLink.style.display = "block"
                if (notificationsDropdown) notificationsDropdown.style.display = "block"
                initNotifications();
                initInactivityLogout();
            } else {
                // Token scaduto o non valido, rimuovilo
                localStorage.removeItem('auth_token')
                // User is not logged in
                if (profileButton) profileButton.style.display = "none"
                if (logoutButton) logoutButton.style.display = "none"
                if (messagesButton) messagesButton.style.display = "none"
                if (usersButton) usersButton.style.display = "none"
                if (myPostsButton) myPostsButton.style.display = "none"
                if (moderatorButton) moderatorButton.style.display = "none"
                if (meetingsButton) meetingsButton.style.display = "none"
                if (notificationsDropdown) notificationsDropdown.style.display = "none"
                if (loginButton) loginButton.style.display = "block"
                if (registerButton) registerButton.style.display = "block"
            }
        }
    } catch (error) {
        // Solo logga errori di rete reali, non 401
        console.log("⚠️ Controllo sessione fallito (normale se non loggato)")
        // In case of error, show login/register buttons
        if (profileButton) profileButton.style.display = "none"
        if (logoutButton) logoutButton.style.display = "none"
        if (messagesButton) messagesButton.style.display = "none"
        if (myPostsButton) myPostsButton.style.display = "none"
        if (notificationsDropdown) notificationsDropdown.style.display = "none"
        if (loginButton) loginButton.style.display = "block"
        if (registerButton) registerButton.style.display = "block"
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            try {
                const token = localStorage.getItem('auth_token')
                await apiFetch("/api/auth/logout", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    }
                })
                localStorage.removeItem('auth_token')
                
                window.location.href = "/login";
                window.location.reload();
            } catch (error) {
                console.error("Error during logout:", error);
            }
        });
    }

    router().then(_ => console.log)
})

function initNotifications() {
    const toggle = document.getElementById('notifications-toggle');
    const list = document.getElementById('notifications-items');
    const loading = document.getElementById('notifications-loading');
    const empty = document.getElementById('notifications-empty');
    const badge = document.getElementById('notifications-badge');
    const dropdownEl = document.getElementById('notifications-dropdown');

    if (!toggle || !list) return;

    async function fetchAndRender() {
        loading.textContent = 'Caricamento...';
        empty.style.display = 'none';
        list.innerHTML = '';
        try {
            const res = await apiFetch('/api/notifications');
            const data = await res.json();
            if (!res.ok || !data.success) {
                loading.textContent = 'Errore';
                return;
            }
            const { notifications = [], unreadCount } = data.data || {};
            loading.textContent = '';

            if (unreadCount > 0 && badge) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.style.display = 'inline-block';
            } else if (badge) {
                badge.style.display = 'none';
            }

            if (notifications.length === 0) {
                empty.style.display = 'block';
                return;
            }

            notifications.forEach(n => {
                const item = document.createElement('div');
                const isUnread = n.is_read === 0 || n.is_read === false;
                item.className = `dropdown-item ${isUnread ? 'bg-light' : ''} notification-item`;
                item.style.cursor = 'pointer';
                item.style.whiteSpace = 'normal';
                item.dataset.id = n.id;
                item.dataset.link = n.link || '';
                const date = n.created_at ? new Date(n.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
                item.innerHTML = `
                    <div class="d-flex flex-column">
                        <span class="fw-semibold small">${escapeHtml(n.title || '')}</span>
                        <span class="text-muted small text-truncate" style="max-width: 100%;">${escapeHtml((n.message || '').slice(0, 80))}${(n.message || '').length > 80 ? '...' : ''}</span>
                        ${date ? `<small class="text-muted">${date}</small>` : ''}
                    </div>
                `;
                item.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const id = item.dataset.id;
                    const link = item.dataset.link;
                    if (id) {
                        await apiFetch(`/api/notifications/${id}/read`, { method: 'PUT' });
                        item.classList.remove('bg-light');
                    }
                    const dropdown = bootstrap.Dropdown.getInstance(toggle);
                    if (dropdown) dropdown.hide();
                    closeNavbarCollapse();
                    if (link) navigateTo(link);
                });
                list.appendChild(item);
            });
        } catch (err) {
            loading.textContent = 'Errore';
        }
    }

    const bsDropdown = dropdownEl?.querySelector('[data-bs-toggle="dropdown"]');
    if (bsDropdown) {
        bsDropdown.addEventListener('show.bs.dropdown', () => fetchAndRender());
    }
    // Fetch per aggiornare il badge all'avvio
    fetchAndRender().catch(() => {});
}

function escapeHtml(s) {
    if (!s) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

async function checkSession() {
    try {
        const token = localStorage.getItem('auth_token')
        if (!token) {
            return { exists: false, user: null, authenticated: false, isAdmin: false }
        }

        const response = await apiFetch("/api/auth/me", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                'Authorization': `Bearer ${token}`
            }
        })

        if (response.ok) {
            const payload = await response.json()
            const user = payload.data?.user || null
            return {
                exists: !!user,
                user,
                authenticated: !!user,
                isAdmin: user ? (user.role === 'admin') : false
            }
        }
        return { exists: false, user: null, authenticated: false, isAdmin: false }
    } catch (error) {
        console.error("Session check failed", error)
        return {
            exists: false,
            user: null,
            authenticated: false,
            isAdmin: false
        }
    }
}