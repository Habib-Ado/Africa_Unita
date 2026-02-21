// Logout automatico dopo 20 minuti di inattività
const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000;
const INACTIVITY_CHECK_INTERVAL_MS = 60 * 1000;
let lastActivityTime = Date.now();
let inactivityCheckInterval = null;

export function resetInactivityTimer() {
    lastActivityTime = Date.now();
}

function performInactivityLogout() {
    localStorage.removeItem('auth_token');
    if (inactivityCheckInterval) {
        clearInterval(inactivityCheckInterval);
        inactivityCheckInterval = null;
    }
    window.location.href = '/login?reason=inactivity';
    window.location.reload();
}

export function initInactivityLogout() {
    if (inactivityCheckInterval) return;
    resetInactivityTimer();

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    let throttleTimeout = null;
    const throttleMs = 5000;

    const onActivity = () => {
        if (throttleTimeout) return;
        lastActivityTime = Date.now();
        throttleTimeout = setTimeout(() => { throttleTimeout = null; }, throttleMs);
    };

    activityEvents.forEach(ev => document.addEventListener(ev, onActivity));

    inactivityCheckInterval = setInterval(() => {
        if (!localStorage.getItem('auth_token')) return;
        if (Date.now() - lastActivityTime >= INACTIVITY_TIMEOUT_MS) {
            performInactivityLogout();
        }
    }, INACTIVITY_CHECK_INTERVAL_MS);
}
