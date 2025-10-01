import Home from "./views/Home.js";
import Login from "./views/Login.js";
import Profile from "./views/Profile.js";
import Register from "./views/Register.js";
import ResetPassword from "./views/ResetPassword.js";
import Messages from "./views/Messages.js";
import AdminUsers from "./views/AdminUsers.js";
import AdminStats from "./views/AdminStats.js";
import Treasurer from "./views/Treasurer.js";

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

// Backend API base URL (sviluppo): punta al server Express su 3000
export const API_BASE = "http://localhost:3000";

// Helper per chiamate API sempre verso il backend (evita 404 dal server statico 8080)
export async function apiFetch(path, options = {}) {
    const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
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
            path: "/messages",
            view: Messages,
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

        // Se l'utente è autenticato e ha i permessi necessari, procedi
        console.log("Access granted - proceeding to route")
    }

    const view = new match.route.view(getParams(match))
    
    // Clear the app container before loading new view
    const appContainer = document.querySelector("#app")
    appContainer.innerHTML = await view.getHtml()
    
    // Initialize the view
    if (typeof view.init === "function") {
        await view.init()
    }
}

document.addEventListener('DOMContentLoaded', function() {
    
});

window.addEventListener("popstate", () => router())

document.addEventListener("DOMContentLoaded", async () => {
    // Sposta qui l'inizializzazione del modal "Chi Siamo" (niente inline script per CSP)
    const aboutLinks = document.querySelectorAll('a[href="#about"]');
    aboutLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const aboutModalEl = document.getElementById('aboutModal');
            if (aboutModalEl && window.bootstrap?.Modal) {
                const aboutModal = new bootstrap.Modal(aboutModalEl);
                aboutModal.show();
            }
        });
    });
    document.body.addEventListener("click", e => {
        if (e.target.matches("[data-link]")) {
            e.preventDefault()
            navigateTo(e.target.href)
        }
    })

    // Search form handler
    const searchForm = document.getElementById("search-form");
    if (searchForm) {
        searchForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const searchInput = document.getElementById("search-input");
            const searchTerm = searchInput.value.trim();
            
            if (searchTerm) {
                // Redirect to home with search query (no e-commerce products)
                navigateTo(`/?search=${encodeURIComponent(searchTerm)}`);
            }
        });
    }

    const logoutButton = document.getElementById("logout")
    const loginButton = document.getElementById("btnLogin")
    const profileButton = document.getElementById("profile-link")
    const registerButton = document.getElementById("btnRegister")
    const messagesButton = document.getElementById("btnMessages")
    const adminLink = document.getElementById("admin-link")
    const treasurerLink = document.getElementById("treasurer-link")

    try {
        const token = localStorage.getItem('auth_token')
        
        // Se non c'è token, salta la chiamata API
        if (!token) {
            // User is not logged in
            if (profileButton) profileButton.style.display = "none"
            if (logoutButton) logoutButton.style.display = "none"
            if (messagesButton) messagesButton.style.display = "none"
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
                if (messagesButton) messagesButton.style.display = "block"
                // Mostra link admin/tesoriere in base al ruolo
                if (adminLink && data.user?.role === 'admin') adminLink.style.display = "block"
                if (treasurerLink && (data.user?.role === 'treasurer' || data.user?.role === 'admin')) treasurerLink.style.display = "block"
            } else {
                // Token scaduto o non valido, rimuovilo
                localStorage.removeItem('auth_token')
                // User is not logged in
                if (profileButton) profileButton.style.display = "none"
                if (logoutButton) logoutButton.style.display = "none"
                if (messagesButton) messagesButton.style.display = "none"
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