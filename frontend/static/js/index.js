import Home from "./views/Home.js";
import Login from "./views/Login.js";
import Profile from "./views/Profile.js";
import Register from "./views/Register.js";
import ResetPassword from "./views/ResetPassword.js";
import Messages from "./views/Messages.js";
import AdminUsers from "./views/AdminUsers.js";
import AdminStats from "./views/AdminStats.js";

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

    try {
        const token = localStorage.getItem('auth_token')
        const response = await fetch("/api/auth/me", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        })

        if (response.ok) {
            const payload = await response.json()
            const data = { authenticated: true, user: payload.data?.user }
            console.log("Session check response:", data)
            // User is logged in
            if (loginButton) loginButton.style.display = "none"
            if (registerButton) registerButton.style.display = "none"
            if (logoutButton) logoutButton.style.display = "block"
            if (profileButton) profileButton.style.display = "block"
            if (messagesButton) messagesButton.style.display = "block"
           
        } else {
            // User is not logged in
            if (profileButton) profileButton.style.display = "none"
            if (logoutButton) logoutButton.style.display = "none"
            if (messagesButton) messagesButton.style.display = "none"
            if (loginButton) loginButton.style.display = "block"
            if (registerButton) registerButton.style.display = "block"
        }
    } catch (error) {
        console.error("Error checking session:", error)
        // In case of error, show login/register buttons
        if (profileButton) profileButton.style.display = "none"
        if (logoutButton) logoutButton.style.display = "none"
        if (loginButton) loginButton.style.display = "block"
        if (registerButton) registerButton.style.display = "block"
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            try {
                const token = localStorage.getItem('auth_token')
                await fetch("/api/auth/logout", {
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

        const response = await fetch("/api/auth/me", {
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